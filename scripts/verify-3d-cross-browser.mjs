import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { firefox, webkit } from 'playwright';

// This verifies the school UI and its cross-origin iframe contract. The remote
// iframe is a message fixture in the three-width UI contract. A separate case
// embeds the published renderers under the production school origin.
const engine = process.env.BROWSER_ENGINE;
const browserTypes = { firefox, webkit };
if (!Object.hasOwn(browserTypes, engine)) throw new Error('Set BROWSER_ENGINE to firefox or webkit');
const base = 'http://127.0.0.1:4183/ai-path/';
const artifacts = `artifacts/qa-3d-program-${engine}`;
const framePattern = /https:\/\/safal207\.github\.io\/(room-control-studio|quiet-hours-sanctuary)\/preview\.html/;
const report = {
  engine, browserVersion: null, platform: process.platform, arch: process.arch,
  revision: process.env.GITHUB_SHA || null, runId: process.env.GITHUB_RUN_ID || null,
  startedAt: new Date().toISOString(), status: 'running', checks: [], viewports: [], actualEmbeds: [],
  scope: 'School program cards, real-model posters, learning plan, PDF, matrix filters and iframe lifecycle',
  iframe: 'Three-width lifecycle uses a cross-origin HTML message fixture. A separate 390px composition uses the published real scene in the school iframe.',
  limitations: ['Linux Playwright engines, not branded Safari or a physical phone', 'Viewport dimensions do not emulate a device GPU, touch behavior or performance']
};
let activeWidth = null;
let activePage;
let browser;
let serverLog = '';
const server = spawn('python3', ['-m', 'http.server', '4183', '--bind', '127.0.0.1', '--directory', 'dist'], { stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', bytes => { serverLog = (serverLog + bytes).slice(-6000); });
server.stderr.on('data', bytes => { serverLog = (serverLog + bytes).slice(-6000); });

function assert(condition, name) {
  report.checks.push({ width: activeWidth, name, status: condition ? 'passed' : 'failed' });
  if (!condition) throw new Error(`${engine} ${activeWidth}px: ${name}`);
}
async function startServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`HTTP server exited: ${serverLog}`);
    try {
      const response = await fetch(base);
      await response.arrayBuffer();
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`HTTP server did not start: ${serverLog}`);
}
async function noOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(dimensions.scroll <= dimensions.width + 1, `${name}: document fits the viewport (${dimensions.scroll}/${dimensions.width})`);
}
async function decode(locator, description = 'Source-backed model image decodes') {
  await locator.evaluate(async img => { img.loading = 'eager'; await img.decode(); });
  assert(await locator.evaluate(img => img.complete && img.naturalWidth >= 600 && img.naturalHeight > 0), description);
}
async function screenshotPanel(page, width, name) {
  await page.locator('#program3d').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await noOverflow(page, name);
  await page.locator('#program3d').screenshot({
    path: `${artifacts}/${width}-${name}.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }'
  });
}
function normalized(text) {
  return text.normalize('NFC').replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, ' ').trim();
}
async function downloadPlan(page, width) {
  const title = await page.locator('#selTitle').innerText();
  const steps = await page.locator('#selSteps li span:last-child').allTextContents();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#downloadPlan').click();
  const download = await downloadEvent;
  assert(download.suggestedFilename() === 'ai-path-designlab-plan.pdf', 'PDF filename identifies the chosen program');
  const path = `${artifacts}/${width}-designlab-plan.pdf`;
  await download.saveAs(path);
  assert(await download.failure() === null, 'PDF downloads successfully');
  assert((await readFile(path)).subarray(0, 5).toString('ascii') === '%PDF-', 'Downloaded file has the PDF signature');
  const pdf = JSON.parse(execFileSync('python3', ['-c', `
import json, sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
pages = [page.extract_text() or "" for page in reader.pages]
links = []
for page in reader.pages:
    for annotation in page.get("/Annots", []):
        action = annotation.get_object().get("/A")
        if action and action.get("/URI"):
            links.append(str(action["/URI"]))
print(json.dumps({"pages": pages, "links": links}, ensure_ascii=False))
`, path], { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 }));
  const text = normalized(pdf.pages.join('\n'));
  assert(pdf.pages.length > 0 && pdf.pages.every(value => value.trim().length > 30), 'PDF pages contain readable text');
  assert(text.includes(normalized(title)), 'PDF contains the selected Design Lab title');
  for (const step of steps) assert(text.includes(normalized(step)), 'PDF retains a selected learning stage');
  const current = new URL(page.url());
  const canonical = new URL('https://safal207.github.io/test-it-python/ai-path/');
  for (const key of ['program', 'level', 'pace']) canonical.searchParams.set(key, current.searchParams.get(key));
  canonical.hash = 'selected';
  assert(pdf.links.includes(canonical.href), 'PDF includes a clickable canonical route to this plan');
  assert(!text.includes('127.0.0.1'), 'PDF never shares the local test address');
  await page.waitForFunction(() => !document.querySelector('#downloadPlan').disabled);
  assert((await page.locator('#downloadPlan').innerText()).includes('PDF'), 'PDF action returns to its ready state');
}
async function startFrame(page) {
  const navigated = page.waitForEvent('framenavigated', { predicate: frame => framePattern.test(frame.url()) });
  await page.locator('#program3dPlay').click();
  const child = await navigated;
  await child.waitForLoadState('domcontentloaded');
  assert(await page.locator('#program3d iframe').count() === 1, 'Explicit launch creates exactly one preview iframe');
  return child;
}
async function exposeProgramMenu(page) {
  const before = new URL(page.url());
  await page.locator('#hero-programs').focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('#programs').isVisible() && await page.locator('#programs').evaluate(el => el.tagName === 'SECTION'), 'Catalogue entrance reaches the visible program menu');
  assert(new URL(page.url()).search === before.search, 'Menu navigation preserves the committed program, experience and pace');
  const more = page.locator('#showAllPrograms');
  assert(await more.evaluate(el => el.tagName === 'BUTTON'), 'Additional programs use a native button');
  if (await more.isVisible()) {
    await more.focus();
    await page.keyboard.press('Enter');
  }
  assert(await page.locator('#programList [data-program]:visible').count() === 15, 'Show-more action exposes all 15 program choices');
  assert(await more.getAttribute('aria-expanded') === 'true', 'Expanded program menu announces its complete state');
}
async function iframeContract(page, width) {
  const panel = page.locator('#program3d');
  assert(await panel.isVisible(), 'Direct Design Lab route exposes the model beside the learning plan');
  assert(await panel.locator('iframe').count() === 0, 'Program selection does not create an iframe before launch');
  await exposeProgramMenu(page);
  const card = page.locator('#programList [data-program="designlab"]');
  assert(await card.count() === 1 && await card.isVisible(), 'Expanded catalogue contains one visible Design Lab card');
  assert(await card.locator('img').getAttribute('src') === 'assets/program-menu-v1/designlab.webp', 'Catalogue uses the Design Lab conceptual menu illustration');
  assert((await card.locator('.program-cover-note').innerText()).trim() === 'AI-иллюстрация', 'Conceptual menu art is visibly distinguished from the real model preview');
  await decode(card.locator('img'), 'Conceptual program-menu illustration decodes');
  for (const scene of ['room', 'temple']) {
    await panel.locator(`[data-program-scene="${scene}"]`).click();
    assert((await panel.locator('#program3dPoster').getAttribute('src')).endsWith(`${scene}-3d-preview.png`), 'Scene tab selects its own model poster');
    await decode(panel.locator('#program3dPoster'));
    assert(await panel.locator('iframe').count() === 0, 'Changing the poster does not load a renderer');
    assert((await panel.locator(`[data-program-scene="${scene}"]`).getAttribute('aria-pressed')) === 'true', 'Selected scene tab is announced');
  }
  assert(await page.locator('#selSteps li').count() === 6, 'Selected plan retains six learning stages');
  for (const [id, week] of [['light', 4], ['interaction', 5], ['publish', 6]]) {
    await panel.locator(`[data-program-milestone="${id}"]`).click();
    const target = `#designlab-week-${week}`;
    assert(await panel.locator('#program3dWeek').getAttribute('href') === target, 'Model task links to the correct curriculum week');
    assert(await page.locator(target).count() === 1, 'Linked curriculum week exists once');
    await panel.locator('#program3dWeek').click();
    assert(new URL(page.url()).hash === target, 'Week action navigates to its real learning stage');
    assert(await page.locator('#selected-curriculum').evaluate(el => el.open) && await page.locator(target).isVisible(), 'Week action reveals its collapsed curriculum');
    assert(new URL(page.url()).searchParams.get('program') === 'designlab', 'Week navigation preserves the selected program');
  }
  await panel.locator('[data-program-scene="room"]').click();
  await decode(panel.locator('#program3dPoster'));
  await screenshotPanel(page, width, 'poster-and-plan');
  const child = await startFrame(page);
  assert(await panel.locator('iframe').getAttribute('referrerpolicy') === 'strict-origin', 'Preview receives the parent origin through its referrer policy');
  assert(await panel.locator('iframe').getAttribute('sandbox') === 'allow-scripts allow-same-origin', 'Iframe has the intended restricted capabilities');
  if (width <= 760) {
    const geometry = await panel.locator('#program3dStage').evaluate(el => ({height:el.getBoundingClientRect().height,minHeight:parseFloat(getComputedStyle(el).minHeight),width:el.getBoundingClientRect().width}));
    report.checks.push({width, name:'Mobile live-preview geometry', status:'observed', geometry});
    // CSS geometry may differ by a subpixel between layout engines. The declared
    // minimum must remain 380px and the measured box must be within one CSS pixel.
    assert(geometry.minHeight >= 380 && geometry.height >= 379, 'Mobile live-preview stage reserves 380px within 1px geometry tolerance: '+JSON.stringify(geometry));
  }
  await page.evaluate(() => {
    const iframeWindow = document.querySelector('#program3dFrame iframe').contentWindow;
    // Firefox's MessageEvent initializer rejects a cross-origin WindowProxy
    // during WebIDL conversion. These negative handler fixtures use own event
    // properties instead; valid readiness/error below still use native child
    // postMessage, and actualEmbedContract exercises the complete real protocol.
    const dispatchFixture = (origin, source, data) => {
      const event = new Event('message');
      Object.defineProperties(event, {
        origin: { value: origin }, source: { value: source }, data: { value: data }
      });
      window.dispatchEvent(event);
    };
    for (const type of ['designlab:preview-ready', 'designlab:preview-error']) {
      dispatchFixture('https://untrusted.example', iframeWindow, { type });
      dispatchFixture('https://safal207.github.io', window, { type });
    }
  });
  assert(await panel.locator('#program3dStage').getAttribute('aria-busy') === 'true' && await panel.locator('iframe').count() === 1, 'Wrong message origin or source cannot mark ready or remove a preview');
  await child.evaluate(() => parent.postMessage({ type: 'designlab:preview-ready' }, '*'));
  await page.waitForFunction(() => document.querySelector('#program3dFrame').classList.contains('is-ready'));
  assert(await panel.locator('#program3dPoster').isHidden(), 'Verified readiness reveals the iframe');
  assert(await panel.locator('#program3dStage').getAttribute('aria-busy') === 'false', 'Ready preview clears the loading state');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  // Offscreen iframe rAF can be suspended; timer polling observes the protocol.
  await child.waitForFunction(() => window.lastActive === false, null, { polling: 100 });
  assert(await child.evaluate(() => window.lastActive === false), 'Offscreen preview receives a pause instruction');
  await panel.locator('#program3dStage').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await child.waitForFunction(() => window.lastActive === true, null, { polling: 100 });
  assert(await child.evaluate(() => window.lastActive === true), 'Visible preview receives a resume instruction');
  await child.evaluate(() => parent.postMessage({ type: 'designlab:preview-error' }, '*'));
  await page.waitForFunction(() => !document.querySelector('#program3dFrame iframe'));
  assert(await panel.locator('#program3dPoster').isVisible(), 'Failed preview restores the rendered-model poster');
  assert((await panel.locator('#program3dPlay').innerText()).includes('Повторить'), 'Failed preview exposes an actionable retry');
  await startFrame(page);
  await panel.locator('[data-program-scene="temple"]').click();
  assert(await panel.locator('iframe').count() === 0, 'Switching scenes disposes the previous iframe');
  await startFrame(page);
  await panel.locator('#program3dStop').click();
  assert(await panel.locator('iframe').count() === 0 && await panel.locator('#program3dStage').getAttribute('aria-busy') === 'false', 'Cancel removes the loading iframe and clears busy state');
  await startFrame(page);
  await exposeProgramMenu(page);
  await page.locator('#catalogFilters [data-filter="all"]').click();
  assert(await page.locator('#programList [data-program]:visible').count() === 6, 'Resetting the catalogue filter restores its initial six choices');
  await page.locator('#programList [data-program="build"]').click();
  assert(await panel.isHidden() && await panel.locator('iframe').count() === 0, 'Another program disposes 3D and hides its panel');
  assert(await page.locator('.selection-visual').isVisible(), 'Another program restores its regular result preview');
  await exposeProgramMenu(page);
  await page.locator('#programList [data-program="designlab"]').click();
  assert(await panel.isVisible() && await panel.locator('iframe').count() === 0, 'Returning to Design Lab starts with an idle poster');
  await panel.locator('[data-program-scene="room"]').click();
  await decode(panel.locator('#program3dPoster'));
  await noOverflow(page, 'Model and plan after all transitions');
  await downloadPlan(page, width);
}
async function matrixContract(page, width) {
  await page.goto(new URL('3d-checks.html', base).href, { waitUntil: 'domcontentloaded' });
  const rows = page.locator('.matrix tbody tr');
  const total = await rows.count();
  assert(total >= 22, 'Verification matrix retains all original checks and any added browser checks');
  assert(await page.locator('#D01').getAttribute('data-status') === 'not_run', 'Physical-phone validation remains explicitly unrun');
  if (await page.locator('#D02').count()) assert(await page.locator('#D02').getAttribute('data-status') === 'not_run', 'Unverified target-platform row remains explicitly unrun');
  await page.locator('#areaFilter').selectOption('Программа');
  const programRows = await page.locator('.matrix tbody tr:visible').count();
  assert(programRows >= 6, 'Matrix can filter to the school program checks');
  await page.locator('#statusFilter').selectOption('not_run');
  assert(await page.locator('#empty').isVisible(), 'Matrix explains an empty combined filter');
  await page.locator('#areaFilter').selectOption('all');
  const notRun = await page.locator('.matrix tbody tr:visible').count();
  assert(notRun >= 1 && notRun < total, 'Matrix exposes unrun checks without presenting them as passed');
  assert((await page.locator('#visibleCount').innerText()).includes(String(notRun)), 'Matrix result count follows the active filter');
  await page.locator('#statusFilter').selectOption('all');
  assert(await page.locator('.matrix tbody tr:visible').count() === total, 'Clearing filters restores the complete matrix');
  await noOverflow(page, 'Verification matrix');
  await page.screenshot({ path: `${artifacts}/${width}-matrix.png`, animations: 'disabled' });
}

async function actualEmbedContract(browser) {
  // Retain the production parent URL/origin while serving its current checkout
  // from the CI HTTP server. Only school files are intercepted. The two scene
  // paths, renderer modules and scene assets are fetched from published Pages.
  activeWidth = 390;
  const context = await browser.newContext({ viewport: { width: 390, height: 840 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(20000);
  const errors = [];
  const diagnostics = { consoleErrors: [], failedRequests: [], sceneDocuments: [] };
  report.actualEmbedDiagnostics = diagnostics;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && diagnostics.consoleErrors.length < 30) diagnostics.consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    if (diagnostics.failedRequests.length < 30) diagnostics.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText });
  });
  page.on('response', response => {
    if (framePattern.test(response.url())) diagnostics.sceneDocuments.push({ url: response.url(), status: response.status(), etag: response.headers().etag || null });
  });
  await context.route('https://safal207.github.io/test-it-python/ai-path/**', async route => {
    const source = new URL(route.request().url());
    const local = new URL(base);
    local.pathname = source.pathname.replace('/test-it-python/ai-path/', '/ai-path/');
    local.search = source.search;
    const response = await route.fetch({ url: local.href });
    await route.fulfill({ response });
  });
  await page.goto('https://safal207.github.io/test-it-python/ai-path/?program=designlab&level=zero&pace=balanced#selected', { waitUntil: 'domcontentloaded' });
  assert(await page.locator('#program3d').isVisible(), 'Actual embed: school runs under its production origin');
  for (const scene of ['room', 'temple']) {
    const result = { scene, width: 390, height: 840, status: 'running', origin: 'https://safal207.github.io', source: 'Published scene, current school checkout' };
    report.actualEmbeds.push(result);
    await page.locator(`[data-program-scene="${scene}"]`).click();
    const child = await startFrame(page);
    result.url = child.url();
    await child.waitForFunction(() => window.__preview?.ready || window.__preview?.error, null, { timeout: 120000, polling: 100 });
    result.previewError = await child.evaluate(() => window.__preview.error);
    assert(result.previewError === null, `Actual ${scene} renderer initializes without a caught error: ${result.previewError}`);
    await page.waitForFunction(() => document.querySelector('#program3dFrame').classList.contains('is-ready'), null, { polling: 100 });
    assert(await page.locator('#program3dPoster').isHidden(), `Actual ${scene} readiness reaches the school through the sandbox/referrer protocol`);
    result.referrer = await child.evaluate(() => document.referrer);
    assert(result.referrer === 'https://safal207.github.io/', `Actual ${scene} child receives the expected strict-origin referrer`);
    result.webgl = await child.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return null;
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER), width: canvas.width, height: canvas.height };
    });
    assert(result.webgl && result.webgl.width > 0 && result.webgl.height > 0, `Actual ${scene} canvas has an initialized WebGL context`);
    const framesBefore = await child.evaluate(() => window.__preview.frames);
    const snapshots = [];
    for (const bound of ['min', 'max']) {
      const value = await child.locator('#light').getAttribute(bound);
      await child.locator('#light').evaluate((slider, value) => {
        slider.value = value;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
      assert((await child.locator('output').innerText()).trim() === `${value}%`, `Actual ${scene} light control displays its ${bound} value`);
      const pixels = await child.locator('canvas').screenshot({ path: `${artifacts}/390-actual-${scene}-${bound}.png`, animations: 'disabled' });
      snapshots.push(createHash('sha256').update(pixels).digest('hex'));
    }
    result.lightScreenshotHashes = snapshots;
    assert(snapshots[0] !== snapshots[1], `Actual ${scene} light change alters the rendered canvas capture`);
    assert(await child.evaluate(() => window.__preview.frames) > framesBefore, `Actual ${scene} light interaction renders a new frame`);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await child.waitForFunction(() => window.__preview.active === false, null, { polling: 100 });
    assert(await child.evaluate(() => window.__preview.active === false), `Actual ${scene} renderer pauses when its school panel is offscreen`);
    await page.locator('#program3dStage').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await child.waitForFunction(() => window.__preview.active === true, null, { polling: 100 });
    assert(await child.evaluate(() => window.__preview.active === true), `Actual ${scene} renderer resumes when its school panel is visible`);
    await screenshotPanel(page, 390, `actual-${scene}-and-plan`);
    await page.locator('#program3dStop').click();
    assert(await page.locator('#program3d iframe').count() === 0, `Actual ${scene} stop disposes its iframe`);
    result.status = 'passed';
  }
  assert(errors.length === 0, 'Actual scene composition has no unhandled browser errors: ' + errors.join('; '));
  await context.close();
  activePage = undefined;
}

try {
  await mkdir(artifacts, { recursive: true });
  await startServer();
  browser = await browserTypes[engine].launch({ headless: process.env.HEADED !== '1', ...(engine === 'firefox' ? {firefoxUserPrefs:{'webgl.disabled':false,'webgl.force-enabled':true,'webgl.forbid-software':false,'gfx.webrender.all':true,'gfx.webrender.software':true}} : {}) });
  report.browserVersion = browser.version();
  for (const width of [1440, 390, 320]) {
    activeWidth = width;
    const height = width === 1440 ? 1000 : 840;
    const viewportReport = { width, height, status: 'running', browserErrors: [] };
    report.viewports.push(viewportReport);
    const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    activePage = page;
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => viewportReport.browserErrors.push(error.message));
    await page.route(framePattern, route => route.fulfill({
      contentType: 'text/html', body: '<!doctype html><html><body><p>School iframe protocol fixture. Renderer tested separately.</p><script>window.lastActive=null;addEventListener("message",e=>{if(e.data&&e.data.type==="designlab:visibility")window.lastActive=e.data.active});</script></body></html>'
    }));
    await page.goto(base + '?program=designlab&level=zero&pace=balanced#selected', { waitUntil: 'domcontentloaded' });
    await iframeContract(page, width);
    await matrixContract(page, width);
    assert(viewportReport.browserErrors.length === 0, 'No unhandled browser JavaScript errors: ' + viewportReport.browserErrors.join('; '));
    viewportReport.status = 'passed';
    await context.close();
    activePage = undefined;
    console.log(`PASS ${engine} ${width}x${height}: real-model posters, plan/PDF, iframe protocol and matrix`);
  }
  await actualEmbedContract(browser);
  console.log(`PASS ${engine} 390px: published room and temple inside the school sandbox`);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = String(error.stack || error);
  if (activePage) await activePage.screenshot({ path: `${artifacts}/failure-${activeWidth}.png`, fullPage: true }).catch(() => {});
  console.error(report.error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.totals = { passed: report.checks.filter(check => check.status === 'passed').length, failed: report.checks.filter(check => check.status === 'failed').length };
  await mkdir(artifacts, { recursive: true });
  await writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  server.kill('SIGTERM');
}
