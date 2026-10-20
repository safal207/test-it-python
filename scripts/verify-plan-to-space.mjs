import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

// CI-only acceptance for the real interactive scene, served below a Pages prefix.
const origin = 'http://127.0.0.1:4181';
const schoolPath = '/test-it-python/ai-path/';
const url = `${origin}${schoolPath}examples/plan-to-space.html`;
const artifacts = 'artifacts/ai-path-qa';
const serverCode = `
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
class PagesHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix('/test-it-python'))
ThreadingHTTPServer(('127.0.0.1', 4181), partial(PagesHandler, directory='dist')).serve_forever()
`;
const server = spawn('python3', ['-c', serverCode], {
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', data => {
  serverLog = (serverLog + String(data)).slice(-6000);
});
let browser;
let activePage;
let activeWidth;
const results = [];

async function readyServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Scene test server exited: ${serverLog}`);
    try {
      const response = await fetch(url);
      await response.arrayBuffer();
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Scene test server did not become ready: ${serverLog}`);
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({viewport: innerWidth, document: document.documentElement.scrollWidth}));
  assert.ok(dimensions.document <= dimensions.viewport + 1, `${label}: no horizontal overflow (${JSON.stringify(dimensions)})`);
}

async function expectProgress(page, expected) {
  await page.waitForFunction(value => Math.abs(Number(document.body.dataset.progress) - value) <= 1, expected);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(Number(await page.locator('#progress').inputValue()), expected, 'Slider agrees with selected stage');
  assert.match(await page.locator('#percent').innerText(), new RegExp(`(?:^|\\D)${expected}(?:\\D|$)`), 'Percentage output agrees with selected stage');
  assert.ok((await page.locator('#stageTitle').innerText()).trim().length > 3, 'Each scene stage has a readable title');
}

async function setStage(page, progress) {
  await page.locator(`[data-stage="${progress}"]`).click();
  await expectProgress(page, progress);
  await noOverflow(page, `stage ${progress}`);
}

async function readablePlan(page, width) {
  const overlay = page.locator('#planOverlay');
  assert.equal(await overlay.isVisible(), true, 'Initial floor plan has a visible vector overlay');
  const metrics = await overlay.evaluate(svg => {
    const wall = svg.querySelector('path.wall');
    const furniture = svg.querySelector('path.furniture');
    const style = element => element && getComputedStyle(element);
    const bounds = svg.getBoundingClientRect();
    return {
      wallWidth: wall ? Number.parseFloat(style(wall).strokeWidth) : 0,
      furnitureWidth: furniture ? Number.parseFloat(style(furniture).strokeWidth) : 0,
      wallColor: style(wall)?.stroke,
      background: getComputedStyle(document.body).backgroundColor,
      labels: [...svg.querySelectorAll('text.plan-label')].map(element => {
        const box = element.getBoundingClientRect();
        return {text: element.textContent.trim(), font: Number.parseFloat(style(element).fontSize),
          height: box.height, contained: box.left >= bounds.left - 1 && box.right <= bounds.right + 1 && box.top >= bounds.top - 1 && box.bottom <= bounds.bottom + 1};
      })
    };
  });
  assert.ok(metrics.wallWidth >= 2.5 && metrics.furnitureWidth >= 1.5,
    `Walls and furniture retain distinct readable screen strokes: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.labels.length >= 2 && metrics.labels.every(label => label.font >= 12 && label.height >= 10 && label.contained),
    `Plan labels stay readable and inside the scene at ${width}px: ${JSON.stringify(metrics.labels)}`);
  const rgb = color => color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  const luminance = color => {
    const channels = rgb(color);
    assert.equal(channels?.length, 3, `Expected an RGB plan color: ${color}`);
    return channels.map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  };
  const light = luminance(metrics.background), dark = luminance(metrics.wallColor);
  const ratio = (Math.max(light, dark) + .05) / (Math.min(light, dark) + .05);
  assert.ok(ratio >= 4.5, `Floor-plan walls contrast with the paper background (${ratio.toFixed(2)}:1)`);
  if (width <= 600) {
    const fonts = await page.evaluate(() => ({
      stages: [...document.querySelectorAll('[data-stage]')].map(element => Number.parseFloat(getComputedStyle(element).fontSize)),
      description: Number.parseFloat(getComputedStyle(document.querySelector('#stageDescription')).fontSize),
      hint: Number.parseFloat(getComputedStyle(document.querySelector('#controlHint')).fontSize)
    }));
    assert.ok(fonts.stages.every(size => size >= 11) && fonts.description >= 12 && fonts.hint >= 11,
      `Mobile controls and explanation remain readable without zoom: ${JSON.stringify(fonts)}`);
  }
  return {wallWidth: metrics.wallWidth, furnitureWidth: metrics.furnitureWidth, labelFonts: metrics.labels.map(label => label.font), contrast: Number(ratio.toFixed(2))};
}

async function stageScreenshot(page, width, progress) {
  const before = await page.evaluate(() => ({scrollY, progress: document.body.dataset.progress, stageScrollTop: document.querySelector('.stage').scrollTop}));
  await page.screenshot({path: `${artifacts}/plan-to-space-${width}-stage-${progress}.png`, animations: 'disabled'});
  const after = await page.evaluate(() => ({scrollY, progress: document.body.dataset.progress, stageScrollTop: document.querySelector('.stage').scrollTop}));
  assert.deepEqual(after, before, 'Viewport evidence preserves the selected stage and scroll');
}

async function sceneDigest(page) {
  const snapshot = () => page.evaluate(() => ({
    scrollY,
    stageScrollTop: document.querySelector('.stage').scrollTop,
    progress: document.body.dataset.progress
  }));
  const before = await snapshot();
  const bounds = await page.locator('#scene').boundingBox();
  const viewport = page.viewportSize();
  assert.ok(bounds && viewport && bounds.width > 0 && bounds.height > 0 &&
    bounds.x >= 0 && bounds.y >= 0 &&
    bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height,
  `Scene snapshot must fit in the viewport without scrolling: ${JSON.stringify({bounds, viewport, before})}`);
  // Element screenshots scroll into view; that would mutate the native scene timeline.
  const bytes = await page.screenshot({clip: bounds, animations: 'disabled'});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const after = await snapshot();
  assert.deepEqual(after, before, `Scene snapshot preserves scroll and progress: ${JSON.stringify({before, after, bounds, viewport})}`);
  return createHash('sha256').update(bytes).digest('hex');
}

function observe(page) {
  const failures = [];
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => failures.push(`request failed: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => {
    if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  page.on('request', request => {
    const requested = new URL(request.url());
    if (['http:', 'https:'].includes(requested.protocol) && requested.origin !== origin) {
      failures.push(`Unexpected external request: ${request.url()}`);
    }
  });
  return failures;
}

try {
  await mkdir(artifacts, {recursive: true});
  await readyServer();
  browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  for (const width of [320, 390, 600, 601, 768, 1440]) {
    activeWidth = width;
    const context = await browser.newContext({viewport: {width, height: width < 768 ? 844 : 960}, deviceScaleFactor: 1});
    const page = await context.newPage();
    activePage = page;
    const failures = observe(page);
    await page.goto(url, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    await expectProgress(page, 0);
    await noOverflow(page, `${width}px initial`);
    assert.equal(await page.locator('#scene').isVisible(), true, 'Scene canvas is visible');
    assert.deepEqual(await page.locator('[data-stage]').evaluateAll(buttons => buttons.map(button => Number(button.dataset.stage))), [0, 25, 50, 75, 100], 'Five stages remain available');
    const planReadability = await readablePlan(page, width);
    const planDigest = await sceneDigest(page);
    if ([320, 390, 1440].includes(width)) await stageScreenshot(page, width, 0);
    for (const progress of [25, 50, 75, 100]) {
      await setStage(page, progress);
      if ([320, 390, 1440].includes(width)) await stageScreenshot(page, width, progress);
    }
    const interiorDigest = await sceneDigest(page);
    assert.notEqual(interiorDigest, planDigest, 'Plan and furnished interior render different pixels');
    assert.equal(await page.locator('#planOverlay').isVisible(), false, 'Blueprint overlay clears the finished interior');
    for (const progress of [75, 50, 25, 0]) await setStage(page, progress);
    await page.locator('#progress').focus();
    await page.keyboard.press('End');
    await expectProgress(page, 100);
    await page.keyboard.press('Home');
    await expectProgress(page, 0);
    const focused = await page.locator('#progress').evaluate(element => element === document.activeElement);
    assert.equal(focused, true, 'Slider preserves keyboard focus');

    // Start from the initial position, then use native page scrolling rather than a synthetic progress input.
    await page.goto(url, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    await page.evaluate(() => window.scrollTo({top: innerHeight * 2, behavior: 'instant'}));
    await page.waitForFunction(() => Number(document.body.dataset.progress) > 0);
    await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
    await page.waitForFunction(() => Number(document.body.dataset.progress) === 0);

    const back = new URL(await page.locator('#backToSchool').getAttribute('href'), page.url());
    assert.equal(back.pathname, schoolPath);
    assert.equal(back.hash, '#portfolio');
    const learn = new URL(await page.locator('#learnLink').getAttribute('href'), page.url());
    assert.equal(learn.pathname, schoolPath);
    assert.equal(learn.searchParams.get('program'), 'designlab');
    assert.equal(learn.hash, '#selected');
    assert.equal(failures.length, 0, `${width}px browser errors: ${failures.join('; ')}`);
    results.push({width, status: 'PASS', planReadability, planDigest, interiorDigest, failures});
    console.log(`PASS Plan to Space ${width}px: forward/reverse stages, keyboard, native scroll, local assets, links and overflow`);
    await context.close();
    activePage = undefined;
  }

  // Landscape and short windows use direct controls instead of a sticky scroll timeline.
  const shortContext = await browser.newContext({viewport: {width: 844, height: 390}, deviceScaleFactor: 1});
  const shortPage = await shortContext.newPage();
  activePage = shortPage;
  activeWidth = 844;
  const shortFailures = observe(shortPage);
  await shortPage.goto(url, {waitUntil: 'networkidle'});
  await shortPage.waitForFunction(() => document.body.dataset.ready === 'true');
  await expectProgress(shortPage, 0);
  await noOverflow(shortPage, 'short landscape initial');
  assert.ok(await shortPage.locator('#experience').evaluate(element => element.offsetHeight < innerHeight * 3), 'Short viewport has a normal content flow rather than four empty screens');
  await setStage(shortPage, 100);
  await shortPage.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await shortPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expectProgress(shortPage, 100);
  await setStage(shortPage, 0);
  await shortPage.locator('#progress').focus();
  await shortPage.keyboard.press('End');
  await expectProgress(shortPage, 100);
  await shortPage.screenshot({path: `${artifacts}/plan-to-space-844x390-manual.png`, fullPage: true, animations: 'disabled'});
  assert.equal(shortFailures.length, 0, `Short-viewport errors: ${shortFailures.join('; ')}`);
  results.push({mode: 'short-landscape-manual', viewport: '844x390', status: 'PASS'});
  await shortContext.close();
  activePage = undefined;

  const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  const page = await context.newPage();
  activePage = page;
  activeWidth = 390;
  const failures = observe(page);
  await page.goto(`${url}?program=furniture&level=zero&pace=balanced`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  await expectProgress(page, 0);
  await setStage(page, 100);
  await setStage(page, 0);
  const preservedBack = new URL(await page.locator('#backToSchool').getAttribute('href'), page.url());
  for (const [key, value] of Object.entries({program: 'furniture', level: 'zero', pace: 'balanced'})) assert.equal(preservedBack.searchParams.get(key), value, `Return link preserves ${key}`);
  assert.equal(failures.length, 0, `Reduced-motion errors: ${failures.join('; ')}`);
  results.push({mode: 'reduced-motion-and-selection', status: 'PASS'});
  await context.close();
  activePage = undefined;

  const fallbackContext = await browser.newContext({viewport: {width: 320, height: 844}});
  await fallbackContext.addInitScript(() => {HTMLCanvasElement.prototype.getContext = () => null;});
  const fallback = await fallbackContext.newPage();
  activePage = fallback;
  activeWidth = 320;
  const fallbackFailures = observe(fallback);
  await fallback.goto(url, {waitUntil: 'networkidle'});
  assert.equal(await fallback.locator('#sceneFallback').isVisible(), true, 'Unavailable Canvas shows a readable plan fallback');
  assert.ok(await fallback.locator('#sceneFallback svg').count() > 0, 'Fallback contains a local SVG plan');
  assert.equal(await fallback.locator('#progress').isDisabled(), true, 'Unavailable 3D does not offer a misleading progress slider');
  assert.equal(await fallback.locator('[data-stage]:enabled').count(), 0, 'Unavailable 3D does not pretend stage buttons transform the static plan');
  assert.ok((await fallback.locator('#renderStatus').innerText()).trim().length > 20, 'Fallback explains the current rendering mode');
  assert.equal(await fallback.locator('#fallbackLink').isVisible(), true, 'Fallback offers the textual explanation');
  assert.equal(await fallback.locator('#fallbackLink').getAttribute('href'), '#lesson');
  assert.ok(await fallback.locator('#experience').evaluate(element => element.offsetHeight < innerHeight * 2), 'Fallback removes the empty four-screen scroll journey');
  await noOverflow(fallback, 'Canvas fallback');
  await fallback.screenshot({path: `${artifacts}/plan-to-space-320-fallback.png`, animations: 'disabled'});
  assert.equal(fallbackFailures.length, 0, `Fallback errors: ${fallbackFailures.join('; ')}`);
  results.push({mode: 'canvas-unavailable', status: 'PASS'});
  await fallbackContext.close();
  activePage = undefined;
  await writeFile(`${artifacts}/plan-to-space-results.json`, JSON.stringify({testedAt: new Date().toISOString(), results}, null, 2) + '\n');
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({path: `${artifacts}/plan-to-space-${activeWidth}-failure.png`, fullPage: true, animations: 'disabled'}).catch(() => {});
  await writeFile(`${artifacts}/plan-to-space-failure.txt`, `${error.stack}\n\nServer log:\n${serverLog}`).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
