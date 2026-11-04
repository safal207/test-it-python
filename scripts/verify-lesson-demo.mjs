import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { startSite, browserOptions } from './qa/site.mjs';

const site = await startSite();
const out = 'artifacts/lesson-demo';
await mkdir(out, { recursive: true });
const results = { scope: 'repository dist',
  startedAt: new Date().toISOString(), widths: [], previews: [], errors: [] };
let browser;

const previewCases = {
  game: { route: 'game-lab.html', hash: '#workspace' },
  unity: { route: 'game-lab.html', hash: '#workspace' },
  designlab: { route: 'examples/ai-desk.html', hash: '#scene-panel' },
  build: { route: 'examples/pocitel.html', hash: '#pairings' },
  vibe: { route: 'vibe-coding/crm-demo.html', hash: '#scenarioTitle' },
};

function watchBrowserErrors(page, errors) {
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('requestfailed', request => {
    if (request.url().startsWith(site.base) && request.failure()?.errorText !== 'net::ERR_ABORTED') {
      errors.push(`request: ${request.url()} ${request.failure()?.errorText}`);
    }
  });
}

async function assertNoOverflow(page, label) {
  const { scrollWidth, width } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    width: document.documentElement.clientWidth,
  }));
  assert(scrollWidth <= width + 1, `${label}: document scrolls horizontally (${scrollWidth} > ${width})`);
}

async function verifyProgramPreview(page, program, width) {
  const route = `${site.base}?program=${program}&level=basic&pace=deep`;
  const response = await page.goto(`${route}#selected`, { waitUntil: 'domcontentloaded' });
  assert(response?.ok(), `${program}: selected program must load`);
  const preview = page.locator('#programPreview');
  await expect(preview).toBeVisible();
  await expect(page.locator('#mlTrialPath')).toBeHidden();
  await expect(preview.locator('#programPreviewTitle')).toHaveText(/\S/);
  for (const list of ['.program-preview-steps', '.program-preview-outcomes']) {
    const entries = preview.locator(`${list} li`);
    await expect(entries).toHaveCount(3);
    assert((await entries.allTextContents()).every(text => text.trim()), `${program}: every ${list} entry needs content`);
  }

  const jump = page.locator('#lessonTrialJump');
  await expect(jump).toHaveAttribute('href', '#programPreview');
  await jump.press('Enter');
  await expect(page).toHaveURL(`${route}#programPreview`);
  await expect(preview).toBeFocused();

  const image = preview.locator('figure img');
  await image.evaluate(async el => { el.loading = 'eager'; await el.decode(); });
  assert(await image.evaluate(el => el.naturalWidth > 0 && el.alt.trim()), `${program}: the preview has a loaded image with alt text`);
  await assertNoOverflow(page, `${program} at ${width}px`);
  if (width === 1440 && program === 'game') {
    await preview.screenshot({
      path: path.join(out, 'program-preview-game-1440.png'),
      animations: 'disabled',
      style: '.header, .selection-dock, .toast { visibility: hidden !important; }',
    });
  }

  const open = preview.locator('.program-preview-open');
  const { route: demoRoute, hash } = previewCases[program];
  const demo = new URL(demoRoute, site.base);
  demo.searchParams.set('program', program);
  demo.searchParams.set('level', 'basic');
  demo.searchParams.set('pace', 'deep');
  demo.hash = hash;
  await expect(open).toHaveAttribute('target', '_blank');
  assert.equal(new URL(await open.getAttribute('href'), page.url()).href, demo.href, `${program}: demo link preserves context`);
  if (width === 390) {
    const [popup] = await Promise.all([page.waitForEvent('popup'), open.click()]);
    try {
      await expect(popup).toHaveURL(demo.href);
      await popup.waitForLoadState('domcontentloaded');
      await expect(popup.locator(hash)).toBeVisible();
      await expect(page).toHaveURL(`${route}#programPreview`);
    } finally {
      await popup.close();
    }
  }

  await page.goBack();
  await expect(page).toHaveURL(`${route}#selected`);
  await expect(preview).toBeVisible();
  if (width <= 760) {
    await expect(page.locator('#dockStart')).toBeHidden();
    const dockTrial = page.locator('#dockTrial');
    await expect(dockTrial).toHaveAttribute('href', '#programPreview');
    await dockTrial.click();
    await expect(page).toHaveURL(`${route}#programPreview`);
    await expect(preview).toBeFocused();
  }
  await preview.locator('a[href="#selected-curriculum"]').press('Enter');
  await expect(page).toHaveURL(`${route}#selected-curriculum`);
  const curriculum = page.locator('#selected-curriculum');
  await expect(curriculum).toBeFocused();
  await expect(curriculum).toHaveJSProperty('open', true);
  await preview.locator('a[href="#start"]').press('Enter');
  await expect(page).toHaveURL(`${route}#start`);
  await expect(page.locator('#start')).toBeFocused();

  results.previews.push({ program, width, image: true, demo: demo.href.slice(site.base.length), openedDemo: width === 390, status: 'PASS' });
  console.log(`${program} at ${width}px: PASS`);
}

async function contrast(page, selector) {
  return page.locator(selector).first().evaluate(element => {
    function color(text) {
      const values = text.match(/[\d.]+/g)?.map(Number) || [];
      return values.length >= 3 ? [values[0], values[1], values[2], values[3] ?? 1] : [0, 0, 0, 0];
    }
    function luminance(rgb) {
      const c = rgb.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    }
    const fg = color(getComputedStyle(element).color);
    let node = element, bg = [255, 255, 255, 1];
    while (node) { const c = color(getComputedStyle(node).backgroundColor); if (c[3] > .99) { bg = c; break; } node = node.parentElement; }
    const a = luminance(fg), b = luminance(bg);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
}

try {
  browser = await chromium.launch(browserOptions);
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1100 : 900 }, reducedMotion: 'reduce' });
    const errors = [];
    context.on('page', page => watchBrowserErrors(page, errors));
    const page = await context.newPage();
    await page.goto(`${site.base}?program=ml&level=zero&pace=balanced#selected`, { waitUntil: 'domcontentloaded' });
    const demo = page.locator('#lessonDemo');
    await expect(demo).toBeVisible();
    if (width <= 760) {
      await expect(page.locator('#dockStart')).toBeHidden();
      await page.locator('#dockTrial').click();
      await expect(page).toHaveURL(/#lessonDemo$/);
      await expect(demo).toBeFocused();
    }
    await expect(page.locator('#programPreview')).toBeHidden();
    await expect(page.locator('[data-lesson-demo]')).toHaveCount(3);
    let currentUrl = new URL(page.url());
    assert.equal(currentUrl.searchParams.get('program'), 'ml');
    assert.equal(currentUrl.searchParams.get('level'), 'zero');
    assert.equal(currentUrl.searchParams.get('pace'), 'balanced');

    const scenarios = [
      { id: 'xor', answers: ['1', '0', '1'], wrong: ['0', '1', '0'], path: '/ML/reproducible_mlp_xor_numpy.ipynb' },
      { id: 'text', answers: ['дом · сад', '1', '3, 5, 1'], wrong: ['домсад', '0', '3, 1, 5'], path: '/NLP/NLP_SafonovAlex_DenseRNN_%2CConv1d%2CLSTM%2C_GRU_%D0%B4%D0%BB%D1%8F_%D0%BE%D0%B1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B8_%D1%82%D0%B5%D0%BA%D1%81%D1%82%D0%BE%D0%B2%22.ipynb' },
      { id: 'vision', answers: ['35', '16', '1'], wrong: ['16', '35', '2'], path: '/CV/Conv2D_Arguments.ipynb' },
    ];
    for (const scenario of scenarios) {
      const tab = demo.locator(`[data-lesson-demo="${scenario.id}"]`);
      await tab.focus();
      await page.keyboard.press('Enter');
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
      const link = demo.locator('.lesson-demo-notebook');
      const href = await link.getAttribute('href');
      assert(href.startsWith('https://github.com/safal207/students/blob/b89ab62d0aa4132389ea1ec1704895eab1d78b21/'));
      assert.equal(new URL(href).pathname.split('/').slice(5).map(decodeURIComponent).join('/'), decodeURIComponent(scenario.path.slice(1)));
      for (let i = 0; i < 3; i++) {
        await expect(demo.locator('.lesson-demo-progress')).toHaveAttribute('aria-label', `Шаг ${i + 1} из 3`);
        await demo.locator('[data-demo-answer]').filter({ hasText: scenario.wrong[i] }).first().click();
        await expect(demo.locator('.lesson-demo-response')).toContainText('Попробуй другой ответ');
        await expect(demo.locator('[data-demo-next], [data-demo-restart]')).toHaveCount(0);
        await demo.locator('[data-demo-answer]').filter({ hasText: scenario.answers[i] }).first().click();
        const response = demo.locator('.lesson-demo-response');
        for (const name of ['Мира:', 'Данил, ментор:', 'Пикс:']) await expect(response).toContainText(name);
        if (i < 2) await demo.locator('[data-demo-next]').click();
        else await demo.locator('[data-demo-restart]').click();
      }
      await expect(demo.locator('.lesson-demo-progress')).toHaveAttribute('aria-label', 'Шаг 1 из 3');
    }
    await demo.locator('[data-lesson-demo="xor"]').click();
    await demo.scrollIntoViewIfNeeded();
    const img = demo.locator('.lesson-demo-scene img');
    await img.evaluate(async el => { el.loading = 'eager'; await el.decode(); });
    assert(await img.evaluate(el => el.complete && el.naturalWidth > 0 && !!el.alt));
    await assertNoOverflow(page, `ML at ${width}px`);
    for (const theme of ['light', 'dark']) {
      await page.locator(`[data-theme-choice="${theme}"]`).first().click();
      for (const selector of ['.lesson-demo-question', '.lesson-demo-answers button', '.lesson-demo-tabs button[aria-pressed="true"]']) {
        const ratio = await contrast(page, selector);
        assert(ratio >= 4.5, `${theme}/${selector} contrast ${ratio.toFixed(2)} at ${width}`);
      }
    }
    await page.locator('[data-theme-choice="light"]').first().click();
    await demo.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `lesson-demo-${width}.png`) });
    const proof = page.locator('#lessonProof');
    await expect(proof).toContainText('53,9%');
    await expect(proof).toContainText('97,8%');
    await expect(proof).toContainText('один сохранённый запуск');
    await proof.locator('img').evaluate(async image => { image.loading = 'eager'; await image.decode(); });
    if (width === 1440) await proof.screenshot({ path: path.join(out, 'lesson-proof-1440.png') });
    await expect(page.locator('#lessonTrialJump')).toHaveAttribute('href', '#lessonDemo');
    await expect(page.locator('#startJump')).toHaveClass(/\bghost\b/);
    await page.locator('#catalogFilters [data-filter="explore"]').click();
    await page.locator('#programList [data-program="explore"]').click();
    await expect(demo).toBeHidden();
    await expect(proof).toBeHidden();
    await expect(page.locator('#programPreview')).toBeHidden();
    await expect(page.locator('#lessonTrialJump')).toBeHidden();
    await page.locator('#catalogFilters [data-filter="neural"]').click();
    await page.locator('#programList [data-program="ml"]').click();
    await expect(demo).toBeVisible();
    currentUrl = new URL(page.url());
    assert.equal(currentUrl.searchParams.get('level'), 'zero');
    assert.equal(currentUrl.searchParams.get('pace'), 'balanced');
    assert.deepEqual(errors, []);
    results.widths.push({ width, status: 'PASS', topics: 3, steps: 9, wrongAndCorrect: true, image: true, themes: ['light', 'dark'], programSwitch: true, errors });
    console.log(`${width}: PASS`);
    const programs = width === 390 ? Object.keys(previewCases) : [width === 320 ? 'designlab' : 'game'];
    for (const program of programs) await verifyProgramPreview(page, program, width);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const page = await noJs.newPage();
  await page.goto(`${site.base}?program=ml&level=zero&pace=balanced#selected`);
  await expect(page.locator('#lessonDemo')).toBeHidden();
  await page.goto(`${site.base}?program=game&level=basic&pace=deep#selected`);
  await expect(page.locator('#programPreview')).toBeHidden();
  await expect(page.locator('#lessonTrialJump')).toBeHidden();
  await noJs.close();
  results.noJavaScript = 'PASS: inactive demo remains hidden';
  results.status = 'PASS';
} catch (error) {
  results.status = 'FAIL'; results.errors.push(error.stack || String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  results.finishedAt = new Date().toISOString();
  await writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  await browser?.close();
  await site.close();
}
