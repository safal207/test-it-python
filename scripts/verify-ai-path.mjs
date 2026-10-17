import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4179/ai-path/';
const artifacts = 'artifacts/ai-path-qa';
const programIds = ['explore', 'build', 'space', 'furniture', 'create', 'comics', 'qa', 'game', 'ml', 'hack', 'grant', 'frontier'];
const groups = {
  explore: ['explore'], visual: ['furniture', 'space', 'comics', 'create'],
  build: ['build', 'qa', 'game'], research: ['ml', 'hack', 'grant', 'frontier']
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
}
async function contact(page) {
  const fallback = page.locator('#selected details.message-fallback');
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
      permissions: ['clipboard-read', 'clipboard-write']
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
    assert(sameMembers(await ids(page.locator('#programList .program')), programIds), 'All 12 stable programs are available');
    assert(!(await page.locator('#selected').isVisible()) && !(await page.locator('#results').isVisible()), 'Fresh entry does not claim the visitor already selected a program');
    assert(!new URL(page.url()).searchParams.has('program'), 'Fresh entry does not manufacture a selection in the URL');
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
    await screenshot(page, width, 'selected', '#selected');
    await contact(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await selected(page, 'furniture');
    assert(new URL(page.url()).searchParams.get('pace') === 'light', 'Selected route survives reload');
    await preservedContent(page, width === 1440);
    if (width === 1440) await desktopRegressions(page);
    await noOverflow(page, 'final');
    assert(errors.length === 0, 'No browser JavaScript errors: ' + errors.join('; '));
    console.log(`PASS ${width}x${height}: guided choice, comparison, contact draft, preserved gallery/notebook/lab content and responsive layout`);
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
