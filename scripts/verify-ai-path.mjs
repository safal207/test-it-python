import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4179/ai-path/';
const server = spawn('python3', ['-m', 'http.server', '4179', '--bind', '127.0.0.1', '--directory', 'dist'], {
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
server.stdout.on('data', b => { serverLog += String(b).slice(-2000); });
server.stderr.on('data', b => { serverLog += String(b).slice(-2000); });

async function startServer() {
  for (let i = 0; i < 60; i += 1) {
    if (server.exitCode !== null) throw new Error('Server exited: ' + serverLog);
    try {
      const response = await fetch(base);
      await response.arrayBuffer(); // Fully drain HTTP response: Node undici must not retain a paused body.
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Preview server not ready: ' + serverLog);
}
function assert(condition, message) {
  if (!condition) throw new Error('AI PATH acceptance failed: ' + message);
}

await mkdir('artifacts/ai-path-qa', { recursive: true });
let browser;
try {
  await startServer();
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [[1440, 960], [390, 844], [320, 740]]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: 'reduce',
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(base + '?program=frontier#selected', { waitUntil: 'domcontentloaded' });
    assert(response?.status() === 200, 'Page returns HTTP 200');
    await page.locator('#programList .program').first().waitFor();

    assert(await page.locator('#programList .program').count() === 10, '10 selectable learning programs');
    assert((await page.locator('#selTitle').innerText()).includes('AI Lab'), 'Frontier program deep link');
    assert(await page.locator('#examples article.project').count() === 6, '6 source-backed project screenshot cards');
    assert(await page.locator('#nbGrid .nb-card').count() === 6, 'Featured ML notebooks visible');
    assert(await page.locator('#frontier .frontier-card').count() === 4, 'Four official-lab pathways');
    assert(await page.locator('#frontier a[href*="openai.com"]').count() >= 1, 'Official OpenAI route linked');
    assert(await page.locator('#frontier a[href*="anthropic.com"]').count() >= 1, 'Official Anthropic route linked');

    await page.locator('#nbFilters button[data-nbcat="nlp"]').click();
    assert(await page.locator('#nbGrid .nb-card').count() === 10, '10 NLP notebooks after filter');
    await page.locator('#nbFilters button[data-nbcat="all"]').click();
    await page.locator('#nbSeeAll').click();
    assert(await page.locator('#nbGrid .nb-card').count() === 24, '24 notebook links after expand');
    const links = await page.locator('#nbGrid .nb-card').evaluateAll(elements => elements.map(a => a.href));
    assert(new Set(links).size === 24, 'Notebook GitHub URLs unique');
    assert(links.every(url => url.startsWith('https://github.com/safal207/students/blob/')), 'Notebooks link to source archive');

    const galleryButtons = page.locator('#examples .project-shot');
    for (let i = 0; i < await galleryButtons.count(); i++) {
      const button = galleryButtons.nth(i);
      await button.scrollIntoViewIfNeeded();
      await button.locator('img').evaluate(img => img.decode());
      await button.click();
      assert(await page.locator('#projectLightbox').evaluate(dialog => dialog.open), 'Gallery opens on click');
      await page.locator('#galleryImage').evaluate(img => img.decode());
      await page.keyboard.press('Escape');
      assert(!(await page.locator('#projectLightbox').evaluate(dialog => dialog.open)), 'Gallery closes with Escape');
      assert(await button.evaluate(el => document.activeElement === el), 'Gallery returns keyboard focus');
    }

    await page.locator('#frontier [data-start-track="frontier"]').click();
    assert((await page.locator('#selTitle').innerText()).includes('AI Lab'), 'Frontier CTA selects training');
    await page.locator('#interests [data-interest="game"]').click();
    assert((await page.locator('#selTitle').innerText()).includes('Пробуждение'), 'Game path selectable');
    const widthReport = await page.evaluate(() => ({
      windowWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('body *')]
        .map(el => ({ tag: el.tagName, id: el.id,
          className: typeof el.className === 'string' ? el.className : '',
          left: Math.round(el.getBoundingClientRect().left),
          right: Math.round(el.getBoundingClientRect().right) }))
        .filter(el => el.right > innerWidth + 1 || el.left < -1).slice(0, 35),
      ownOverflow: [...document.querySelectorAll('body *')].filter(el =>
        el.scrollWidth > el.clientWidth + 8 && el.scrollWidth > 300
      ).slice(0, 40).map(el => ({
        tag: el.tagName, id: el.id,
        className: typeof el.className === 'string' ? el.className : '',
        client: el.clientWidth, scroll: el.scrollWidth,
        overflowX: getComputedStyle(el).overflowX
      })),
      bodyScroll: document.body.scrollWidth, bodyClient: document.body.clientWidth
    }));
    if (widthReport.documentWidth > widthReport.windowWidth + 1)
      console.error('AI_PATH_MOBILE_OVERFLOW', JSON.stringify(widthReport));
    assert(widthReport.documentWidth <= widthReport.windowWidth + 1, 'No horizontal overflow');
    assert(errors.length === 0, 'No browser JavaScript errors: ' + errors.join('; '));
    await page.locator('#research').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'artifacts/ai-path-qa/ai-path-' + width + '.png', animations: 'disabled' });
    console.log('PASS ' + width + 'x' + height + ': 10 programs, 6 screenshots, 24 notebook links, 4 lab routes, gallery and keyboard');
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
