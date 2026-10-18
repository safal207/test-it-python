import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4179/ai-path/';
const artifacts = 'artifacts/ai-path-qa';
const programIds = ['explore', 'build', 'space', 'furniture', 'create', 'comics', 'qa', 'game', 'ml', 'hack', 'grant', 'frontier', 'books', 'designlab', 'vibe'];
const projectPreviewSources = {
  build: 'assets/testit.webp', space: 'assets/architectural.webp', furniture: 'assets/furniture/luma01-hero.webp',
  create: 'assets/rustclip.webp', comics: 'assets/comics/issue-02-cover.webp', qa: 'assets/testit.webp',
  game: 'assets/awakening.webp', designlab: 'assets/design-lab/composition.svg'
};
const groups = {
  explore: ['explore'], visual: ['furniture', 'space', 'designlab', 'comics', 'books', 'create'],
  build: ['build', 'qa', 'game', 'vibe'], research: ['ml', 'hack', 'grant', 'frontier']
};
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
      await response.arrayBuffer();
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Preview server not ready: ' + serverLog);
}
function assert(condition, message) {
  if (!condition) throw new Error('AI PATH acceptance failed: ' + message);
}
async function ids(locator) {
  return locator.evaluateAll(elements => elements.map(el => el.dataset.program));
}
function sameMembers(actual, expected) {
  return actual.length === expected.length && [...actual].sort().join('|') === [...expected].sort().join('|');
}
async function noOverflow(page, stage) {
  const report = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter(el => el.getClientRects().length && getComputedStyle(el).position !== 'fixed')
      .map(el => ({ tag: el.tagName, id: el.id, left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right) }))
      .filter(el => el.right > innerWidth + 1 || el.left < -1).slice(0, 30)
  }));
  if (report.document > report.viewport + 1) console.error('AI_PATH_OVERFLOW', stage, JSON.stringify(report));
  assert(report.document <= report.viewport + 1, `No document horizontal overflow: ${stage}`);
}
async function screenshot(page, width, stage, selector) {
  if (selector) await page.locator(selector).evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  else await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('img').evaluateAll(images => Promise.all(images.filter(img => {
    const rect = img.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
  }).map(img => img.decode())));
  await noOverflow(page, stage);
  await page.screenshot({ path: `${artifacts}/ai-path-${width}-${stage}.png`, animations: 'disabled' });
}
async function catalogPresentation(page, width) {
  const report = await page.locator('#programList .program').evaluateAll(cards => cards.map(card => {
    const body = card.querySelector('.program-body');
    const covers = [...card.querySelectorAll('.program-media img')];
    const clipped = [];
    if (body) {
      const bounds = body.getBoundingClientRect();
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        if ([...range.getClientRects()].some(rect => rect.width && rect.height &&
          (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1))) {
          clipped.push(walker.currentNode.textContent.trim());
        }
      }
    }
    return { id: card.dataset.program, covers: covers.length, alt: covers.every(img => img.hasAttribute('alt')),
      body: Boolean(body), clipped, nestedActions: card.querySelectorAll('button, a, input, select, textarea, [tabindex]').length };
  }));
  for (const card of report) {
    assert(card.covers === 1 && card.alt, `Program has one cover with an explicit alternative-text decision: ${card.id}`);
    assert(card.body && card.clipped.length === 0, `Program text fits its card at ${width}px: ${card.id} ${JSON.stringify(card.clipped)}`);
    assert(card.nestedActions === 0, `Program remains one keyboard action without nested controls: ${card.id}`);
  }
  await noOverflow(page, 'visual catalog ' + width);
  // Images were decoded by preservedContent; omit sticky chrome from the tall catalog capture.
  await page.locator('#programList').screenshot({ path: `${artifacts}/ai-path-${width}-catalog.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
}
async function clickWithoutJump(page, selector, label) {
  const button = page.locator(selector);
  await button.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await button.click();
  const after = await page.evaluate(() => scrollY);
  assert(Math.abs(after - before) < 160, `${label} keeps the visitor in the quiz (${before} → ${after})`);
}
async function chooseQuiz(page, { goal, interest, level = 'zero', pace = 'balanced' }) {
  await page.locator(`#goals [data-goal="${goal}"]`).click();
  if (interest && goal !== 'explore') await page.locator(`#interests [data-interest="${interest}"]`).click();
  await page.locator(`#levels [data-level="${level}"]`).click();
  await page.locator(`#paces [data-pace="${pace}"]`).click();
  await page.locator('#showRecommendation').click();
}
async function selected(page, id) {
  assert(await page.locator('#selected').isVisible(), `Selected route is visible: ${id}`);
  assert(new URL(page.url()).searchParams.get('program') === id, `URL preserves explicit selection: ${id}`);
  assert((await page.locator('#selTitle').innerText()).trim().length > 0, 'Selected program has a title');
  assert((await page.locator('#selRequirement').innerText()).trim().length > 0, 'Selected route states its starting level');
  for (const selector of ['#selPaceNote', '#selFirstTask', '#selOutcome']) {
    assert((await page.locator(selector).innerText()).trim().length > 12, `Selected route explains ${selector}`);
  }
  const visual = await page.locator('.selection-visual').evaluate(el => ({
    visible: [...el.querySelectorAll('figure')].filter(figure => figure.getClientRects().length).map(figure => figure.id),
    projectSrc: el.querySelector('#selImage').getAttribute('src'), projectAlt: el.querySelector('#selImage').alt,
    projectCaption: el.querySelector('#selImageCaption').textContent.trim(),
    conceptSrc: el.querySelector('#selConceptImage').getAttribute('src'), conceptAlt: el.querySelector('#selConceptImage').alt,
    conceptCaption: el.querySelector('#selConcept figcaption').textContent.trim()
  }));
  if (projectPreviewSources[id]) {
    assert(visual.visible.join('|') === 'selPreview' && visual.projectSrc === projectPreviewSources[id], `Selected program preserves its source-backed project preview: ${id}`);
    assert(visual.projectAlt.length > 12 && visual.projectCaption === visual.projectAlt, `Selected project preview retains its attribution: ${id}`);
    assert(visual.conceptSrc === null, `Project preview clears a previous conceptual illustration: ${id}`);
  } else {
    assert(visual.visible.join('|') === 'selConcept' && visual.conceptSrc === `assets/program-covers/${id}.svg`, `Selected program shows its own conceptual illustration: ${id}`);
    assert(visual.conceptAlt === '' && visual.conceptCaption.includes('Иллюстрация'), `Conceptual art is explicitly distinguished from a project result: ${id}`);
    assert(visual.projectSrc === null && visual.projectAlt === '' && visual.projectCaption === '', `Conceptual route clears previous project imagery and attribution: ${id}`);
  }
  const summary = await page.locator('#curriculumSummary').innerText();
  for (const selector of ['#selDuration', '#selMeetings']) {
    assert(summary.includes((await page.locator(selector).innerText()).trim()), `Curriculum summary retains the selected ${selector}: ${id}`);
  }
}
async function curriculumPresentation(page, width, id) {
  const links = await page.locator('nav.plan-nav a').evaluateAll(elements => elements.map(el => el.getAttribute('href')));
  assert(links.join('|') === '#selected-result|#selected-curriculum|#start', 'Plan navigation exposes result, curriculum and contact in order');
  for (const target of links) assert(await page.locator(target).count() === 1 && await page.locator(target).isVisible(), `Plan navigation has one visible destination: ${target}`);
  assert(await page.locator('#selected-result #selOutcome').count() === 1, 'Result link leads to the current learning outcome');
  assert(await page.locator('#selected-curriculum #selSteps li').count() > 0, 'Curriculum link leads to the complete selected step list');
  const clipped = await page.locator('#selSteps li').evaluateAll(steps => steps.flatMap(step => {
    const bounds = step.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(step.lastElementChild);
    return [...range.getClientRects()].some(rect => rect.width && rect.height &&
      (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1))
      ? [step.textContent.trim()] : [];
  }));
  assert(clipped.length === 0, `All selected curriculum text fits at ${width}px: ${id} ${JSON.stringify(clipped)}`);
  const routeBefore = new URL(page.url());
  await page.locator('nav.plan-nav a[href="#selected-curriculum"]').click();
  const routeAfter = new URL(page.url());
  assert(routeAfter.search === routeBefore.search && routeAfter.hash === '#selected-curriculum', 'Curriculum navigation preserves the program URL and opens its section');
  assert(await page.locator('#selected-curriculum').evaluate(el => document.activeElement === el), 'Curriculum navigation moves keyboard focus to its destination');
  await assertUncovered(page.locator('#curriculumTitle'), 'Curriculum heading after plan navigation');
  await noOverflow(page, 'selected curriculum ' + id + ' ' + width);
  await page.locator('#selected-curriculum').screenshot({ path: `${artifacts}/ai-path-${width}-${id}-curriculum.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
}
async function selectedBreakpointChecks(page) {
  await page.goto(base + '?program=vibe&level=project&pace=deep#selected', { waitUntil: 'domcontentloaded' });
  await selected(page, 'vibe');
  for (const width of [759, 760, 761, 1019, 1020, 1021]) {
    await page.setViewportSize({ width, height: 900 });
    const columns = await page.evaluate(() => ['.selection-hero', '#selSteps'].map(selector => {
      const style = getComputedStyle(document.querySelector(selector));
      return style.display === 'grid' ? style.gridTemplateColumns.trim().split(/\s+/).length : 0;
    }));
    const expected = width <= 760 ? 1 : 2;
    assert(columns.every(count => count === expected), `Selected hero and curriculum keep ${expected} readable columns at ${width}px: ${columns.join(', ')}`);
    await noOverflow(page, 'selected breakpoint ' + width);
    if (width === 760 || width === 761) await screenshot(page, width, 'selected-boundary', '#selected');
  }
  await page.setViewportSize({ width: 320, height: 740 });
}
async function contact(page) {
  const fallback = page.locator('#start details.message-fallback');
  if (!(await fallback.evaluate(el => el.open))) await fallback.locator('summary').click();
  assert(await page.locator('#contactMessage').isVisible(), 'Alternative contact draft opens from its summary');
  const message = await page.locator('#contactMessage').inputValue();
  const title = await page.locator('#selTitle').innerText();
  const url = new URL(await page.locator('#contactMentor').getAttribute('href'));
  assert(url.protocol === 'mailto:' && url.pathname === 'safal0645@gmail.com', 'Mentor contact uses the verified direct email');
  assert(url.searchParams.get('body') === message, 'Email draft matches the visible message');
  assert(message.includes(title) && message.includes('Мой уровень:') && message.includes('Желаемая нагрузка:'), 'Contact draft includes program, level and pace');
  assert(await page.locator('#contactMessage').evaluate(el => el.readOnly), 'Contact message can be inspected without being submitted');
  // No contact link is opened and no message is sent by this check.
  await page.evaluate(() => navigator.clipboard.writeText('qa-before-message'));
  await page.locator('#copyMessage').click();
  await page.waitForFunction(async expected => await navigator.clipboard.readText() === expected, message);
  assert(await page.evaluate(() => navigator.clipboard.readText()) === message, 'Copy message writes the visible draft');
  await page.evaluate(() => navigator.clipboard.writeText('qa-before-link'));
  await page.locator('#copyLink').click();
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).startsWith('https://'));
  const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  const current = new URL(page.url());
  for (const key of ['program', 'level', 'pace']) assert(copied.searchParams.get(key) === current.searchParams.get(key), `Copied route retains ${key}`);
  assert(copied.hash === '#selected', 'Copied route opens the selected program');
  await noOverflow(page, 'contact fallback expanded');
}
function canonicalRoute(page) {
  const current = new URL(page.url());
  const route = new URL('https://safal207.github.io/test-it-python/ai-path/');
  for (const key of ['program', 'level', 'pace']) route.searchParams.set(key, current.searchParams.get(key));
  route.hash = 'selected';
  return route.toString();
}
async function assertUncovered(locator, label) {
  const report = await locator.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      width: innerWidth, height: innerHeight, uncovered: hit === el || el.contains(hit) };
  });
  assert(report.top >= 0 && report.bottom <= report.height + 1 && report.left >= 0 && report.right <= report.width + 1 && report.uncovered, `${label} is visible and not covered: ${JSON.stringify(report)}`);
}
async function contactNavigation(page, width) {
  assert(await page.locator('#headerAction').getAttribute('href') === '#selected', 'Header returns to the committed program');
  assert(await page.locator('#closingAction').getAttribute('href') === '#start', 'Closing action keeps the selected next step');
  await page.locator('#selTitle').focus();
  await page.locator('#selTitle').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  if (width <= 760) {
    await page.locator('#selectionDock').waitFor({ state: 'visible' });
    assert((await page.locator('#dockName').innerText()).trim() === (await page.locator('#selTitle').innerText()).trim(), 'Mobile dock names the committed program');
    assert(await page.locator('#dockPlan').getAttribute('href') === '#selected', 'Dock preserves access to the program plan');
    assert(await page.locator('#dockStart').getAttribute('href') === '#start', 'Dock leads to the contact panel');
    await assertUncovered(page.locator('#dockStart'), 'Mobile next-step button');
    await noOverflow(page, 'mobile selection dock visible');
    await page.locator('#dockStart').click();
  } else {
    assert(!(await page.locator('#selectionDock').isVisible()), 'Desktop does not show the mobile dock');
    await page.locator('#startJump').click();
  }
  assert(await page.locator('#startTitle').evaluate(el => document.activeElement === el), 'Next-step action focuses the contact heading');
  await page.locator('#selectionDock').waitFor({ state: 'hidden' });
  await assertUncovered(page.locator('#startTitle'), 'Focused contact heading');
  await screenshot(page, width, 'contact', '#start');
}
function normalizePdfText(value) {
  return value.normalize('NFC').replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, ' ').trim();
}
function inspectPdf(path) {
  return JSON.parse(execFileSync('python3', ['-c', `
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
}
async function downloadPlan(page, width, label, { minPages = 1 } = {}) {
  const current = new URL(page.url());
  const program = current.searchParams.get('program');
  const route = canonicalRoute(page);
  const expected = {
    title: (await page.locator('#selTitle').innerText()).trim(),
    outcome: (await page.locator('#selOutcome').innerText()).trim(),
    firstTask: (await page.locator('#selFirstTask').innerText()).trim(),
    starter: (await page.locator('#starterTemplate').textContent()).trim().split('\n').filter(Boolean),
    kit: await page.locator('#selKit li').allTextContents(),
    steps: await page.locator('#selSteps li span:last-child').allTextContents()
  };
  assert(expected.kit.length === 3, 'Selected offer has three concrete takeaways');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#downloadPlan').click();
  const download = await downloadEvent;
  assert(download.suggestedFilename() === `ai-path-${program}-plan.pdf`, 'PDF filename identifies the selected program');
  const path = `${artifacts}/ai-path-${width}-${program}-${label}.pdf`;
  await download.saveAs(path);
  assert(await download.failure() === null, 'Program plan downloads successfully');
  const file = await readFile(path);
  assert(file.subarray(0, 5).toString('ascii') === '%PDF-', 'Downloaded file is an actual PDF');
  const pdf = inspectPdf(path);
  assert(pdf.pages.length >= minPages && pdf.pages.every(text => text.trim().length > 30), 'PDF has readable content on every expected page');
  const text = normalizePdfText(pdf.pages.join('\n'));
  for (const [key, value] of Object.entries(expected)) {
    for (const part of Array.isArray(value) ? value : [value]) assert(text.includes(normalizePdfText(part)), `Downloaded PDF contains the committed ${key}`);
  }
  const levels = { zero: 'с нуля', basic: 'есть небольшая база', project: 'есть свой проект' };
  const paces = { light: '2–3 ч', balanced: '4–6 ч', deep: '7+ ч' };
  assert(text.includes('МОЙ УРОВЕНЬ ' + levels[current.searchParams.get('level')]), 'Downloaded plan retains the committed level in its labeled card');
  assert(text.includes(normalizePdfText('НАГРУЗКА В НЕДЕЛЮ ' + paces[current.searchParams.get('pace')])), 'Downloaded plan retains the committed pace in its labeled card');
  assert(text.replace(/\s/g, '').includes(route.replace(/\s/g, '')), 'Downloaded PDF includes the readable canonical shared route');
  assert(pdf.links.includes(route), 'Downloaded PDF includes a clickable canonical shared route');
  assert(!text.includes('127.0.0.1'), 'Downloaded plan never shares the test server address');
  await page.waitForFunction(() => !document.querySelector('#downloadPlan').disabled);
  assert((await page.locator('#downloadPlan').innerText()).trim() === 'Скачать мой план · PDF ↓', 'PDF action returns to its ready state');
  return text;
}
async function pdfLoadingAndRetry(context, width) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const vendorRequests = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/\/vendor\/(jspdf\.umd\.min|plan-fonts)\.js$/.test(new URL(request.url()).pathname)) vendorRequests.push(request.url());
  });
  let releaseFont;
  const fontGate = new Promise(resolve => { releaseFont = resolve; });
  const fontPattern = '**/vendor/plan-fonts.js*';
  const holdAndFailFont = async route => { await fontGate; await route.abort('failed'); };
  await page.route(fontPattern, holdAndFailFont);
  try {
    await page.goto(base + '?program=furniture&level=basic&pace=light#selected', { waitUntil: 'load' });
    await selected(page, 'furniture');
    assert(vendorRequests.length === 0, 'PDF library and fonts are not fetched before a download is requested');
    const fontRequest = page.waitForRequest(request => /\/vendor\/plan-fonts\.js$/.test(new URL(request.url()).pathname));
    await page.locator('#downloadPlan').click();
    await fontRequest;
    assert(await page.locator('#downloadPlan').isDisabled(), 'PDF action is disabled while its assets are being prepared');
    assert((await page.locator('#downloadPlan').innerText()).trim() === 'Готовлю PDF…', 'PDF preparation state is visible');
    assert(vendorRequests.length === 2 && vendorRequests.every(url => new URL(url).origin === new URL(base).origin), 'Only same-origin PDF library and font assets are requested');
    await screenshot(page, width, 'pdf-preparing', '.plan-save');
    releaseFont();
    await page.waitForFunction(() => !document.querySelector('#downloadPlan').disabled && document.querySelector('#planDownloadStatus').textContent === 'Не удалось создать PDF. Проверь соединение и попробуй ещё раз.');
    assert(await page.locator('#planDownloadStatus').isVisible(), 'Failed preparation gives the visitor a persistent visible retry instruction');
    assert((await page.locator('#downloadPlan').innerText()).trim() === 'Скачать мой план · PDF ↓', 'Failed preparation restores the enabled download action');
    await screenshot(page, width, 'pdf-retry', '.plan-save');
    await page.unroute(fontPattern, holdAndFailFont);
    await downloadPlan(page, width, 'retry');
    assert(errors.length === 0, 'Recoverable PDF preparation failure causes no unhandled JavaScript error');
  } finally {
    releaseFont();
    await page.close();
  }
}
async function assertIdea(page, expected, excluded) {
  assert(await page.locator('#projectIdea').inputValue() === expected, 'Optional idea belongs to the selected program');
  const message = await page.locator('#contactMessage').inputValue();
  const body = new URL(await page.locator('#contactMentor').getAttribute('href')).searchParams.get('body');
  assert(body === message, 'Contact draft and email remain consistent after idea edits');
  if (expected) assert(message.includes(expected), 'Contact draft includes the optional idea');
  if (excluded) assert(!message.includes(excluded), 'Contact draft does not include another program’s idea');
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  for (const idea of [expected, excluded].filter(Boolean)) {
    assert(!decodeURIComponent(page.url()).includes(idea) && !storage.includes(idea), 'Optional idea is not persisted in the URL or browser storage');
  }
}
async function conversionFlow(page, width) {
  const furnitureIdea = 'Мой тестовый проект: кресло для чтения у окна, тёплое дерево и мягкая спинка.';
  const bookIdea = 'Мой тестовый проект: короткая книга о бумажном городе для семейного чтения.';
  await chooseQuiz(page, { goal: 'visual', interest: 'furniture', level: 'zero', pace: 'light' });
  await selected(page, 'furniture');
  await contactNavigation(page, width);
  assert(await page.locator('#projectIdea').getAttribute('maxlength') === '240', 'Optional idea has a short, explicit limit');
  const committedURL = page.url();
  await page.locator('#projectIdea').fill(furnitureIdea);
  await assertIdea(page, furnitureIdea, bookIdea);
  assert(page.url() === committedURL, 'Writing an optional idea leaves the shared URL unchanged');
  const starter = page.locator('#starterPack');
  if (!(await starter.evaluate(el => el.open))) await starter.locator('summary').click();
  const template = (await page.locator('#starterTemplate').innerText()).trim();
  assert((template.match(/^\d+\.\s/gm) || []).length === 3, 'Starter template contains exactly three numbered prompts');
  await page.evaluate(() => navigator.clipboard.writeText('qa-before-starter'));
  await page.locator('#copyStarter').click();
  await page.waitForFunction(async expected => await navigator.clipboard.readText() === expected, template);
  const furniturePlan = await downloadPlan(page, width, 'committed');
  assert(furniturePlan.includes(normalizePdfText(furnitureIdea)), 'Plan download includes the optional idea for its program');
  const committedMessage = await page.locator('#contactMessage').inputValue();
  await page.locator('#levels [data-level="basic"]').click();
  await page.locator('#paces [data-pace="deep"]').click();
  assert(!(await page.locator('#results').isVisible()), 'Draft quiz edits invalidate the old recommendation');
  assert(page.url() === committedURL && await page.locator('#contactMessage').inputValue() === committedMessage, 'Draft quiz edits do not rewrite the committed contact payload');
  const draftPlan = await downloadPlan(page, width, 'after-draft');
  assert(draftPlan === furniturePlan, 'Unsubmitted quiz answers do not alter the downloaded plan');
  await chooseQuiz(page, { goal: 'visual', interest: 'books', level: 'zero', pace: 'balanced' });
  await selected(page, 'books');
  await assertIdea(page, '', furnitureIdea);
  await page.locator('#projectIdea').fill(bookIdea);
  await assertIdea(page, bookIdea, furnitureIdea);
  const bookPlan = await downloadPlan(page, width, 'committed');
  assert(bookPlan.includes(normalizePdfText(bookIdea)) && !bookPlan.includes(normalizePdfText(furnitureIdea)), 'Book plan includes only its own idea');
  await screenshot(page, width, 'book-offer', '#selected');
  await page.locator('#programList [data-program="furniture"]').click();
  await selected(page, 'furniture');
  await assertIdea(page, furnitureIdea, bookIdea);
  await page.locator('#programList [data-program="books"]').click();
  await selected(page, 'books');
  await assertIdea(page, bookIdea, furnitureIdea);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await selected(page, 'books');
  await assertIdea(page, '', bookIdea);
}
async function comparison(page) {
  const cards = page.locator('#recommendationList .program');
  const candidates = await ids(cards);
  assert(candidates.length >= 1 && candidates.length <= 3 && new Set(candidates).size === candidates.length, 'At most three distinct recommendations');
  const names = await cards.locator('.program-name').allTextContents();
  await page.locator('#compareToggle').click();
  assert(await page.locator('#comparison').isVisible(), 'Compare button opens the comparison');
  assert(await page.locator('#compareToggle').getAttribute('aria-expanded') === 'true', 'Comparison expanded state is announced');
  const columns = await page.locator('#comparisonTable thead th').allTextContents();
  assert(columns.length === names.length + 1, 'Comparison has one column per suggested program');
  assert(columns.slice(1).every((text, i) => text.includes(names[i].trim())), 'Comparison headings match current recommendations');
  const rowLabels = await page.locator('#comparisonTable tbody th').allTextContents();
  for (const label of ['Результат', 'Срок', 'Для старта', 'Время в неделю', 'Стоимость']) {
    assert(rowLabels.some(text => text.includes(label)), `Comparison explains ${label}`);
  }
  for (const row of await page.locator('#comparisonTable tbody tr').all()) {
    assert(await row.locator('td').count() === candidates.length, 'Each comparison row covers every candidate');
  }
  await noOverflow(page, 'comparison open');
  await page.locator('#compareToggle').click();
  assert(!(await page.locator('#comparison').isVisible()), 'Comparison can be collapsed');
}
async function preservedContent(page, complete) {
  assert(await page.locator('#examples article.project').count() === 6, 'Six source-backed project cards');
  assert(await page.locator('#comics article.project').count() === 3, 'Three existing comic examples');
  assert(await page.locator('#furniture article.project').count() === 3, 'Three source-backed LUMA 01 views');
  assert(await page.locator('#frontier .frontier-card').count() === 4, 'Four official lab pathways');
  assert(await page.locator('#frontier a[href*="openai.com"]').count() >= 1, 'Official OpenAI route linked');
  assert(await page.locator('#frontier a[href*="anthropic.com"]').count() >= 1, 'Official Anthropic route linked');
  assert(await page.locator('#nbGrid .nb-card').count() === 6, 'Featured ML notebooks visible');
  if (complete) {
    await page.locator('#nbFilters [data-nbcat="nlp"]').click();
    assert(await page.locator('#nbGrid .nb-card').count() === 10, 'Ten NLP notebooks after filtering');
    await page.locator('#nbFilters [data-nbcat="all"]').click();
    await page.locator('#nbSeeAll').click();
    const links = await page.locator('#nbGrid .nb-card').evaluateAll(elements => elements.map(a => a.href));
    assert(links.length === 24 && new Set(links).size === 24, 'All 24 notebook links are unique');
    assert(links.every(url => url.startsWith('https://github.com/safal207/students/blob/')), 'Notebook links preserve the source archive');
  }
  const galleries = page.locator('#examples .project-shot, #comics .project-shot, #furniture .project-shot');
  for (const button of await galleries.all()) {
    await button.scrollIntoViewIfNeeded();
    await button.locator('img').evaluate(img => img.decode());
    await button.click();
    assert(await page.locator('#projectLightbox').evaluate(dialog => dialog.open), 'Gallery opens on click');
    await page.locator('#galleryImage').evaluate(img => img.decode());
    await page.keyboard.press('Escape');
    assert(!(await page.locator('#projectLightbox').evaluate(dialog => dialog.open)), 'Gallery closes with Escape');
    assert(await button.evaluate(el => document.activeElement === el), 'Gallery returns keyboard focus');
  }
  // Covers new result/catalog art as well as the preserved project images.
  for (const img of await page.locator('img:visible').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(el => el.decode());
    assert(await img.evaluate(el => el.naturalWidth > 0), 'Visible image decodes successfully');
  }
  await noOverflow(page, 'all images decoded');
}
async function booksRoute(page, width) {
  await chooseQuiz(page, { goal: 'visual', interest: 'books', level: 'zero' });
  await selected(page, 'books');
  assert((await page.locator('#selTitle').innerText()).trim() === 'Книга с ИИ и Amazon KDP', 'Book route has the intended program title');
  assert((await ids(page.locator('#recommendationList .program'))).join('|') === 'books|comics|create', 'Book interest recommends the book route followed by comics and video');
  assert(!(await page.locator('#selPreview').isVisible()), 'Book route does not reuse the previous furniture image as a book cover');
  await contact(page);
  const message = await page.locator('#contactMessage').inputValue();
  assert(message.includes('Книга с ИИ и Amazon KDP') && message.includes('program=books'), 'Book contact draft preserves the book title and shared route');
  assert(await page.locator('#books a[href="https://www.amazon.com/dp/B0HJ3XHBZ2"]').count() >= 1, 'Book example links to the provided Amazon listing');
  for (const [topic, label] of [['G200672390', 'AI content policy'], ['G200673300', 'supported languages']]) {
    assert(await page.locator(`#books a[href="https://kdp.amazon.com/en_US/help/topic/${topic}"]`).count() >= 1, `Book requirements link to official KDP ${label}`);
  }
  assert(await page.locator('#books img').count() === 0, 'Book section does not invent a cover image');
  await screenshot(page, width, 'books', '#books');
  await page.locator('#books [data-start-track="books"]').click();
  await selected(page, 'books');
  assert(await page.locator('#selTitle').evaluate(el => document.activeElement === el), 'Book quick start focuses the selected program');
}
async function vibeRoute(page, width) {
  await page.goto(base + '?program=vibe&level=project&pace=deep#selected', { waitUntil: 'domcontentloaded' });
  await selected(page, 'vibe');
  assert(await page.locator('#selSteps li').count() === 16, 'Vibe Coding has sixteen steps');
  await curriculumPresentation(page, width, 'vibe');
  if (width === 1440) await downloadPlan(page, width, 'sixteen-modules', { minPages: 2 });
  assert(await page.locator('#vibe a[href="vibe-coding/"]').count() === 1, 'Course linked from home');
  await noOverflow(page, 'vibe-deep-link-' + width);

  const course = await page.goto(base + 'vibe-coding/', { waitUntil: 'domcontentloaded' });
  assert(course?.status() === 200, 'Course published on local server');
  assert(await page.locator('#modules .module').count() === 16, 'Sixteen curriculum modules');
  await page.locator('#filters [data-area="engineering"]').click();
  assert(await page.locator('#modules .module:visible').count() === 6, 'Engineering modules filter');
  await page.locator('#filters [data-area="all"]').click();
  assert(await page.locator('#modules .module:visible').count() === 16, 'All modules after reset');
  await page.locator('#modules .module').first().locator('summary').click();
  assert(await page.locator('#modules .module').first().locator('details').evaluate(el => el.open), 'Native accordion');
  await noOverflow(page, 'vibe-course-' + width);
  await screenshot(page, width, 'vibe-course', '#curriculum');

  const crm = await page.goto(base + 'vibe-coding/crm-demo.html', { waitUntil: 'domcontentloaded' });
  assert(crm?.status() === 200, 'CRM published on local server');
  assert((await page.locator('#leadCount').innerText()) === '5', 'Five fictional leads loaded');
  await page.locator('#leadLabel').fill('Демо-новый');
  await page.locator('#leadNext').fill('Проверить прототип');
  await page.locator('#leadForm button[type="submit"]').click();
  assert((await page.locator('#leadCount').innerText()) === '6', 'Add fictional lead');
  assert(await page.locator('#rows tr').count() === 6, 'Table refresh');
  await page.locator('#rows select').first().selectOption('won');
  assert((await page.locator('#activeCount').innerText()) === '4', 'Terminal stage excluded from active');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const csv = await downloadPromise;
  assert(csv.suggestedFilename() === 'ai-path-demo-crm.csv', 'Safe CSV export filename');
  await page.locator('#reset').click();
  assert((await page.locator('#leadCount').innerText()) === '5', 'Reset to synthetic seed');
  await noOverflow(page, 'vibe-crm-' + width);
  await screenshot(page, width, 'vibe-crm', '#tableTitle');

  await page.goto(base + '?program=vibe#selected', { waitUntil: 'domcontentloaded' });
  await selected(page, 'vibe');
  assert(await page.locator('#programList .program').count() === 15, 'Existing catalog preserved');
}

async function designLabRoute(page, width) {
  await chooseQuiz(page, { goal: 'visual', interest: 'designlab', level: 'zero' });
  await selected(page, 'designlab');
  assert((await page.locator('#selTitle').innerText()).trim() === 'Design Lab — интерактивные сайты', 'Design Lab program title');
  assert((await ids(page.locator('#recommendationList .program'))).join('|') === 'designlab|build|space', 'Design Lab recommends relevant development and space alternatives');
  assert(await page.locator('#selSteps li').count() === 6, 'Design Lab includes six learning stages');
  assert((await page.locator('#selOutcome').innerText()).includes('Один собственный'), 'Learning outcome is one student project');
  assert(await page.locator('#design-lab article.project').count() === 4, 'Four separate teaching examples');
  const demos = await page.locator('#design-lab .design-lab-visual').evaluateAll(items => items.map(a => a.href));
  assert(demos.length === 4 && new Set(demos).size === 4, 'Teaching demo links are distinct');
  assert(await page.locator('#design-lab .design-lab-skill').count() === 4, 'Every example explains the skill taught');
  const lesson = page.locator('#transformation-lab');
  await lesson.scrollIntoViewIfNeeded();
  await lesson.locator('[data-lesson-step="1"]').click();
  assert(await lesson.getAttribute('data-step') === '1', 'The lesson visibly separates the same image layers');
  assert((await lesson.locator('#lesson-summary').innerText()).includes('слои раздвинуты'), 'The separation is explained');
  await lesson.locator('[data-lesson-step="2"]').click();
  assert(await lesson.locator('[data-lesson-layer="0"]').getAttribute('src') === 'assets/design-lab/mist-0.svg', 'Reassembly actually changes artwork palette');
  await lesson.locator('#lesson-foreground').click();
  assert(await lesson.locator('[data-lesson-layer="4"]').isHidden(), 'Removing foreground changes the result');
  assert((await lesson.locator('#lesson-summary').innerText()).includes('4 из 5'), 'Layer count tracks actual visibility');
  assert(await lesson.locator('.lesson-original img').getAttribute('src') === 'assets/design-lab/composition.svg', 'Original reference stays unchanged');
  const lessonImages = await lesson.locator('img').evaluateAll(images => Promise.all(images.map(async image => {
    try { image.loading = 'eager'; await image.decode(); return image.naturalWidth > 0; } catch { return false; }
  })));
  assert(lessonImages.every(Boolean), 'Every original and transformed lesson image decodes');
  await lesson.locator('[data-lesson-palette="sunset"]').click();
  assert(await lesson.locator('[data-lesson-layer="0"]').getAttribute('src') === 'assets/design-lab/sunset-0.svg', 'Student palette control affects the image');
  await lesson.locator('#lesson-reset').click();
  assert(await lesson.getAttribute('data-step') === '0', 'Reset returns to the source');
  assert(!await lesson.locator('[data-lesson-layer="4"]').isHidden(), 'Reset restores all layers');
  assert(await page.locator('#design-lab .design-lab-process').count() === 4, 'All four examples describe their transformation');
  const cardImages = await page.locator('#design-lab .design-lab-visual img').evaluateAll(images => Promise.all(images.map(async image => {
    try { image.loading = 'eager'; await image.decode(); return image.naturalWidth > 0; } catch { return false; }
  })));
  assert(cardImages.length === 4 && cardImages.every(Boolean), 'All four project cards have actual decodable images');
  await noOverflow(page, 'Transformation lab ' + width);
  await contact(page);
  const message = await page.locator('#contactMessage').inputValue();
  assert(message.includes('Design Lab') && message.includes('program=designlab'), 'Contact draft keeps the new route');
  const plan = await downloadPlan(page, width, 'designlab');
  for (const name of ['VESPER','Layer Lab','Quiet Hours','Room Control']) assert(plan.includes(name), 'Downloaded curriculum names example ' + name);
  await screenshot(page, width, 'pdf-download', '.plan-save');
  await screenshot(page, width, 'design-lab', '#design-lab');
  await page.locator('#design-lab [data-start-track="designlab"]').click();
  await selected(page, 'designlab');
  assert(await page.locator('#selTitle').evaluate(el => document.activeElement === el), 'Design Lab CTA focuses chosen program');
  await noOverflow(page, 'Design Lab selection ' + width);
}

async function firstProjectOffer(page, width) {
  // Use non-default experience and pace so the quick start cannot silently reset them.
  await chooseQuiz(page, { goal: 'build', interest: 'qa', level: 'basic', pace: 'light' });
  const previous = new URL(page.url());
  await screenshot(page, width, 'first-project', '#first-project');
  const offer = page.locator('#first-project');
  assert(await offer.locator('.navigator-results li').count() === 2, 'Navigator offer describes two trial projects');
  assert(await offer.locator('.mentor-value-list li').count() === 3, 'The offer explains three concrete mentor contributions');
  const offerFacts = await offer.locator('.navigator-facts strong').allTextContents();
  assert(offerFacts.map(text => Number.parseInt(text, 10)).join('|') === '4|2', 'Navigator offer states four meetings and two trials');
  await page.locator('#navigatorStart').click();
  await selected(page, 'explore');
  assert(await page.locator('#selTitle').evaluate(el => document.activeElement === el), 'Navigator quick start focuses the selected plan');
  const current = new URL(page.url());
  for (const key of ['level', 'pace']) assert(current.searchParams.get(key) === previous.searchParams.get(key), `Navigator quick start retains the chosen ${key}`);
  assert(Number.parseInt(await page.locator('#selDuration').innerText(), 10) === 4 && Number.parseInt(await page.locator('#selMeetings').innerText(), 10) === 4, 'Navigator details match the four-week, four-meeting base plan');
  await contact(page);
  if (width === 1440) await downloadPlan(page, width, 'navigator');
}
async function mentorExample(page, width) {
  const demo = page.locator('#mentorExample');
  // Keep sticky page chrome out of tall component captures; viewport captures retain it.
  const componentStyle = '.header, .selection-dock, .toast { visibility: hidden !important; }';
  const routeBefore = page.url();
  const messageBefore = await page.locator('#contactMessage').inputValue();
  if (!(await demo.evaluate(el => el.open))) {
    await demo.locator('summary').focus();
    await page.keyboard.press('Enter');
  }
  assert(await demo.evaluate(el => el.open), 'Teaching example opens by keyboard');
  const paint = () => demo.locator('[data-mentor-demo-paint]').evaluateAll(shapes => shapes.map(shape => getComputedStyle(shape).fill));
  const initialPaint = await paint();
  assert(initialPaint.length > 0 && await demo.getAttribute('data-mentor-demo-stage') === '1', 'Teaching example starts with an actual painted first version');
  const initialLabel = await demo.locator('#mentor-demo-palette-name').innerText();
  await demo.locator('[data-mentor-demo-palette="mist"]').focus();
  await page.keyboard.press('Space');
  assert(await demo.locator('[data-mentor-demo-palette="mist"]').getAttribute('aria-pressed') === 'true', 'Palette button is keyboard-operable');
  assert(await demo.locator('#mentor-demo-palette-name').innerText() !== initialLabel, 'Prepared faulty version changes the visible label');
  assert(JSON.stringify(await paint()) === JSON.stringify(initialPaint), 'Prepared faulty version leaves the actual colors unchanged');
  await demo.locator('[data-mentor-demo-step="2"]').click();
  await demo.locator('#mentor-demo-check').click();
  assert(await demo.locator('#mentor-demo-results').isVisible(), 'Checking the first version reveals the measured result');
  assert(await demo.locator('#mentor-demo-label-result').getAttribute('data-passed') === 'true' && await demo.locator('#mentor-demo-color-result').getAttribute('data-passed') === 'false', 'First check reports the real label/color mismatch');
  await noOverflow(page, 'mentor mismatch ' + width);
  await demo.screenshot({ path: `${artifacts}/ai-path-${width}-mentor-mismatch.png`, animations: 'disabled', style: componentStyle });
  await demo.locator('[data-mentor-demo-step="3"]').click();
  assert(await demo.getAttribute('data-mentor-demo-stage') === '3', 'Fix step opens the corrected version');
  assert(JSON.stringify(await paint()) === JSON.stringify(initialPaint), 'Corrected version resets to the same initial conditions');
  await demo.locator('#mentor-demo-check').click();
  assert(!(await demo.locator('#mentor-demo-results').isVisible()) && await demo.locator('#mentor-demo-color-result').getAttribute('data-passed') === null, 'No pass or failure is invented before the visitor repeats the action');
  await demo.locator('[data-mentor-demo-palette="mist"]').click();
  assert(await demo.locator('#mentor-demo-palette-name').innerText() !== initialLabel, 'Corrected version changes the label again');
  assert(JSON.stringify(await paint()) !== JSON.stringify(initialPaint), 'Corrected version changes the actual rendered colors');
  await demo.locator('#mentor-demo-check').click();
  assert(await demo.locator('#mentor-demo-label-result').getAttribute('data-passed') === 'true' && await demo.locator('#mentor-demo-color-result').getAttribute('data-passed') === 'true', 'Repeating the same check confirms both corrected behaviors');
  await noOverflow(page, 'mentor corrected ' + width);
  await demo.screenshot({ path: `${artifacts}/ai-path-${width}-mentor-corrected.png`, animations: 'disabled', style: componentStyle });
  await demo.locator('#mentor-demo-reset').click();
  assert(await demo.getAttribute('data-mentor-demo-stage') === '1' && JSON.stringify(await paint()) === JSON.stringify(initialPaint), 'Reset restores the initial teaching example');
  assert(!(await demo.locator('#mentor-demo-results').isVisible()) && await demo.locator('#mentor-demo-color-result').getAttribute('data-passed') === null, 'Reset clears stale verification results');
  assert(page.url() === routeBefore && await page.locator('#contactMessage').inputValue() === messageBefore, 'Teaching example does not change the selected program or contact draft');
  await demo.locator('summary').click();
}

async function desktopRegressions(page) {
  await chooseQuiz(page, { goal: 'research', interest: 'ml', level: 'zero' });
  await selected(page, 'qa');
  assert((await ids(page.locator('#recommendationList .program'))).includes('ml'), 'Beginner keeps the desired ML destination among alternatives');
  assert((await page.locator('#resultReason').innerText()).trim().length > 25, 'Beginner recommendation explains the preparation route');
  await page.locator('#recommendationList [data-program="ml"]').click();
  await selected(page, 'ml');
  assert(await page.locator('#selTitle').evaluate(el => document.activeElement === el), 'Explicit candidate choice receives accessible focus');
  assert((await page.locator('#selRequirement').innerText()).includes('Python'), 'Manual advanced choice still shows its prerequisite');
  assert(await page.locator('#results').isVisible(), 'Opening a recommended alternative preserves the other candidates');
  await page.locator('#backToResults').click();
  await comparison(page);


  await chooseQuiz(page, { goal: 'research', interest: 'frontier', level: 'project', pace: 'deep' });
  await selected(page, 'frontier');
  assert(new URL(page.url()).searchParams.get('level') === 'project', 'Existing project level remains explicit');
  const frozenURL = page.url();
  const frozenPace = await page.locator('#selTime').innerText();
  await page.locator('#paces [data-pace="light"]').click();
  assert(!(await page.locator('#results').isVisible()), 'Editing answers invalidates the old recommendation');
  assert((await page.locator('#recommendation').innerText()).includes('Ответы изменены'), 'Visitor is told to update the recommendation');
  assert(page.url() === frozenURL && await page.locator('#selTime').innerText() === frozenPace, 'Previously selected route is not silently rewritten by unfinished answers');
  await page.locator('#showRecommendation').click();
  assert(new URL(page.url()).searchParams.get('pace') === 'light', 'Submitting changed answers updates the chosen pace');
  assert((await page.locator('#selPaceNote').innerText()).trim().length > 20, 'Light pace has a concrete explanation');

  for (const [filter, expected] of Object.entries(groups)) {
    await page.locator(`#catalogFilters [data-filter="${filter}"]`).click();
    assert(sameMembers(await ids(page.locator('#programList .program:visible')), expected), `Catalog ${filter} filter contains the correct programs`);
  }
  await page.locator('#catalogFilters [data-filter="all"]').click();
  assert(sameMembers(await ids(page.locator('#programList .program:visible')), programIds), 'All programs remain reachable in the catalog');
  await page.locator('#programList [data-program="comics"]').click();
  await selected(page, 'comics');
  assert((await page.locator('#selOutcome').innerText()).includes('PDF'), 'Comic program preserves its concrete PDF deliverable');

  for (const button of await page.locator('[data-start-track]').all()) {
    const id = await button.getAttribute('data-start-track');
    await button.click();
    await selected(page, id);
  }
  await page.locator('#chooseAwakening').click();
  await selected(page, 'game');
  assert((await page.locator('#selTitle').innerText()).includes('Пробуждение'), 'Awakening CTA preserves the game route');

  for (const id of programIds) {
    await page.goto(`${base}?program=${id}&level=project&pace=light#selected`, { waitUntil: 'domcontentloaded' });
    await selected(page, id);
    assert(await page.locator('#levels [data-level="project"]').getAttribute('aria-pressed') === 'true', `Deep link restores project experience for ${id}`);
    assert(await page.locator('#paces [data-pace="light"]').getAttribute('aria-pressed') === 'true', `Deep link restores light pace for ${id}`);
    assert(sameMembers(await ids(page.locator('#programList .program')), programIds), `Deep link preserves access to all programs: ${id}`);
  }
  await page.goto(`${base}?program=furniture&level=constructor&pace=__proto__#selected`, { waitUntil: 'domcontentloaded' });
  await selected(page, 'furniture');
  assert(await page.locator('#levels [data-level="zero"]').getAttribute('aria-pressed') === 'true', 'Invalid level uses the supported default');
  assert(await page.locator('#paces [data-pace="balanced"]').getAttribute('aria-pressed') === 'true', 'Invalid pace uses the supported default');
  await page.goto(`${base}?program=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E&level=__proto__&pace=constructor#selected`, { waitUntil: 'domcontentloaded' });
  assert(!(await page.locator('#selected').isVisible()) && !(await page.locator('#results').isVisible()), 'Unknown route values do not fabricate a selected program');
  assert(await page.locator('#levels [data-level="zero"]').getAttribute('aria-pressed') === 'true', 'Malformed URL retains safe level');
  assert(await page.locator('#paces [data-pace="balanced"]').getAttribute('aria-pressed') === 'true', 'Malformed URL retains safe pace');
}

await mkdir(artifacts, { recursive: true });
let browser;
let activePage;
let activeWidth;
try {
  await startServer();
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [[1440, 960], [390, 844], [320, 740]]) {
    activeWidth = width;
    const context = await browser.newContext({
      viewport: { width, height }, reducedMotion: 'reduce', deviceScaleFactor: 1,
      permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true
    });
    const page = await context.newPage();
    activePage = page;
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => { errors.push('Unexpected dialog: ' + dialog.message()); void dialog.dismiss(); });
    const response = await page.goto(base, { waitUntil: 'domcontentloaded' });
    assert(response?.status() === 200, 'Page returns HTTP 200');
    await page.locator('#programList .program').first().waitFor();
    assert(sameMembers(await ids(page.locator('#programList .program')), programIds), 'All 15 programs are available');
    const trackNumbers = await page.locator('#programList .program').evaluateAll(cards => Object.fromEntries(cards.map(card => [card.dataset.program, card.querySelector('.n').textContent.match(/ТРЕК\s*(\d+)/)?.[1]])));
    for (const [index, id] of programIds.entries()) assert(Number(trackNumbers[id]) === index + 1, `Track number stays stable: ${id}`);
    assert(!(await page.locator('#selected').isVisible()) && !(await page.locator('#results').isVisible()), 'Fresh entry does not claim the visitor already selected a program');
    assert(!new URL(page.url()).searchParams.has('program'), 'Fresh entry does not manufacture a selection in the URL');
    assert(!(await page.locator('#selectionDock').isVisible()), 'Fresh entry has no sticky selection action');
    assert(await page.locator('#headerAction').getAttribute('href') === '#selector', 'Fresh header starts the selection quiz');
    await screenshot(page, width, 'hero');
    await screenshot(page, width, 'quiz', '#selector');

    await clickWithoutJump(page, '#goals [data-goal="visual"]', 'Goal choice');
    const interests = await page.locator('#interests [data-interest]').evaluateAll(elements => elements.map(el => el.dataset.interest));
    assert(sameMembers(interests, groups.visual), 'Visual goal narrows the topic choice');
    await clickWithoutJump(page, '#interests [data-interest="space"]', 'First topic choice');
    await clickWithoutJump(page, '#interests [data-interest="furniture"]', 'Revised topic choice');
    const level = page.locator('#levels [data-level="basic"]');
    await level.focus();
    await page.keyboard.press('Space');
    assert(await level.getAttribute('aria-pressed') === 'true', 'Experience can be selected by keyboard');
    assert(await level.evaluate(el => document.activeElement === el), 'Experience button retains keyboard focus');
    await page.locator('#levels [data-level="zero"]').focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('#levels [data-level="zero"]').getAttribute('aria-pressed') === 'true', 'Experience can be revised by keyboard');
    const pace = page.locator('#paces [data-pace="light"]');
    await pace.focus();
    await page.keyboard.press('Enter');
    assert(await pace.getAttribute('aria-pressed') === 'true', 'Pace can be selected by keyboard');
    await page.locator('#showRecommendation').focus();
    await page.keyboard.press('Enter');
    await selected(page, 'furniture');
    assert(await page.locator('#results').isVisible(), 'Submit reveals the recommendation');
    assert(await page.locator('#resultTitle').evaluate(el => document.activeElement === el), 'Submit focuses the recommendation heading');
    assert((await page.locator('#selOutcome').innerText()).includes('3D-модель'), 'Furniture program preserves its digital model deliverable');
    await screenshot(page, width, 'result', '#results');
    await comparison(page);
    const candidates = await ids(page.locator('#recommendationList .program'));
    const keyboardProgram = candidates[1];
    await page.locator(`#programList [data-program="${keyboardProgram}"]`).focus();
    await page.keyboard.press('Space');
    await selected(page, keyboardProgram);
    assert(await page.locator('#selTitle').evaluate(el => document.activeElement === el), 'Keyboard card activation focuses the selected plan');
    for (const list of ['programList', 'recommendationList']) {
      assert((await ids(page.locator(`#${list} .program[aria-pressed="true"]`))).join('|') === keyboardProgram, `Keyboard choice updates the selected card in ${list}`);
    }
    assert(await page.locator('#results').isVisible() && (await ids(page.locator('#recommendationList .program'))).join('|') === candidates.join('|'), 'Keyboard choice preserves recommended alternatives');
    await page.locator('#recommendationList [data-program="furniture"]').click();
    await selected(page, 'furniture');
    await screenshot(page, width, 'selected', '#selected');
    await curriculumPresentation(page, width, 'furniture');
    await contact(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await selected(page, 'furniture');
    assert(new URL(page.url()).searchParams.get('pace') === 'light', 'Selected route survives reload');
    await preservedContent(page, width === 1440);
    await catalogPresentation(page, width);
    await booksRoute(page, width);
    await designLabRoute(page, width);
    await conversionFlow(page, width);
    await firstProjectOffer(page, width);
    await mentorExample(page, width);
    if (width === 1440) {
      await desktopRegressions(page);
      await pdfLoadingAndRetry(context, width);
    }
    await vibeRoute(page, width);
    if (width === 320) await selectedBreakpointChecks(page);
    await noOverflow(page, 'final');
    assert(errors.length === 0, 'No browser JavaScript errors: ' + errors.join('; '));
    console.log(`PASS ${width}x${height}: guided choice, vibe course/CRM, book route, comparison, navigator offer, mentor verification example, contact draft, real PDF contents/links and idea isolation, preserved gallery/notebook/lab content and responsive layout`);
    await context.close();
    activePage = undefined;
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: `${artifacts}/ai-path-${activeWidth}-failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {});
  }
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}

