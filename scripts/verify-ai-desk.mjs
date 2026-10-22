import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

// Browser acceptance for the public Pages prefix, without contacting another service.
const origin = 'http://127.0.0.1:4183';
const schoolPath = '/test-it-python/ai-path/';
const demo = `${origin}${schoolPath}examples/ai-desk.html`;
const artifacts = 'artifacts/ai-desk-qa';
const course = 'program=designlab&level=basic&pace=light';
const results = [];
const serverCode = `
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
class PagesHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix('/test-it-python'))
ThreadingHTTPServer(('127.0.0.1', 4183), partial(PagesHandler, directory='dist')).serve_forever()
`;
const server = spawn('python3', ['-c', serverCode], {stdio: ['ignore', 'pipe', 'pipe']});
let serverLog = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', bytes => {
  serverLog = (serverLog + String(bytes)).slice(-6000);
});
let browser;
let activePage;
let activeCase = 'startup';

async function readyServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`AI Desk server exited: ${serverLog}`);
    try { const response = await fetch(demo); await response.arrayBuffer(); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`AI Desk server was not ready: ${serverLog}`);
}
function observe(page, expectedModuleFailure = false) {
  const requests = [], failures = [], expectedFailures = [];
  page.on('request', request => {
    requests.push(request.url());
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) failures.push(`External request: ${request.url()}`);
  });
  page.on('requestfailed', request => {
    const message = `${request.url()}: ${request.failure()?.errorText}`;
    if (expectedModuleFailure && /\/ai-desk-scene\.js(?:\?|$)/.test(request.url())) expectedFailures.push(message);
    else failures.push(`Request failed: ${message}`);
  });
  page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
  page.on('pageerror', error => failures.push(`Page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (expectedModuleFailure && /net::ERR_FAILED|Failed to fetch dynamically imported module/.test(message.text())) return;
    failures.push(`Console: ${message.text()}`);
  });
  return {requests, failures, expectedFailures};
}
async function settled(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function noOverflow(page, label) {
  const bounds = await page.evaluate(() => ({viewport: innerWidth, document: document.documentElement.scrollWidth}));
  assert.ok(bounds.document <= bounds.viewport + 1, `${label}: horizontal overflow ${JSON.stringify(bounds)}`);
}
function assertSelectedURL(page, material, light) {
  const url = new URL(page.url());
  assert.equal(url.searchParams.get('material'), material, 'Shared URL keeps selected material');
  assert.equal(url.searchParams.get('light'), light, 'Shared URL keeps selected light');
}
async function selectedControls(page, material, light) {
  assert.equal(await page.locator('button[data-material][aria-pressed="true"]').count(), 1, 'Exactly one material is selected');
  assert.equal(await page.locator(`button[data-material="${material}"]`).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('button[data-lighting][aria-pressed="true"]').count(), 1, 'Exactly one light is selected');
  assert.equal(await page.locator(`button[data-lighting="${light}"]`).getAttribute('aria-pressed'), 'true');
}
function assertLazy(requests) {
  assert.equal(requests.filter(url => /\/(?:ai-desk-scene|three[^/]*)\.(?:js|mjs)(?:\?|$)/.test(url)).length, 0,
    'No scene or Three.js import occurs before explicit 3D launch');
}
async function launchScene(page) {
  await page.locator('#start-scene').click();
  await page.waitForFunction(() => document.querySelector('#scene-panel').dataset.state === 'ready', undefined, {timeout: 30000});
  await settled(page);
  assert.equal(await page.locator('#desk-canvas').isVisible(), true, 'A launched scene exposes its real canvas');
  assert.equal(await page.locator('#scene-poster').isHidden(), true, 'Poster is removed after successful launch');
  assert.equal(await page.locator('#start-scene').isHidden(), true, 'Launch overlay no longer covers the scene');
}
async function canvasPixels(page, filename) {
  await settled(page);
  const bytes = await page.locator('#desk-canvas').screenshot({
    animations: 'disabled',
    // Labels are outside the rendered scene and should not satisfy visual assertions.
    style: '.scene-topline,.scene-bottomline{visibility:hidden!important}#desk-canvas{outline:none!important}'
  });
  assert.ok(bytes.length > 6000, 'Actual rendered scene contains meaningful image detail');
  if (filename) await writeFile(`${artifacts}/${filename}`, bytes);
  return createHash('sha256').update(bytes).digest('hex');
}
async function schoolLinks(page) {
  for (const [selector, program] of [['#learn-designlab', 'designlab'], ['.furniture-link', 'furniture']]) {
    const target = new URL(await page.locator(selector).getAttribute('href'), page.url());
    assert.equal(target.origin, origin);
    assert.equal(target.pathname, schoolPath);
    assert.equal(target.hash, '#selected');
    assert.equal(target.searchParams.get('program'), program);
    assert.equal(target.searchParams.get('level'), 'basic', 'Course link preserves preparation');
    assert.equal(target.searchParams.get('pace'), 'light', 'Course link preserves chosen workload');
  }
  const back = new URL(await page.locator('.topbar .back').getAttribute('href'), page.url());
  assert.equal(back.pathname, `${schoolPath}studio.html`);
  assert.equal(back.hash, '#ai-desk');
}
async function capturePoster() {
  const context = await browser.newContext({viewport: {width: 1600, height: 1700}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  const page = await context.newPage(); activePage = page; activeCase = 'poster';
  // The first capture may precede the first poster file. The rendered canvas does not use this placeholder.
  await page.route('**/assets/design-lab/ai-desk-preview.png', route => route.fulfill({status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}));
  await page.goto(`${demo}?${course}&material=oak&light=day`, {waitUntil: 'networkidle'});
  await launchScene(page);
  await page.evaluate(() => {
    document.querySelector('.shell').style.maxWidth = 'none';
    document.querySelector('.workspace').style.gridTemplateColumns = '1400px';
    const panel = document.querySelector('#scene-panel');
    Object.assign(panel.style, {position: 'fixed', top: '0px', left: '0px', zIndex: '100', width: '1400px', height: '1050px', minHeight: '0', aspectRatio: 'auto'});
  });
  await settled(page);
  const bytes = await page.locator('#desk-canvas').screenshot({animations: 'disabled', style: '.scene-topline,.scene-bottomline{visibility:hidden!important}#desk-canvas{outline:none!important}'});
  assert.equal(bytes.readUInt32BE(16), 1400, 'Poster width is the actual rendered 1400px');
  assert.equal(bytes.readUInt32BE(20), 1050, 'Poster height is the actual rendered 1050px');
  assert.ok(bytes.length > 30000, 'Poster captures rendered objects rather than an empty surface');
  await mkdir('dist/ai-path/assets/design-lab', {recursive: true});
  await writeFile('dist/ai-path/assets/design-lab/ai-desk-preview.png', bytes);
  await writeFile(`${artifacts}/ai-desk-scene-poster.png`, bytes);
  results.push({mode: 'poster-capture', size: '1400x1050', source: 'actual WebGL canvas screenshot', sha256: createHash('sha256').update(bytes).digest('hex')});
  console.log('PASS AI Desk poster: actual 1400x1050 WebGL scene, without UI overlays');
  await context.close(); activePage = undefined;
}

try {
  await mkdir(artifacts, {recursive: true});
  await readyServer();
  browser = await chromium.launch({headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  if (process.env.AI_DESK_CAPTURE_POSTER === '1') await capturePoster();
  for (const width of [1440, 390, 320]) {
    activeCase = String(width);
    const context = await browser.newContext({viewport: {width, height: width < 800 ? 844 : 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async () => {throw new Error('Clipboard unavailable in acceptance');}}});
    });
    const page = await context.newPage(); activePage = page;
    const observed = observe(page);
    await page.goto(`${demo}?${course}&material=oak&light=day`, {waitUntil: 'networkidle'});
    await selectedControls(page, 'oak', 'day');
    assert.equal(await page.locator('#desk-canvas').isHidden(), true, '3D is not launched automatically');
    assert.ok(await page.locator('#scene-poster').evaluate(image => image.complete && image.naturalWidth > 0), 'Local runtime poster is readable before launch');
    assertLazy(observed.requests);
    await page.locator('button[data-material="walnut"]').click();
    await page.locator('button[data-lighting="evening"]').click();
    assertSelectedURL(page, 'walnut', 'evening');
    await selectedControls(page, 'walnut', 'evening');
    assertLazy(observed.requests);
    // A new document restores the shared configuration without starting heavy 3D.
    await page.reload({waitUntil: 'networkidle'});
    await selectedControls(page, 'walnut', 'evening');
    assertLazy(observed.requests);
    await noOverflow(page, `${width}px poster`);
    await launchScene(page);
    assert.ok(observed.requests.some(url => /\/three\.module\.min\.js(?:\?|$)/.test(url)), 'Launch loads the actual local Three.js renderer');
    await page.locator('button[data-lighting="day"]').click();
    const materialDigests = {};
    for (const material of ['oak', 'walnut', 'white']) {
      await page.locator(`button[data-material="${material}"]`).click();
      await selectedControls(page, material, 'day');
      assertSelectedURL(page, material, 'day');
      materialDigests[material] = await canvasPixels(page, width === 1440 ? `ai-desk-1440-${material}.png` : undefined);
    }
    assert.equal(new Set(Object.values(materialDigests)).size, 3, 'Three tabletop materials render three genuinely different images');
    await page.locator('button[data-material="oak"]').click();
    const dayDigest = await canvasPixels(page, `ai-desk-${width}-day.png`);
    await page.locator('button[data-lighting="evening"]').click();
    const eveningDigest = await canvasPixels(page, `ai-desk-${width}-evening.png`);
    assert.notEqual(dayDigest, eveningDigest, 'Day and evening render different scenes');
    await selectedControls(page, 'oak', 'evening');
    assertSelectedURL(page, 'oak', 'evening');
    await page.locator('button[data-lighting="day"]').click();
    assert.equal(await canvasPixels(page), dayDigest, 'Returning to day restores the same rendered scene');
    await page.locator('#desk-canvas').focus();
    await page.keyboard.press('ArrowRight');
    const orbitDigest = await canvasPixels(page);
    assert.notEqual(orbitDigest, dayDigest, 'Keyboard orbit changes actual scene pixels');
    await page.locator('#reset-view').click();
    const resetDigest = await canvasPixels(page);
    assert.equal(resetDigest, dayDigest, 'Reset restores the exact original camera pixels');
    assert.equal(await canvasPixels(page), dayDigest, 'Render-on-demand remains visually stable while idle');
    await noOverflow(page, `${width}px ready scene`);
    await schoolLinks(page);
    await page.locator('#copy-link').click();
    assert.equal(await page.locator('#share-url').isVisible(), true, 'Clipboard failure exposes a copyable link');
    const selection = await page.locator('#share-url').evaluate(input => ({value: input.value, start: input.selectionStart, end: input.selectionEnd, focused: input === document.activeElement}));
    assert.equal(selection.value, page.url(), 'Copy fallback contains the exact selected URL');
    assert.equal(selection.focused, true);
    assert.equal(selection.start, 0);
    assert.equal(selection.end, selection.value.length, 'Fallback selects the complete link for manual copy');
    assert.match(await page.locator('#scene-status').innerText(), /Ссылка выделена/);
    await noOverflow(page, `${width}px clipboard fallback`);
    await page.locator('.workspace').scrollIntoViewIfNeeded();
    await page.screenshot({path: `${artifacts}/ai-desk-${width}.png`, fullPage: true, animations: 'disabled'});
    assert.deepEqual(observed.failures, [], `${width}px browser errors`);
    results.push({mode: 'responsive-interactions', width, status: 'PASS', materialDigests, dayDigest, eveningDigest, orbitDigest, resetDigest, localRequests: observed.requests.length, externalRequests: 0, clipboardFallback: 'PASS'});
    console.log(`PASS AI Desk ${width}px: lazy launch, restored URL, 3 visual materials, day/evening, keyboard/reset, clipboard fallback, school links, no external requests or overflow`);
    await context.close(); activePage = undefined;
  }

  activeCase = 'module-recovery';
  const context = await browser.newContext({viewport: {width: 320, height: 844}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  const page = await context.newPage(); activePage = page;
  const observed = observe(page, true);
  let sceneRequests = 0;
  await page.route('**/ai-desk-scene.js*', async route => {
    sceneRequests++;
    if (sceneRequests === 1) await route.abort('failed');
    else await route.continue();
  });
  await page.goto(`${demo}?${course}&material=white&light=evening`, {waitUntil: 'networkidle'});
  await page.locator('#start-scene').click();
  await page.waitForFunction(() => document.querySelector('#scene-panel').dataset.state === 'error');
  assert.equal(await page.locator('#scene-poster').isVisible(), true, 'Failed module leaves a useful poster');
  assert.equal(await page.locator('#desk-canvas').isHidden(), true, 'Failed module does not leave a misleading empty canvas');
  assert.equal(await page.locator('#start-scene').isEnabled(), true, 'Failed module permits a retry');
  assert.equal(await page.locator('#start-scene').evaluate(button => button === document.activeElement), true,
    'Initial import failure restores focus to the enabled retry button');
  assert.match(await page.locator('#start-scene').innerText(), /Попробовать ещё раз/);
  assert.match(await page.locator('#scene-status').innerText(), /недоступно/);
  await selectedControls(page, 'white', 'evening');
  await noOverflow(page, '320px failed module');
  await page.screenshot({path: `${artifacts}/ai-desk-320-module-fallback.png`, fullPage: true, animations: 'disabled'});
  await launchScene(page);
  assert.ok(sceneRequests >= 2, 'Retry makes a fresh module request after network failure');
  assert.equal(observed.expectedFailures.length, 1, 'Exactly the injected network failure occurred');
  await selectedControls(page, 'white', 'evening');
  assertSelectedURL(page, 'white', 'evening');
  await canvasPixels(page, 'ai-desk-320-module-recovered.png');
  assert.deepEqual(observed.failures, [], 'No unexpected browser errors during recovery');
  results.push({mode: 'failed-module-recovery', status: 'PASS', sceneRequests, expectedFailures: observed.expectedFailures});
  console.log('PASS AI Desk recovery: one injected module failure, readable fallback, fresh retry, selected configuration retained');
  await context.close(); activePage = undefined;

  // The user can change configuration during a slow import. Failure must not steal that focus.
  activeCase = 'loading-focus-preservation';
  const loadingContext = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  const loadingPage = await loadingContext.newPage(); activePage = loadingPage;
  const loadingObserved = observe(loadingPage, true);
  let releaseImport;
  const heldImport = new Promise(resolve => { releaseImport = resolve; });
  await loadingPage.route('**/ai-desk-scene.js*', async route => {
    await heldImport;
    await route.abort('failed');
  });
  await loadingPage.goto(`${demo}?${course}&material=oak&light=day`, {waitUntil: 'networkidle'});
  const pendingImport = loadingPage.waitForRequest('**/ai-desk-scene.js*');
  try {
    await loadingPage.locator('#start-scene').click();
    await pendingImport;
    await loadingPage.locator('button[data-material="walnut"]').click();
    await loadingPage.locator('button[data-lighting="evening"]').click();
  } finally {
    releaseImport();
  }
  await loadingPage.waitForFunction(() => document.querySelector('#scene-panel').dataset.state === 'error');
  assert.equal(await loadingPage.locator('button[data-lighting="evening"]').evaluate(button => button === document.activeElement), true,
    'Import failure preserves focus on the setting the user changed while loading');
  assert.equal(await loadingPage.locator('#start-scene').isEnabled(), true);
  await selectedControls(loadingPage, 'walnut', 'evening');
  assertSelectedURL(loadingPage, 'walnut', 'evening');
  assert.equal(loadingObserved.expectedFailures.length, 1);
  assert.deepEqual(loadingObserved.failures, [], 'No unexpected browser errors in delayed import failure');
  results.push({mode: 'loading-focus-preservation', status: 'PASS', focusedControl: 'evening-light', retainedConfiguration: 'walnut/evening'});
  console.log('PASS AI Desk loading focus: late import failure preserves the active setting and configuration');
  await loadingContext.close(); activePage = undefined;

  // Exercise actual WebGL loss, not a fabricated DOM event. Each case gets a fresh document/context.
  for (const focusedControl of ['#desk-canvas', '#reset-view', 'button[data-material="walnut"]']) {
    activeCase = `context-loss-${focusedControl === '#desk-canvas' ? 'canvas' : focusedControl === '#reset-view' ? 'reset' : 'material'}`;
    const lossContext = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
    const lossPage = await lossContext.newPage(); activePage = lossPage;
    const lossObserved = observe(lossPage);
    await lossPage.goto(`${demo}?${course}&material=walnut&light=evening`, {waitUntil: 'networkidle'});
    await launchScene(lossPage);
    await lossPage.locator(focusedControl).focus();
    assert.equal(await lossPage.locator(focusedControl).evaluate(element => element === document.activeElement), true);
    await lossPage.evaluate(() => {
      const canvas = document.querySelector('#desk-canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Actual WebGL context-loss extension is required for acceptance');
      extension.loseContext();
    });
    await lossPage.waitForFunction(() => document.querySelector('#scene-panel').dataset.state === 'error');
    assert.equal(await lossPage.locator('#desk-canvas').isHidden(), true, 'Lost context returns to the preview');
    assert.equal(await lossPage.locator('#scene-poster').isVisible(), true);
    assert.equal(await lossPage.locator('#start-scene').isVisible(), true);
    assert.equal(await lossPage.locator('#start-scene').isEnabled(), true);
    const expectedFocus = focusedControl === '#desk-canvas' || focusedControl === '#reset-view' ? '#start-scene' : focusedControl;
    assert.equal(await lossPage.locator(expectedFocus).evaluate(element => element === document.activeElement), true,
      `Context loss moves focus only when its former control is hidden: ${focusedControl}`);
    await selectedControls(lossPage, 'walnut', 'evening');
    assertSelectedURL(lossPage, 'walnut', 'evening');
    assert.match(await lossPage.locator('#scene-status').innerText(), /недоступно/);
    await noOverflow(lossPage, `390px ${activeCase}`);
    if (focusedControl === '#desk-canvas') await lossPage.screenshot({path: `${artifacts}/ai-desk-390-context-loss-focus.png`, fullPage: true, animations: 'disabled'});
    assert.deepEqual(lossObserved.failures, [], 'No unexpected browser errors in real context-loss recovery');
    results.push({mode: 'webgl-context-loss-focus', status: 'PASS', focusedControl, expectedFocus, retainedConfiguration: 'walnut/evening'});
    console.log(`PASS AI Desk real context loss: ${focusedControl} → ${expectedFocus}; configuration retained`);
    // No retry is required while this document's WebGL context remains deliberately lost.
    await lossContext.close(); activePage = undefined;
  }
  await writeFile(`${artifacts}/ai-desk-results.json`, JSON.stringify({testedAt: new Date().toISOString(), results}, null, 2) + '\n');
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({path: `${artifacts}/ai-desk-${activeCase}-failure.png`, fullPage: true, animations: 'disabled'}).catch(() => {});
  await writeFile(`${artifacts}/ai-desk-failure.txt`, `${error.stack}\n\nServer log:\n${serverLog}`).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
