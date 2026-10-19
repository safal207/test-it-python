import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4179/ai-path/';
const artifacts = 'artifacts/ai-path-qa';
const programIds = ['explore', 'build', 'space', 'furniture', 'create', 'comics', 'qa', 'game', 'ml', 'hack', 'grant', 'frontier', 'books', 'designlab', 'vibe'];
const projectPreviewSources = {
  build: 'assets/testit.webp', space: 'assets/architectural.webp', furniture: 'assets/furniture/luma01-hero.webp',
  create: 'assets/rustclip.webp', comics: 'assets/comics/issue-02-cover.webp', qa: 'assets/testit.webp',
  game: 'assets/awakening.webp', designlab: 'assets/design-lab/room-3d-preview.png'
};
const groups = {
  explore: ['explore'], visual: ['furniture', 'space', 'designlab', 'comics', 'books', 'create'],
  build: ['build', 'designlab', 'vibe', 'qa', 'game'], research: ['ml', 'hack', 'grant', 'frontier']
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
function committedContext(url) {
  const params = new URL(url).searchParams;
  return Object.fromEntries(['program', 'level', 'pace'].map(key => [key, params.get(key)]));
}
async function schoolLink(page, locator, path, context, label) {
  const target = new URL(await locator.getAttribute('href'), page.url());
  const expected = new URL(path, base);
  assert(target.origin === expected.origin && target.pathname === expected.pathname && target.hash === expected.hash, `${label} opens its intended school destination`);
  if (context?.program) {
    for (const key of ['program', 'level', 'pace']) assert(target.searchParams.get(key) === context[key], `${label} keeps the committed ${key}`);
  }
  return target.href;
}
async function noOverflow(page, stage) {
  const report = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter(el => el.getClientRects().length && getComputedStyle(el).position !== 'fixed')
      .map(el => ({ tag: el.tagName, id: el.id, class: el.getAttribute('class') || '',
        closestId: el.parentElement?.closest('[id]')?.id || '', text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 120),
        left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right) }))
      .filter(el => el.right > innerWidth + 1 || el.left < -1).slice(0, 30)
  }));
  if (report.document > report.viewport + 1) console.error('AI_PATH_OVERFLOW', stage, JSON.stringify(report));
  assert(report.document <= report.viewport + 1, `No document horizontal overflow: ${stage}`);
}
// Exercise the native disclosure controls before testing content retained below them.
// Never force visibility in the DOM: a broken summary or hidden ancestor must fail.
async function revealTarget(page, target) {
  const locator = typeof target === 'string' ? page.locator(target) : target;
  const ancestors = await locator.evaluate(el => {
    const details = [...document.querySelectorAll('details')];
    const result = [];
    for (let node = el; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS' && !node.open) result.unshift(details.indexOf(node));
    }
    return result;
  });
  for (const index of ancestors) {
    const disclosure = page.locator('details').nth(index);
    await disclosure.locator(':scope > summary').click();
    assert(await disclosure.evaluate(el => el.open), 'Native summary opens the retained content');
  }
}
async function screenshot(page, width, stage, selector) {
  if (selector) {
    await revealTarget(page, selector);
    await page.locator(selector).evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
  else await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('img').evaluateAll(images => Promise.all(images.filter(img => {
    const rect = img.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
  }).map(img => img.decode())));
  await noOverflow(page, stage);
  await page.screenshot({ path: `${artifacts}/ai-path-${width}-${stage}.png`, animations: 'disabled' });
}
async function responsivePageBounds(page) {
  const original = page.viewportSize();
  try {
    // Include narrow text pressure and both sides of the main layout boundaries.
    for (const width of [320, 359, 360, 361, 379, 380, 381, 759, 760, 761, 1019, 1020, 1021, 1049, 1050, 1051, 1099, 1100, 1101]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await noOverflow(page, 'fresh page breakpoint ' + width);
    }
  } finally {
    await page.setViewportSize(original);
  }
}
async function schoolEntry(context, width) {
  const page = await context.newPage();
  try {
    const response = await page.goto(new URL('../', base).href, { waitUntil: 'domcontentloaded' });
    assert(response?.status() === 200, 'Public root returns the Python trainer');
    const link = page.getByRole('link', { name: 'Онлайн-школа AI PATH', exact: true });
    assert(await link.isVisible(), `Public root exposes the school entrance at ${width}px`);
    assert(await link.getAttribute('href') === 'ai-path/', 'School entrance uses a project-relative URL');
    const bounds = await link.boundingBox();
    assert(bounds && bounds.height >= 44, 'School entrance provides a 44px touch target');
    await noOverflow(page, 'Python trainer school entrance ' + width);
    await page.screenshot({ path: `${artifacts}/ai-path-${width}-root-school-entry.png`, animations: 'disabled' });
    await link.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(base);
    await page.locator('#programList .program').first().waitFor({ state: 'attached' });
    assert(sameMembers(await ids(page.locator('#programList .program')), programIds), 'Root school entrance opens all 15 programs');
  } finally {
    await page.close();
  }
}
async function compactLanding(page, width) {
  const libraryIds = ['projects-library', 'creative-library', 'design-library', 'parent-library', 'resource-library'];
  const initial = await page.evaluate(() => {
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const menu = document.querySelector('#programs').getBoundingClientRect();
    const selector = document.querySelector('#selector').getBoundingClientRect();
    return { height: document.documentElement.scrollHeight, menuGap: menu.top - hero.bottom, quizAfterMenu: selector.top >= menu.bottom - 1,
      disclosures: [...document.querySelectorAll('details.content-disclosure:not(#programs)')].map(el => ({ id: el.id, open: el.open })),
      menuSection: document.querySelector('#programs').tagName === 'SECTION' };
  });
  assert(initial.menuSection && await page.locator('#programs').isVisible(), 'Fresh landing exposes the program menu as a visible section');
  assert(await page.locator('#programList .program:visible').count() === 6 && await page.locator('#showAllPrograms').isVisible(), 'Fresh menu starts with six programs and a clear action to see the rest');
  assert(sameMembers(initial.disclosures.map(item => item.id), libraryIds) && initial.disclosures.every(item => !item.open), 'Fresh landing keeps all five detail libraries closed');
  assert(initial.menuGap >= -1 && initial.menuGap < 100 && initial.quizAfterMenu, 'Visual program menu immediately follows the hero, with the guided quiz after it');
  assert(await page.locator('.first-project-section, #navigatorStart').count() === 0, 'Fresh landing removes the duplicate Navigator offer while keeping its old URL anchor');
  assert(await page.locator('#portfolio').isVisible() && await page.locator('#web-studio').isVisible(), 'Compact portfolio overview remains visible without opening a library');
  if (width === 1440) assert(initial.height < 8500, `Fresh desktop landing fits the compact page budget with its six-card menu: ${initial.height}px`);
  await page.locator('#programList .program:visible img').evaluateAll(images => Promise.all(images.map(async image => {
    image.loading = 'eager'; await image.decode();
  })));
  await noOverflow(page, 'compact landing ' + width);
  await page.screenshot({ path: `${artifacts}/ai-path-${width}-landing-overview.png`, fullPage: true, animations: 'disabled' });
  const library = page.locator('#projects-library');
  const librarySummary = library.locator(':scope > summary');
  await librarySummary.focus();
  await page.keyboard.press('Space');
  assert(await library.evaluate(el => el.open) && await page.locator('#examples').isVisible(), 'Project library summary opens its retained cases by keyboard');
  await page.keyboard.press('Enter');
  assert(!(await library.evaluate(el => el.open)) && await librarySummary.evaluate(el => document.activeElement === el), 'Project library closes by keyboard without losing focus');

  const route = '?program=build&level=basic&pace=light';
  await page.goto(base + route + '#selected', { waitUntil: 'domcontentloaded' });
  await selected(page, 'build');
  const before = new URL(page.url());
  assert(await page.locator('#programList .program:visible').count() === 6, 'Deep-linked plan keeps the menu at its compact six-card starting state');
  await page.locator('#hero-programs').focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('#programs').isVisible(), 'Keyboard hero entrance reaches the visible program menu');
  assert(new URL(page.url()).search === before.search && new URL(page.url()).hash === '#programs', 'Catalogue fragment navigation preserves the selected program, level and pace');
  const nextProgram = await page.locator('#programList .program[hidden]').first().getAttribute('data-program');
  await page.locator('#showAllPrograms').focus();
  await page.keyboard.press('Enter');
  assert(sameMembers(await ids(page.locator('#programList .program:visible')), programIds), 'Keyboard show-all action exposes every one of the 15 programs');
  assert(await page.locator(`#programList [data-program="${nextProgram}"]`).evaluate(el => document.activeElement === el), 'Show-all moves keyboard focus to the first newly available program');
  await revealTarget(page, '#website-programs');
  const websitePrograms = await page.locator('#website-programs').innerText();
  assert(/AI Разработчик/.test(websitePrograms) && /8 недел/.test(websitePrograms) && /Design Lab/.test(websitePrograms) && /6 недел/.test(websitePrograms) && /Vibe Coding|Вайбкодинг/.test(websitePrograms) && /16 недел/.test(websitePrograms), 'Adjacent website-program comparison explains all three distinct schedules');

  await page.goto(base + route + '#result-gallery', { waitUntil: 'domcontentloaded' });
  assert(await page.locator('#parent-library').evaluate(el => el.open) && await page.locator('#result-gallery').isVisible(), 'Existing parent-gallery deep link opens its containing library');
  assert(!(await page.locator('#creative-library').evaluate(el => el.open)), 'Unrelated creative library remains closed on a parent deep link');
  await page.locator('#result-gallery a.parent-example[href="#comics"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(base + route + '#comics');
  assert(await page.locator('#creative-library').evaluate(el => el.open) && await page.locator('#comics').isVisible(), 'Same-page keyboard link opens the nested comics section');
  assert(new URL(page.url()).search === before.search, 'Nested project navigation preserves the chosen plan parameters');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForURL(base + route + '#result-gallery');
  assert(await page.locator('#parent-library').evaluate(el => el.open) && await page.locator('#result-gallery').isVisible(), 'Browser Back restores the originating parent-gallery fragment');
  await page.goto(base + route + '#furniture', { waitUntil: 'domcontentloaded' });
  assert(await page.locator('#creative-library').evaluate(el => el.open) && await page.locator('#furniture').isVisible(), 'Existing furniture deep link opens its containing library');
  assert(new URL(page.url()).search === before.search, 'Furniture deep link preserves program, level and pace');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#programList .program').first().waitFor({ state: 'attached' });
}
async function catalogPresentation(page, width) {
  await revealTarget(page, '#programList');
  if (await page.locator('#showAllPrograms').isVisible()) await page.locator('#showAllPrograms').click();
  await page.locator('#programList img').evaluateAll(images => Promise.all(images.map(async image => {
    image.loading = 'eager'; await image.decode();
  })));
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
      source: covers[0]?.getAttribute('src'), decoded: covers.every(img => img.complete && img.naturalWidth > 0),
      category: card.querySelector('.program-category')?.textContent.trim(),
      provenance: card.querySelector('.program-cover-note')?.textContent.trim(),
      role: card.querySelector('.program-role')?.textContent.trim(),
      result: card.querySelector('.program-result.program-outcome')?.textContent.trim(),
      resultLabel: card.querySelector('.program-outcome-label')?.textContent.trim(),
      skill: card.querySelector('.program-skill')?.textContent.trim(),
      body: Boolean(body), clipped,
      indexedCover: card.querySelector('.program-cover-index[aria-hidden="true"]')?.textContent.trim().length > 0,
      nestedActions: card.querySelectorAll('button, a, input, select, textarea, [tabindex]').length };
  }));
  assert(sameMembers(report.map(card => card.id), programIds), 'Visual menu preserves all 15 distinct programs');
  assert(new Set(report.map(card => card.source)).size === programIds.length, 'Every program has its own illustration');
  for (const card of report) {
    assert(card.covers === 1 && card.alt, `Program has one cover with an explicit alternative-text decision: ${card.id}`);
    assert(card.source === `assets/program-menu-v1/${card.id}.webp` && card.decoded, `Program illustration loads from its own local WebP: ${card.id}`);
    assert(card.provenance === 'AI-иллюстрация' && card.category?.length > 3, `Illustration names its category and is not presented as a project screenshot: ${card.id}`);
    assert(card.indexedCover && /^Попробуешь роль\s+\S/.test(card.role || '') && card.role.length > 20, `Program has a numbered cover and a readable exploratory role at ${width}px: ${card.id}`);
    assert(/^Практика\s+\S/.test(card.skill || ''), `Skill label is separated from its content for accessible reading: ${card.id}`);
    assert(card.resultLabel === 'Создашь' && card.result?.length > 12 && card.skill?.length > 12 && card.result !== card.skill, `Program separately explains what the visitor will make and practise: ${card.id}`);
    assert(card.body && card.clipped.length === 0, `Program text fits its card at ${width}px: ${card.id} ${JSON.stringify(card.clipped)}`);
    assert(card.nestedActions === 0, `Program remains one keyboard action without nested controls: ${card.id}`);
  }
  await noOverflow(page, 'visual catalog ' + width);
  // Capture the expanded catalogue with decoded covers and without sticky chrome.
  await page.locator('#programList').screenshot({ path: `${artifacts}/ai-path-${width}-catalog.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
}
async function catalogSearch(page, width) {
  await revealTarget(page, '#programList');
  const search = page.locator('#programSearch');
  const clear = page.locator('#clearProgramSearch');
  const empty = page.locator('#catalogEmpty');
  const visibleCards = page.locator('#programList .program:visible');
  const routeBefore = page.url();
  const selectedBefore = await ids(page.locator('#programList .program[aria-pressed="true"]'));
  assert(await search.getAttribute('type') === 'search', 'Program menu exposes a native search input');
  assert(await search.evaluate(el => Boolean(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'))), 'Program search has an accessible name');
  assert(await clear.evaluate(el => el.tagName === 'BUTTON' && el.type === 'button'), 'Clear search uses a native button');
  assert(await page.locator('#catalogCount').getAttribute('aria-live') === 'polite', 'Program count changes are announced without interrupting the visitor');

  async function resultsMatch(expected, label) {
    const actual = await ids(visibleCards);
    assert(sameMembers(actual, expected), `${label}: ${actual.join(', ')}`);
    assert((await page.locator('#catalogCount').innerText()).includes(`${expected.length} из 15`), `Visible count agrees with ${label}`);
    assert(await empty.isVisible() === (expected.length === 0), `Empty-state visibility agrees with ${label}`);
    assert(await page.locator('#programList .program').count() === programIds.length, 'Searching and filtering never removes or duplicates a program');
  }

  await page.locator('#catalogFilters [data-filter="all"]').click();
  await search.fill('  aMaZoN kDp  ');
  await resultsMatch(['books'], 'Search ignores case and surrounding spaces');
  await page.locator('#catalogFilters [data-filter="build"]').click();
  await resultsMatch([], 'Category and search combine instead of silently replacing one another');
  await clear.focus();
  await page.keyboard.press('Enter');
  assert(await search.inputValue() === '' && await search.evaluate(el => document.activeElement === el), 'Keyboard clear empties the query and restores search focus');
  await resultsMatch(groups.build, 'Clearing search preserves the chosen category');

  await search.fill('нет такой программы 987654321');
  await resultsMatch([], 'Unknown query gives an honest empty state');
  const reset = empty.getByRole('button');
  assert(await reset.count() === 1, 'Empty state offers one clear reset action');
  await reset.focus();
  await page.keyboard.press('Space');
  assert(await search.inputValue() === '' && await page.locator('#catalogFilters [data-filter="all"]').getAttribute('aria-pressed') === 'true', 'Empty-state reset clears both query and category');
  await resultsMatch(programIds, 'Reset restores all 15 programs');

  const role = (await page.locator('#programList [data-program="furniture"] .program-role').innerText()).replace(/^Попробуешь роль\s*:?\s*/, '').trim();
  await search.fill(role);
  assert((await ids(visibleCards)).includes('furniture'), 'Menu can be searched by a program role as well as its name');
  await search.fill('монтаж');
  assert((await ids(visibleCards)).includes('create'), 'Menu search finds a practical skill in the video program');
  await search.fill('сайт');
  await resultsMatch(['build', 'designlab', 'vibe'], 'Website search brings the three relevant programs together');
  await page.locator('#programList .program:visible img').evaluateAll(images => Promise.all(images.map(async image => {
    image.loading = 'eager'; await image.decode();
  })));
  await noOverflow(page, 'three website program cards ' + width);
  await page.locator('#programs').screenshot({ path: `${artifacts}/ai-path-${width}-program-menu-web.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
  await clear.click();
  if (await page.locator('#showAllPrograms').isVisible()) await page.locator('#showAllPrograms').click();
  await resultsMatch(programIds, 'Full menu remains reachable after searching');
  assert(page.url() === routeBefore && sameMembers(await ids(page.locator('#programList .program[aria-pressed="true"]')), selectedBefore), 'Browsing menu results does not rewrite the committed program or shared URL');
  await noOverflow(page, 'menu search and filters ' + width);
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
  await page.locator('#selected').waitFor({ state: 'visible' });
  assert(await page.locator('#selected').isVisible(), `Selected route is visible: ${id}`);
  assert(new URL(page.url()).searchParams.get('program') === id, `URL preserves explicit selection: ${id}`);
  assert((await page.locator('#selTitle').innerText()).trim().length > 0, 'Selected program has a title');
  assert((await page.locator('#selRequirement').innerText()).trim().length > 0, 'Selected route states its starting level');
  for (const selector of ['#selPaceNote', '#selFirstTask', '#selOutcome']) {
    assert((await page.locator(selector).innerText()).trim().length > 12, `Selected route explains ${selector}`);
  }
  assert((await page.locator('#selFit').innerText()).trim().length > 20, `Selected program explains who should choose it: ${id}`);
  const readiness = page.locator('#selected-readiness');
  assert(await readiness.evaluate(el => el.tagName === 'DETAILS'), 'Readiness and scope use a native disclosure');
  const criteria = (await page.locator('#selReadiness > li').allTextContents()).map(text => text.trim());
  assert(criteria.length === 2 && criteria.every(text => text.length > 20) && new Set(criteria).size === 2, `Selected program has two readable, distinct readiness criteria: ${id}`);
  const core = (await page.locator('#selCore').textContent()).trim();
  const extra = (await page.locator('#selExtra').textContent()).trim();
  assert(core.length > 20 && extra.length > 20 && core !== extra, `Selected program distinguishes core work from optional extensions: ${id}`);
  const visual = await page.locator('.selection-visual').evaluate(el => ({
    visible: [...el.querySelectorAll('figure')].filter(figure => figure.getClientRects().length).map(figure => figure.id),
    projectSrc: el.querySelector('#selImage').getAttribute('src'), projectAlt: el.querySelector('#selImage').alt,
    projectCaption: el.querySelector('#selImageCaption').textContent.trim(),
    conceptSrc: el.querySelector('#selConceptImage').getAttribute('src'), conceptAlt: el.querySelector('#selConceptImage').alt,
    conceptCaption: el.querySelector('#selConcept figcaption').textContent.trim()
  }));
  if (id === 'designlab') {
    assert(visual.visible.length === 0, 'Design Lab replaces the duplicate hero image with its model-and-plan panel');
    assert(await page.locator('#program3d').isVisible(), '3D scene is visible inside the selected program');
    assert((await page.locator('#program3dPoster').getAttribute('src')).includes('-3d-preview.png'), 'Selected program uses an actual rendered-model poster');
  } else if (projectPreviewSources[id]) {
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
    assert(!summary.includes((await page.locator(selector).innerText()).trim()), `Curriculum summary does not repeat the selected ${selector}: ${id}`);
  }
}
async function curriculumPresentation(page, width, id) {
  const links = await page.locator('nav.plan-nav a').evaluateAll(elements => elements.map(el => el.getAttribute('href')));
  assert(links.join('|') === '#selected-result|#selected-curriculum|#start', 'Plan navigation exposes result, curriculum and contact in order');
  for (const target of links) assert(await page.locator(target).count() === 1 && await page.locator(target).isVisible(), `Plan navigation has one visible destination: ${target}`);
  assert(await page.locator('#selected-result #selOutcome').count() === 1, 'Result link leads to the current learning outcome');
  const curriculum = page.locator('#selected-curriculum');
  assert(await curriculum.evaluate(el => el.tagName === 'DETAILS'), 'Curriculum uses a native disclosure');
  assert(await page.locator('#selKit').evaluate(el => el.closest('details')?.classList.contains('takeaway-box')), 'Deliverable files remain available in their own native disclosure');
  if (await curriculum.evaluate(el => el.open)) await curriculum.locator(':scope > summary').click();
  const routeBefore = new URL(page.url());
  await page.locator('nav.plan-nav a[href="#selected-curriculum"]').focus();
  await page.keyboard.press('Enter');
  const routeAfter = new URL(page.url());
  assert(routeAfter.search === routeBefore.search && routeAfter.hash === '#selected-curriculum', 'Curriculum navigation preserves the program URL and opens its section');
  assert(await curriculum.evaluate(el => el.open && document.activeElement === el), 'Curriculum navigation opens and focuses its destination');
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
  await assertUncovered(page.locator('#curriculumTitle'), 'Curriculum heading after plan navigation');
  await noOverflow(page, 'selected curriculum ' + id + ' ' + width);
  await page.locator('#selected-curriculum').screenshot({ path: `${artifacts}/ai-path-${width}-${id}-curriculum.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
}
async function resizeSelectedViewport(page, width, height) {
  await page.setViewportSize({ width, height });
  const snapshot = await page.evaluate(() => {
    const columns = selector => getComputedStyle(document.querySelector(selector)).gridTemplateColumns.trim().split(/\s+/).length;
    return { innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
      media760: matchMedia('(max-width: 760px)').matches, media360: matchMedia('(max-width: 360px)').matches,
      heroColumns: columns('.selection-hero'), stepsColumns: columns('#selSteps') };
  });
  if (snapshot.scrollWidth > snapshot.innerWidth + 1) console.log('AI_PATH_RESIZE_SNAPSHOT', JSON.stringify({ targetWidth: width, ...snapshot }));
  // The viewport command may resolve before its media-query layout reaches a rendering frame.
  // Readiness deliberately does not depend on scrollWidth: real overflow must still fail below.
  await page.waitForFunction(({ width, expected }) => {
    const columns = selector => {
      const style = getComputedStyle(document.querySelector(selector));
      return style.display === 'grid' ? style.gridTemplateColumns.trim().split(/\s+/).length : 0;
    };
    return innerWidth === width && document.documentElement.clientWidth === width &&
      matchMedia('(max-width: 760px)').matches === (width <= 760) &&
      matchMedia('(max-width: 360px)').matches === (width <= 360) &&
      columns('.selection-hero') === expected && columns('#selSteps') === expected;
  }, { width, expected: width <= 760 ? 1 : 2 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));
}
async function selectedBreakpointChecks(page) {
  await page.goto(base + '?program=vibe&level=project&pace=deep#selected', { waitUntil: 'domcontentloaded' });
  await selected(page, 'vibe');
  await revealTarget(page, '#selected-curriculum');
  for (const width of [759, 760, 761, 1019, 1020, 1021]) {
    await resizeSelectedViewport(page, width, 900);
    const columns = await page.evaluate(() => ['.selection-hero', '#selSteps'].map(selector => {
      const style = getComputedStyle(document.querySelector(selector));
      return style.display === 'grid' ? style.gridTemplateColumns.trim().split(/\s+/).length : 0;
    }));
    const expected = width <= 760 ? 1 : 2;
    assert(columns.every(count => count === expected), `Selected hero and curriculum keep ${expected} readable columns at ${width}px: ${columns.join(', ')}`);
    await noOverflow(page, 'selected breakpoint ' + width);
    if (width === 760 || width === 761) await screenshot(page, width, 'selected-boundary', '#selected');
  }
  await resizeSelectedViewport(page, 320, 740);
  await noOverflow(page, 'selected restored 320');
  await page.screenshot({ path: `${artifacts}/ai-path-320-selected-restored.png`, fullPage: true, animations: 'disabled' });
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
    fit: (await page.locator('#selFit').textContent()).trim(),
    core: (await page.locator('#selCore').textContent()).trim(),
    extra: (await page.locator('#selExtra').textContent()).trim(),
    readiness: (await page.locator('#selReadiness li').allTextContents()).map(text => text.trim()),
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
  await revealTarget(page, '#programList');
  if (await page.locator('#showAllPrograms').isVisible()) await page.locator('#showAllPrograms').click();
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
async function comparison(page, { width, captureStage } = {}) {
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
  for (const label of ['Выбирай, если', 'Результат', 'Срок', 'Для старта', 'Твоё время, не требование курса', 'Стоимость']) {
    assert(rowLabels.some(text => text.includes(label)), `Comparison explains ${label}`);
  }
  for (const row of await page.locator('#comparisonTable tbody tr').all()) {
    assert(await row.locator('td').count() === candidates.length, 'Each comparison row covers every candidate');
  }
  await noOverflow(page, 'comparison open');
  if (captureStage) {
    await page.locator('#comparison').screenshot({ path: `${artifacts}/ai-path-${width}-${captureStage}.png`, animations: 'disabled',
      style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
  }
  await page.locator('#compareToggle').click();
  assert(!(await page.locator('#comparison').isVisible()), 'Comparison can be collapsed');
}
async function websiteChoice(page, width) {
  // Start with the visitor's goal rather than an existing program URL or catalogue filter.
  await page.locator('#goals [data-goal="build"]').click();
  assert(sameMembers(await ids(page.locator('#programList .program')), programIds), 'Website goal retains the complete 15-program catalogue');
  const choices = page.locator('#interests [data-interest]');
  const interests = await choices.evaluateAll(elements => elements.map(el => el.dataset.interest));
  assert(sameMembers(interests, groups.build) && await page.locator('#interests [data-interest="designlab"]').isVisible(), 'Site, program or game goal exposes Design Lab alongside development and Vibe Coding');
  await page.locator('#interests [data-interest="build"]').click();
  await page.locator('#levels [data-level="basic"]').click();
  await page.locator('#paces [data-pace="light"]').click();
  await page.locator('#showRecommendation').focus();
  await page.keyboard.press('Enter');
  await selected(page, 'build');
  const webPrograms = ['build', 'designlab', 'vibe'];
  assert((await ids(page.locator('#recommendationList .program'))).join('|') === webPrograms.join('|'), 'A website goal compares exactly development, interactive design and Vibe Coding');
  const names = await page.locator('#recommendationList .program .program-name').allTextContents();
  assert(names.length === 3 && new Set(names.map(text => text.trim())).size === 3, 'Three website choices keep distinct program names');
  await comparison(page, { width, captureStage: 'website-choice-comparison' });

  for (const [index, id] of webPrograms.entries()) {
    await page.locator(`#recommendationList [data-program="${id}"]`).focus();
    await page.keyboard.press('Enter');
    await selected(page, id);
    assert((await page.locator('#selTitle').innerText()).trim() === names[index].trim(), `Website comparison switches to the named plan: ${id}`);
    const route = new URL(page.url());
    assert(route.searchParams.get('level') === 'basic' && route.searchParams.get('pace') === 'light' && route.hash === '#selected', `Website choice retains experience and desired weekly time: ${id}`);
    assert((await ids(page.locator('#recommendationList .program'))).join('|') === webPrograms.join('|'), 'Switching a website plan keeps the other two comparison choices available');
    await revealTarget(page, '#selected-readiness');
    assert(await page.locator('#selReadiness').isVisible() && await page.locator('#selCore').isVisible() && await page.locator('#selExtra').isVisible(), `Readiness and core versus optional scope are readable together: ${id}`);
    await noOverflow(page, 'website readiness ' + id + ' ' + width);
    if (width === 390) {
      await page.locator('#selected-readiness').screenshot({ path: `${artifacts}/ai-path-${width}-website-readiness-${id}.png`, animations: 'disabled',
        style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
    }
    if (width === 1440) await downloadPlan(page, width, 'website-choice', { minPages: id === 'vibe' ? 2 : 1 });
  }
}
async function preservedContent(page, complete) {
  assert(await page.locator('#examples article.project').count() === 7, 'Seven source-backed project cards');
  assert(await page.locator('#comics article.project').count() === 3, 'Three existing comic examples');
  assert(await page.locator('#furniture article.project').count() === 3, 'Three source-backed LUMA 01 views');
  assert(await page.locator('#frontier .frontier-card').count() === 4, 'Four official lab pathways');
  assert(await page.locator('#frontier a[href*="openai.com"]').count() >= 1, 'Official OpenAI route linked');
  assert(await page.locator('#frontier a[href*="anthropic.com"]').count() >= 1, 'Official Anthropic route linked');
  assert(await page.locator('#nbGrid .nb-card').count() === 6, 'Featured ML notebooks visible');
  await revealTarget(page, '#research');
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
    await revealTarget(page, button);
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
  await revealTarget(page, '#vibe');
  const courseLink = page.locator('#vibe').getByRole('link', { name: 'Изучить 16 модулей ↗', exact: true });
  assert(await courseLink.count() === 1, 'Course linked from home');
  await schoolLink(page, courseLink, 'vibe-coding/', committedContext(page.url()), 'Detailed Vibe curriculum link');
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

async function program3dContract(page, width) {
  // Renderer pixels are verified by the two scene repositories. This fixture isolates
  // the school's cross-origin iframe lifecycle without depending on a remote deploy.
  const pattern = /https:\/\/safal207\.github\.io\/(room-control-studio|quiet-hours-sanctuary)\/preview\.html/;
  const handler = route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><p>Preview message fixture</p><script>window.lastActive=null;addEventListener("message",e=>{if(e.data?.type==="designlab:visibility")window.lastActive=e.data.active});</script></body></html>' });
  await page.route(pattern, handler);
  const panel = page.locator('#program3d');
  assert(await panel.isVisible(), 'Selected Design Lab includes 3D panel');
  assert(await panel.locator('iframe').count() === 0, '3D is not loaded before a deliberate action');
  await panel.locator('[data-program-scene="temple"]').click();
  assert((await panel.locator('#program3dPoster').getAttribute('src')).endsWith('temple-3d-preview.png'), 'Temple tab changes real model poster');
  assert(await panel.locator('iframe').count() === 0, 'Tab selection alone does not load WebGL');
  for (const [milestone, week] of [['light',4],['interaction',5],['publish',6]]) {
    await panel.locator(`[data-program-milestone="${milestone}"]`).click();
    assert(await panel.locator('#program3dWeek').getAttribute('href') === '#designlab-week-' + week, 'Preview task connects to the correct curriculum week');
    assert(await page.locator('#designlab-week-' + week).count() === 1, 'Preview week has a real plan destination');
  }
  const frameNavigation = page.waitForEvent('framenavigated', {predicate: candidate => pattern.test(candidate.url()), timeout:15000});
  await panel.locator('#program3dPlay').click();
  assert(await panel.locator('iframe').count() === 1, 'Only one frame is created');
  if (width <= 760) assert((await panel.locator('#program3dStage').boundingBox()).height >= 380, 'Live mobile 3D reserves space for controls');
  assert(await panel.locator('iframe').getAttribute('referrerpolicy') === 'strict-origin', 'Preview can identify its parent origin for readiness');
  const child = await frameNavigation;
  assert(Boolean(child), 'Preview frame loaded');
  await child.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    window.dispatchEvent(new MessageEvent('message', { origin:'https://untrusted.example', source:document.querySelector('#program3dFrame iframe').contentWindow, data:{type:'designlab:preview-ready'} }));
    window.dispatchEvent(new MessageEvent('message', { origin:'https://safal207.github.io', source:window, data:{type:'designlab:preview-ready'} }));
  });
  assert(await panel.locator('#program3dStage').getAttribute('aria-busy') === 'true', 'Wrong origin or source cannot mark a preview ready');
  await child.evaluate(() => parent.postMessage({type:'designlab:preview-ready'}, '*'));
  await page.waitForFunction(() => document.querySelector('#program3dFrame').classList.contains('is-ready'));
  assert(await panel.locator('#program3dPoster').isHidden(), 'Verified child readiness reveals the model');
  await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
  // Chromium may suspend rAF inside an offscreen iframe; poll the received
  // visibility message with a timer so the assertion does not depend on rAF.
  await child.waitForFunction(() => window.lastActive === false, null, {polling:100});
  await panel.locator('#program3dStage').scrollIntoViewIfNeeded();
  await child.waitForFunction(() => window.lastActive === true, null, {polling:100});
  await child.evaluate(() => parent.postMessage({type:'designlab:preview-error'}, '*'));
  await page.waitForFunction(() => !document.querySelector('#program3dFrame iframe'));
  assert(await panel.locator('#program3dPoster').isVisible(), 'Failure restores the actual model poster');
  assert((await panel.locator('#program3dPlay').innerText()).includes('Повторить'), 'Failure has an actionable retry');
  await panel.locator('#program3dPlay').click();
  assert(await panel.locator('iframe').count() === 1, 'Retry creates a single new iframe');
  await panel.locator('[data-program-scene="temple"]').click();
  assert(await panel.locator('iframe').count() === 0, 'Switching model disposes the previous frame');
  await panel.locator('#program3dPlay').click();
  await panel.locator('#program3dStop').click();
  assert(await panel.locator('iframe').count() === 0, 'Stop cancels loading and removes the frame');
  await panel.locator('#program3dPlay').click();
  if (await page.locator('#showAllPrograms').isVisible()) await page.locator('#showAllPrograms').click();
  await page.locator('#programList [data-program="build"]').click();
  await selected(page, 'build');
  assert(await panel.isHidden() && await panel.locator('iframe').count() === 0, 'Another program restores its normal plan and disposes 3D');
  await page.locator('#programList [data-program="designlab"]').click();
  await selected(page, 'designlab');
  await panel.locator('[data-program-scene="room"]').click();
  await panel.locator('#program3dPoster').evaluate(async img => { img.loading='eager'; await img.decode(); });
  if (width <= 760) {
    const bounds = await panel.locator('#program3dStage').boundingBox();
    assert(Math.abs(bounds.width / bounds.height - 1.5) < .02, 'Mobile poster uses its natural ratio without empty bands');
  }
  await page.waitForFunction(() => !document.querySelector('#toast')?.classList.contains('show'));
  await screenshot(page, width, 'model-and-plan', '#program3d');
  await noOverflow(page, '3D model and study plan ' + width);
  await page.unroute(pattern, handler);
}

async function designLabRoute(page, width) {
  await chooseQuiz(page, { goal: 'visual', interest: 'designlab', level: 'zero' });
  await selected(page, 'designlab');
  assert((await page.locator('#selTitle').innerText()).trim() === 'Design Lab — интерактивные сайты', 'Design Lab program title');
  assert((await ids(page.locator('#recommendationList .program'))).join('|') === 'designlab|build|vibe', 'Design Lab recommends the other two website-building paths');
  assert(await page.locator('#selSteps li').count() === 6, 'Design Lab includes six learning stages');
  assert((await page.locator('#selOutcome').innerText()).includes('Один собственный'), 'Learning outcome is one student project');
  await program3dContract(page, width);
  assert(await page.locator('#design-lab article.project').count() === 4, 'Four separate teaching examples');
  const demos = await page.locator('#design-lab .design-lab-visual').evaluateAll(items => items.map(a => a.href));
  assert(demos.length === 4 && new Set(demos).size === 4, 'Teaching demo links are distinct');
  assert(await page.locator('#design-lab .design-lab-skill').count() === 4, 'Every example explains the skill taught');
  const lesson = page.locator('#transformation-lab');
  await revealTarget(page, lesson);
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

async function navigatorRoute(page, width) {
  // Navigator remains an ordinary choice, with no duplicate offer before the quiz.
  assert(await page.locator('.first-project-section, #navigatorStart').count() === 0, 'Standalone Navigator pitch is removed while its old fragment can remain');
  await chooseQuiz(page, { goal: 'build', interest: 'qa', level: 'basic', pace: 'light' });
  const previous = new URL(page.url());
  await chooseQuiz(page, { goal: 'explore', level: 'basic', pace: 'light' });
  await selected(page, 'explore');
  const current = new URL(page.url());
  for (const key of ['level', 'pace']) assert(current.searchParams.get(key) === previous.searchParams.get(key), `Navigator choice retains the chosen ${key}`);
  assert(Number.parseInt(await page.locator('#selDuration').innerText(), 10) === 4 && Number.parseInt(await page.locator('#selMeetings').innerText(), 10) === 4, 'Navigator details retain the four-week, four-meeting base plan');
  assert(/2 пробных/.test(await page.locator('#selOutcome').innerText()) && await page.locator('#selSteps li').count() === 4, 'Navigator retains its two trials and four learning steps');
  await revealTarget(page, '#programList');
  await page.locator('#programList [data-program="explore"]').focus();
  await page.keyboard.press('Enter');
  await selected(page, 'explore');
  assert(await page.locator('#selTitle').evaluate(el => document.activeElement === el), 'Catalogue Navigator choice focuses its plan');
  for (const key of ['level', 'pace']) assert(new URL(page.url()).searchParams.get(key) === previous.searchParams.get(key), `Catalogue Navigator choice retains ${key}`);
  await screenshot(page, width, 'navigator-plan', '#selected');
  await contact(page);
  if (width === 1440) await downloadPlan(page, width, 'navigator');
}
async function mentorExample(page, width) {
  const photo = page.locator('img#mentorPhoto');
  assert(await photo.count() === 1 && await photo.getAttribute('src') === 'assets/mentor/alexey-safonov-solvery.webp', 'Author profile uses the supplied Solvery photograph');
  assert((await photo.getAttribute('alt') || '').includes('Алексей Сафонов'), 'Author photograph has a meaningful name');
  await photo.evaluate(async image => { image.loading = 'eager'; await image.decode(); });
  assert(await photo.evaluate(image => image.naturalWidth === 425 && image.naturalHeight === 531), 'Author photograph decodes at its original portrait dimensions');
  assert(await page.locator('#mentor a[href="https://solvery.io/ru/mentor/5295"]').count() >= 1, 'Author card retains its verified Solvery profile link');
  await page.locator('#mentor .mentor-card').screenshot({ path: `${artifacts}/ai-path-${width}-mentor-profile.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
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

async function parentResultGallery(page, width) {
  await revealTarget(page, '#result-gallery');
  const gallery = page.locator('#result-gallery');
  const cards = gallery.locator('article.parent-result');
  assert(await cards.count() === 3, 'Parent gallery offers three concrete project results');
  const note = (await page.locator('#parentGalleryNote').innerText()).trim();
  assert(/AI-концепц/i.test(note) && /возможн.{0,20}проект/i.test(note) && /примеры для разбора/i.test(note), 'Gallery identifies future-project concept covers and the separate teaching examples');
  const examples = {
    space: 'https://safal207.github.io/room-control-studio/',
    comics: '#comics', build: 'examples/my-cosmos.html'
  };
  const previous = new URL(page.url());
  for (const [id, href] of Object.entries(examples)) {
    const card = gallery.locator(`article.parent-result[data-result="${id}"]`);
    assert(await card.count() === 1, `Parent gallery has one result for ${id}`);
    const cover = card.locator('.parent-result-cover img');
    assert(await cover.count() === 1 && await cover.getAttribute('src') === `assets/parent-gallery/${id}.webp`, `Parent result has its own cover: ${id}`);
    await cover.scrollIntoViewIfNeeded();
    await cover.evaluate(img => img.decode());
    assert(await cover.evaluate(img => img.naturalWidth > 0 && img.naturalHeight > 0), `Parent result cover actually decodes: ${id}`);
    const badge = card.locator('.parent-concept-badge');
    assert(await badge.isVisible() && /AI-концепц/i.test(await badge.innerText()) && /AI-концепц/i.test(await cover.getAttribute('alt')), `Illustrative cover carries visible and accessible provenance: ${id}`);
    if (id === 'build') await schoolLink(page, card.locator('a.parent-example'), href, committedContext(page.url()), 'Parent website example');
    else assert(await card.locator('a.parent-example').getAttribute('href') === href, `Parent result links to its real example: ${id}`);
    const process = card.locator('details.parent-process');
    const summary = process.locator('summary');
    assert(await process.locator('ol > li').count() === 3, `Parent result explains three planned project steps: ${id}`);
    if (await process.evaluate(el => el.open)) await summary.click();
    await summary.focus();
    await page.keyboard.press('Enter');
    assert(await process.evaluate(el => el.open), `Parent project process opens by keyboard: ${id}`);
    assert(await process.locator('ol').isVisible(), `Parent can read the project process: ${id}`);
    await noOverflow(page, 'parent process expanded ' + id + ' ' + width);
    await page.keyboard.press('Space');
    assert(!(await process.evaluate(el => el.open)) && await summary.evaluate(el => document.activeElement === el), `Parent process closes while retaining keyboard focus: ${id}`);
  }
  await noOverflow(page, 'parent result gallery ' + width);
  await gallery.screenshot({ path: `${artifacts}/ai-path-${width}-parent-results.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
  for (const id of Object.keys(examples)) {
    const button = gallery.locator(`article.parent-result[data-result="${id}"] button[data-start-track="${id}"]`);
    assert(await button.count() === 1, `Parent result has a native program action: ${id}`);
    await button.click();
    await selected(page, id);
    assert(await page.locator('#selTitle').evaluate(el => document.activeElement === el), `Parent result selection focuses its plan: ${id}`);
    for (const key of ['level', 'pace']) assert(new URL(page.url()).searchParams.get(key) === previous.searchParams.get(key), `Parent result choice retains the chosen ${key}: ${id}`);
  }
}

async function cosmosExample(page, width) {
  const response = await page.goto(base + 'examples/my-cosmos.html', { waitUntil: 'domcontentloaded' });
  assert(response?.status() === 200, 'Interactive website example is available locally');
  assert(await page.locator('#planet-picker button[data-planet]').count() === 4, 'Space website offers four planet choices');
  const descriptions = new Set();
  const facts = new Set();
  const graphics = new Set();
  const names = { mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', neptune: 'Нептун' };
  for (const [id, name] of Object.entries(names)) {
    const button = page.locator(`#planet-picker button[data-planet="${id}"]`);
    await button.focus();
    await page.keyboard.press('Enter');
    assert(await button.getAttribute('aria-pressed') === 'true' && await page.locator('#planet-picker button[aria-pressed="true"]').count() === 1, `One planet is selected by keyboard: ${id}`);
    assert((await page.locator('#planet-title').innerText()).trim() === name, `Planet choice changes the displayed title: ${id}`);
    assert(await page.locator('#planet-visual').getAttribute('data-planet') === id && (await page.locator('#planet-visual').getAttribute('aria-label')).includes(name), `Planet visual and accessible name match its choice: ${id}`);
    const description = (await page.locator('#planet-description').innerText()).trim();
    const fact = `${(await page.locator('#planet-fact-value').innerText()).trim()} ${(await page.locator('#planet-fact-label').innerText()).trim()}`;
    assert(description.length > 25 && fact.length > 5, `Planet choice has readable explanation and a concrete fact: ${id}`);
    descriptions.add(description);
    facts.add(fact);
    graphics.add(await page.locator('#planet-visual .planet').evaluate(el => getComputedStyle(el).backgroundImage));
    assert(await page.locator('#planet-visual .rings').evaluate(el => getComputedStyle(el).display !== 'none') === (id === 'saturn'), `Only Saturn has visible rings: ${id}`);
    const source = new URL(await page.locator('#planet-source').getAttribute('href'));
    assert(source.protocol === 'https:' && source.hostname.endsWith('.nasa.gov') && source.pathname.includes(id), `Planet facts link to the matching primary NASA source: ${id}`);
    await noOverflow(page, 'space website ' + id + ' ' + width);
  }
  assert(descriptions.size === 4 && facts.size === 4 && graphics.size === 4, 'All four planet choices change the actual graphic, explanation and fact');
  const theme = page.locator('#cosmos-theme');
  const before = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  const previousPressed = await theme.getAttribute('aria-pressed');
  await theme.click();
  assert(await theme.getAttribute('aria-pressed') !== previousPressed, 'Theme button exposes its changed state');
  assert(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor) !== before, 'Theme button changes the actual page background');
  await noOverflow(page, 'space website changed theme ' + width);
  await page.screenshot({ path: `${artifacts}/ai-path-${width}-cosmos-example.png`, fullPage: true, animations: 'disabled' });
  assert(await page.locator('#cosmos-gallery-link').getAttribute('href') === '../#result-gallery', 'Example offers a direct return to the result gallery');
  const program = page.locator('#cosmos-program-link');
  assert(await program.getAttribute('href') === '../?program=build&level=zero&pace=balanced#selected', 'Example returns to its corresponding beginner program');
  await program.click();
  await selected(page, 'build');
  assert(new URL(page.url()).searchParams.get('level') === 'zero' && new URL(page.url()).searchParams.get('pace') === 'balanced', 'Example program link restores the intended beginner route');
}

async function studioImages(page, label) {
  const images = await page.locator('img').evaluateAll(elements => Promise.all(elements.map(async image => {
    try {
      image.loading = 'eager';
      await image.decode();
      return { source: image.getAttribute('src'), decoded: image.naturalWidth > 0 && image.naturalHeight > 0, alt: image.hasAttribute('alt') };
    } catch {
      return { source: image.getAttribute('src'), decoded: false, alt: image.hasAttribute('alt') };
    }
  })));
  assert(images.length > 0 && images.every(image => image.decoded && image.alt), `Studio imagery decodes and has explicit alternative text: ${label} ${JSON.stringify(images.filter(image => !image.decoded || !image.alt))}`);
}

async function studioVectorDownload(page, selector, filename, expectedText) {
  const event = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await event;
  assert(download.suggestedFilename() === filename, 'Studio export names the current interactive choices: ' + filename);
  const path = `${artifacts}/${filename}`;
  await download.saveAs(path);
  assert(await download.failure() === null, 'Studio vector export downloads successfully: ' + filename);
  const contents = await readFile(path, 'utf8');
  const vector = await page.evaluate(source => {
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
    return { valid: doc.documentElement.localName === 'svg' && !doc.querySelector('parsererror'),
      shapes: doc.querySelectorAll('path, circle, rect, polyline').length,
      text: doc.documentElement.textContent.replace(/\s+/g, ' ').trim() };
  }, contents);
  assert(vector.valid && vector.shapes >= 2, 'Studio download is an actual SVG graphic: ' + filename);
  for (const text of expectedText) assert(vector.text.includes(text), `Studio export preserves the visible selection "${text}": ${filename}`);
}

async function floraInteraction(page, width) {
  const backgrounds = new Set();
  const palettes = new Set();
  const briefs = new Set();
  for (const mood of ['calm', 'bold', 'sunny']) {
    const button = page.locator(`#flora-mood-${mood}`);
    await button.focus();
    await page.keyboard.press(mood === 'sunny' ? 'Space' : 'Enter');
    assert(await page.locator('body').getAttribute('data-mood') === mood && await button.getAttribute('aria-pressed') === 'true', `FLORA exposes the mood selected by keyboard: ${mood}`);
    assert(await page.locator('#flora-moods button[aria-pressed="true"]').count() === 1, 'FLORA exposes exactly one selected mood');
    backgrounds.add(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor));
    palettes.add(await page.locator('#flora-live-swatches i').evaluateAll(elements => elements.map(el => getComputedStyle(el).backgroundColor).join('|')));
    briefs.add((await page.locator('#flora-brief').innerText()).trim());
    await noOverflow(page, 'FLORA mood ' + mood + ' ' + width);
  }
  assert(backgrounds.size === 3 && palettes.size === 3 && briefs.size === 3, 'FLORA moods change the rendered page, palette and written visual brief');
  const before = await page.locator('.botanical-drawing').evaluate(el => getComputedStyle(el).transform);
  await page.locator('#flora-size-space').focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('#flora-moodboard').getAttribute('data-size') === 'space' && await page.locator('#flora-size-space').getAttribute('aria-pressed') === 'true', 'FLORA scale choice updates the board and accessible state');
  assert(await page.locator('#flora-sizes button[aria-pressed="true"]').count() === 1, 'FLORA exposes exactly one selected scale');
  assert(await page.locator('.botanical-drawing').evaluate(el => getComputedStyle(el).transform) !== before && (await page.locator('#flora-brief').innerText()).includes('больше воздуха'), 'FLORA scale changes actual artwork and composition instructions');
  await studioVectorDownload(page, '#flora-download', 'flora-sunny-space-moodboard.svg', ['Тёплый полдень', 'Композиция для пространства / 02', 'Учебный проект AI PATH']);
  assert((await page.locator('#flora-download-status').innerText()).includes('Тёплый полдень'), 'FLORA announces the exported visual brief');
  await noOverflow(page, 'FLORA completed moodboard ' + width);
  await page.locator('#flora-builder').screenshot({ path: `${artifacts}/ai-path-${width}-studio-flora-interaction.png`, animations: 'disabled' });
}

async function dalInteraction(page, width) {
  const paths = new Set();
  const stops = new Set();
  const routes = { shore: ['Наедине с озером', '1 день', '6 км'], forest: ['Там, где пахнет хвоей', '2 дня', '14 км'], height: ['Чуть ближе к небу', '3 дня', '24 км'] };
  for (const [id, expected] of Object.entries(routes)) {
    const button = page.locator(`#dal-route-picker button[data-route="${id}"]`);
    await button.focus();
    await page.keyboard.press(id === 'forest' ? 'Space' : 'Enter');
    assert(await button.getAttribute('aria-pressed') === 'true' && await page.locator('#dal-route-picker button[aria-pressed="true"]').count() === 1, `ДАЛЬ exposes one route selected by keyboard: ${id}`);
    assert(await page.locator('#dal-route-detail').getAttribute('data-active-route') === id, `ДАЛЬ displays the selected route detail: ${id}`);
    for (const [index, selector] of ['#dal-route-title', '#dal-route-days', '#dal-route-distance'].entries()) {
      assert((await page.locator(selector).innerText()).trim() === expected[index], `ДАЛЬ updates the actual itinerary fact ${selector}: ${id}`);
    }
    paths.add(await page.locator('#dal-route-path').getAttribute('d'));
    assert(await page.locator('#dal-route-points circle').count() === 3 && await page.locator('#dal-route-stops li').count() === 3, `ДАЛЬ renders the route's three map points and narrative stops: ${id}`);
    stops.add((await page.locator('#dal-route-stops').innerText()).trim());
    await noOverflow(page, 'ДАЛЬ route ' + id + ' ' + width);
  }
  assert(paths.size === 3 && stops.size === 3, 'ДАЛЬ choices change the actual drawn route and its stops');
  await studioVectorDownload(page, '#dal-export', 'dal-height.svg', ['Чуть ближе к небу', '24 км']);
  assert((await page.locator('#dal-export-status').innerText()).includes('Чуть ближе к небу'), 'ДАЛЬ announces the exported current route');
  await noOverflow(page, 'ДАЛЬ exported route ' + width);
  await page.locator('#dal-routes').screenshot({ path: `${artifacts}/ai-path-${width}-studio-dal-interaction.png`, animations: 'disabled' });
}

async function moriInteraction(page, width) {
  const panel = page.locator('#mori-story');
  const initialDescription = (await page.locator('#story-description').innerText()).trim();
  const initialBackground = await page.locator('#story-visual').evaluate(el => getComputedStyle(el).backgroundImage);
  await page.locator('#mori-start').focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('#story-title').evaluate(el => document.activeElement === el), 'MORI start gives keyboard focus to the actual story');
  const paths = [
    { choices: [1, 0, 0], route: 'river', companion: 'светлячок', ending: 'grove', title: 'Сад маленьких огней' },
    { choices: [0, 1, 1], route: 'roots', companion: 'листом', ending: 'beacon', title: 'Маяк для тех, кто заблудился' }
  ];
  const backgrounds = new Set([initialBackground]);
  const endings = new Set();
  for (const story of paths) {
    assert(await panel.getAttribute('data-chapter') === '1' && await panel.getAttribute('data-ending') === '', 'MORI starts each path from a clear first chapter');
    for (const [index, choice] of story.choices.entries()) {
      const descriptionBefore = (await page.locator('#story-description').innerText()).trim();
      await page.locator(`#story-choices button[data-choice="${choice}"]`).focus();
      await page.keyboard.press(index === 1 ? 'Space' : 'Enter');
      assert(await page.locator('#story-title').evaluate(el => document.activeElement === el), 'MORI choice focuses the newly displayed chapter');
      assert((await page.locator('#story-description').innerText()).trim() !== descriptionBefore, 'MORI choice changes the actual story text');
      if (index === 0) {
        assert(await panel.getAttribute('data-chapter') === '2' && await page.locator('#story-visual').getAttribute('data-scene') === story.route, `MORI keeps the chosen ${story.route} path in its second chapter`);
        backgrounds.add(await page.locator('#story-visual').evaluate(el => getComputedStyle(el).backgroundImage));
      } else if (index === 1) {
        assert(await panel.getAttribute('data-chapter') === '3' && (await page.locator('#story-description').innerText()).toLowerCase().includes(story.companion), 'MORI carries the companion or protective leaf into its final choice');
      }
      await noOverflow(page, 'MORI chapter ' + index + ' ' + story.ending + ' ' + width);
    }
    assert(await panel.getAttribute('data-ending') === story.ending && await page.locator('#story-ending').isVisible() && await page.locator('#story-choices').isHidden(), `MORI reaches a finished, distinct ending: ${story.ending}`);
    assert((await page.locator('#ending-title').innerText()).trim() === story.title && await page.locator('#story-visual').getAttribute('data-scene') === story.ending, 'MORI ending updates the visible conclusion and scene');
    endings.add((await page.locator('#ending-description').innerText()).trim());
    await panel.screenshot({ path: `${artifacts}/ai-path-${width}-studio-mori-${story.ending}.png`, animations: 'disabled' });
    await page.locator('#story-restart').focus();
    await page.keyboard.press('Enter');
    assert(await panel.getAttribute('data-chapter') === '1' && await panel.getAttribute('data-ending') === '' && await page.locator('#story-ending').isHidden() && await page.locator('#story-choices').isVisible(), 'MORI restart clears the old ending and restores both choices');
    assert(await page.locator('#story-title').evaluate(el => document.activeElement === el) && (await page.locator('#story-description').innerText()).trim() === initialDescription, 'MORI restart restores the original story and accessible focus');
    assert(await page.locator('#story-visual').evaluate(el => getComputedStyle(el).backgroundImage) === initialBackground, 'MORI restart restores the original scene');
  }
  assert(backgrounds.size === 3 && endings.size === 2, 'MORI supports two genuinely different routes and conclusions');
}

async function studioPortfolio(page, width) {
  const previous = page.url();
  const context = committedContext(previous);
  const teaser = page.locator('#web-studio');
  assert(await teaser.count() === 1, 'Design Lab has one web-studio portfolio entrance');
  const portfolioLink = teaser.getByRole('link', { name: 'Открыть портфолио ↗', exact: true });
  assert(await portfolioLink.count() === 1, 'School teaser links directly to the portfolio');
  const portfolioURL = await schoolLink(page, portfolioLink, 'studio.html', context, 'School portfolio entrance');
  const projects = ['flora', 'mori', 'dal'];
  assert(await teaser.locator('img, a[href^="examples/"]').count() === 0, 'School portfolio entrance does not duplicate case previews');
  assert(await teaser.evaluate(el => el.closest('#portfolio') !== null), 'Portfolio entrance stays in the visible overview');
  await noOverflow(page, 'web studio teaser ' + width);
  await teaser.screenshot({ path: `${artifacts}/ai-path-${width}-web-studio-teaser.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
  await portfolioLink.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(portfolioURL);
  const provenance = page.locator('#studio-provenance');
  assert(await provenance.isVisible() && /учебн/i.test(await provenance.innerText()) && /ИИ|AI[- ](?:концепц|иллюстрац|натюрморт|визуал|generated)/i.test(await provenance.innerText()), 'Portfolio visibly identifies teaching examples and AI imagery');
  assert(await page.locator('article[data-studio-project]').count() === projects.length, 'Portfolio contains three distinct worked examples');
  for (const id of projects) {
    const card = page.locator(`article[data-studio-project="${id}"]`);
    assert(await card.count() === 1, `Portfolio has one project card: ${id}`);
    await schoolLink(page, card.locator('a[data-studio-demo]'), `examples/${id}.html`, context, `Portfolio ${id} demo`);
    await schoolLink(page, card.locator('a[data-studio-program]'), '#selected', { ...context, program: 'designlab' }, `Portfolio ${id} program`);
  }
  await studioImages(page, 'portfolio ' + width);
  await noOverflow(page, 'studio portfolio ' + width);
  await page.screenshot({ path: `${artifacts}/ai-path-${width}-web-studio-portfolio.png`, fullPage: true, animations: 'disabled' });
  await schoolLink(page, page.locator('#studio-start'), '#selected', { ...context, program: 'designlab' }, 'Portfolio closing Design Lab action');
  await schoolLink(page, page.locator('#studio-build'), '#selected', { ...context, program: 'build' }, 'Portfolio closing website-development action');
  assert(/6 недел/.test(await page.locator('#studio-start').innerText()) && /8 недел/.test(await page.locator('#studio-build').innerText()), 'Closing learning choices explicitly distinguish their six- and eight-week schedules');
  if (width === 390) {
    for (const action of ['article[data-studio-project="flora"] a[data-studio-program]', '#studio-start', '#studio-build']) {
      await page.locator(action).click();
      await selected(page, action === '#studio-build' ? 'build' : 'designlab');
      assert(new URL(page.url()).pathname === new URL(base).pathname, 'Portfolio program action actually returns to the school chooser');
      await page.goto(base + 'studio.html', { waitUntil: 'domcontentloaded' });
    }
  }
  for (const id of projects) {
    const response = await page.goto(base + `examples/${id}.html`, { waitUntil: 'domcontentloaded' });
    assert(response?.status() === 200, `Portfolio example is available locally: ${id}`);
    const note = page.locator('#demo-provenance');
    assert(await note.isVisible() && /учебн/i.test(await note.innerText()) && /ИИ|AI[- ](?:концепц|иллюстрац|натюрморт|визуал|generated)/i.test(await note.innerText()), `Example visibly states teaching and imagery provenance: ${id}`);
    assert(await page.locator('a[data-demo-back]').getAttribute('href') === '../studio.html', `Example offers a direct portfolio return: ${id}`);
    assert(await page.locator('a[data-demo-program]').getAttribute('href') === '../?program=designlab&level=zero&pace=balanced#selected', `Example links to the matching beginner program: ${id}`);
    await studioImages(page, id + ' ' + width);
    await noOverflow(page, 'studio demo ' + id + ' ' + width);
    await page.screenshot({ path: `${artifacts}/ai-path-${width}-studio-${id}.png`, fullPage: true, animations: 'disabled' });
    if (width === 390) {
      if (id === 'flora') await floraInteraction(page, width);
      if (id === 'mori') await moriInteraction(page, width);
      if (id === 'dal') await dalInteraction(page, width);
      await page.locator('a[data-demo-program]').click();
      await selected(page, 'designlab');
      const programURL = new URL(page.url());
      assert(programURL.searchParams.get('level') === 'zero' && programURL.searchParams.get('pace') === 'balanced', `Example opens the intended beginner program in the school: ${id}`);
      await page.goto(base + `examples/${id}.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('a[data-demo-back]').focus();
      await page.keyboard.press('Enter');
      await page.waitForURL(new URL('studio.html', base).href);
      assert(await page.locator('#studio-provenance').isVisible(), `Keyboard return restores the real portfolio: ${id}`);
    }
  }
  await page.goto(previous, { waitUntil: 'domcontentloaded' });
  const program = new URL(previous).searchParams.get('program');
  if (program) await selected(page, program);
}

async function landingSites(page, width) {
  const previous = page.url();
  const programHref = './?program=build&level=zero&pace=balanced#selected';
  const expectedPrices = { classic: [345, 360], sweet: [460, 485], fresh: [510, 535], lunch: [395, 415] };
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const learning = page.locator('#landing-learning');
  assert(await learning.count() === 1 && /лендинги и сайты/i.test(await learning.innerText()), 'School has a clear landing-page learning card');
  assert(await learning.locator('#landing-learn').getAttribute('href') === programHref, 'Landing card uses the existing beginner development program');
  await learning.scrollIntoViewIfNeeded();
  assert(await learning.locator('img').count() === 0, 'Landing learning entrance avoids repeating the café case image');
  assert(await learning.evaluate(el => el.closest('#portfolio') !== null), 'Landing learning entrance belongs to the compact portfolio overview');
  await noOverflow(page, 'landing learning card ' + width);
  await learning.screenshot({ path: `${artifacts}/ai-path-${width}-landing-learning.png`, animations: 'disabled',
    style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
  await learning.locator('#landing-learn').focus();
  await page.keyboard.press('Enter');
  await selected(page, 'build');
  assert(/лендинг/i.test(await page.locator('#selOutcome').innerText()), 'Selected course actually teaches the landing-page deliverable');
  await page.goto(base + 'studio.html#services', { waitUntil: 'domcontentloaded' });
  assert(/продающие лендинги и сайты/i.test(await page.locator('#servicesTitle').innerText()), 'Portfolio explicitly offers landing-page and website development');
  const contactURL = new URL(await page.locator('#site-service-contact').getAttribute('href'));
  assert(contactURL.protocol === 'mailto:' && contactURL.pathname === 'safal0645@gmail.com', 'Development enquiry opens a draft to the existing public contact');
  assert(await page.locator('#studio-contact').getAttribute('href') === contactURL.href, 'Portfolio closing development enquiry keeps the same contact and draft as its opening service');
  assert(await page.locator('#site-service-learn').getAttribute('href') === programHref && await page.locator('#pocitel-learn').getAttribute('href') === programHref, 'Service and café case use the matching course');
  await page.locator('#services').screenshot({ path: `${artifacts}/ai-path-${width}-site-services.png`, animations: 'disabled' });
  await page.locator('#pocitel-demo').click();
  await page.waitForURL(new URL('examples/pocitel.html', base).href);
  await studioImages(page, 'Pocitel ' + width);
  assert(/учебный макет/i.test(await page.locator('#demo-provenance').innerText()), 'Café site visibly identifies its educational status');
  assert(await page.locator('.slow').count() === 0 && await page.locator('section.lesson').count() === 1, 'Café page has one teaching explanation instead of two repeated promotional sections');
  assert(await page.locator('#lesson ol > li').count() === 4, 'Single café teaching section retains all four steps from task to publication');
  assert(await page.locator('#demo-provenance details.source-menu').count() === 1, 'Original menu and its source prices remain available with the consolidated provenance');
  assert(await page.locator('[data-demo-program]').getAttribute('href') === '../?program=build&level=zero&pace=balanced#selected', 'Café example links to website development rather than a different course');
  await noOverflow(page, 'Pocitel initial ' + width);
  await page.screenshot({ path: `${artifacts}/ai-path-${width}-pocitel-hero.png`, animations: 'disabled' });
  for (const [id, [price, original]] of Object.entries(expectedPrices)) {
    const card = page.locator(`[data-id="${id}"]`);
    assert(Number(await card.getAttribute('data-price')) === price && Number(await card.getAttribute('data-base')) === original, `Pocitel preserves source-menu prices for ${id}`);
    assert((await card.locator('.price').innerText()).includes(`Выгода ${original - price} TL`), `Pocitel displays the correct saving for ${id}`);
  }
  assert(await page.locator('#pairing-cards .pairing:visible').count() === 4 && await page.locator('#selection-total').innerText() === '0 TL', 'Pocitel starts with four choices and an empty total');
  const first = page.locator('[data-pairing="classic"]');
  await first.focus();
  await page.keyboard.press('Space');
  assert(await first.getAttribute('aria-pressed') === 'true' && await page.locator('#selection-total').innerText() === '345 TL', 'Keyboard choice updates its pressed state and total');
  await page.locator('[data-filter="fresh"]').click();
  assert(await page.locator('#pairing-cards .pairing:visible').count() === 1 && await page.locator('#selection-total').innerText() === '345 TL', 'Filtering preserves a selected item that is temporarily hidden');
  await page.locator('[data-pairing="fresh"]').click();
  assert(await page.locator('#selection-total').innerText() === '855 TL' && await page.locator('#selection-saving').innerText() === 'Выгода: 40 TL', 'Selection correctly sums combinations and source-menu savings');
  await noOverflow(page, 'Pocitel filtered selection ' + width);
  await page.locator('#pairings').screenshot({ path: `${artifacts}/ai-path-${width}-pocitel-filtered.png`, animations: 'disabled' });
  await page.locator('[data-filter="all"]').click();
  await page.locator('[data-pairing="sweet"]').click();
  await page.locator('[data-pairing="lunch"]').click();
  assert(await page.locator('#selection-total').innerText() === '1710 TL' && await page.locator('#selection-saving').innerText() === 'Выгода: 85 TL', 'All four combinations have the correct total and saving');
  await page.locator('[data-pairing="sweet"]').click();
  assert(await page.locator('#selection-total').innerText() === '1250 TL' && await page.locator('#selection-list li').count() === 3, 'Removing an item updates the selection and amount without duplicates');
  await page.locator('#clear-selection').click();
  assert(await page.locator('#selection-total').innerText() === '0 TL' && await page.locator('#clear-selection').isDisabled() && await page.locator('#selection-empty').isVisible(), 'Clear restores the empty state');
  assert(await first.evaluate(element => document.activeElement === element), 'Clear returns keyboard focus to an available choice');
  assert(await page.locator('form').count() === 0, 'Educational selection does not include a customer order submission form');
  await page.locator('#pairings').screenshot({ path: `${artifacts}/ai-path-${width}-pocitel-menu.png`, animations: 'disabled' });
  await page.locator('[data-demo-program]').click();
  await selected(page, 'build');
  await page.goto(previous, { waitUntil: 'domcontentloaded' });
  const program = new URL(previous).searchParams.get('program');
  if (program) await selected(page, program);
}

async function neuralNetworks(page, width) {
  const previous = page.url();
  const sourceRoot = 'https://github.com/safal207/students/blob/d848e04c8f8d6e3e8e42ce15fbd98c00612e0e17/';
  const projects = [
    ['start', 3, /MLP.*NumPy/], ['photo', 4, /CNN.*Conv2D/], ['text', 4, /Embedding.*LSTM/],
    ['objects', 4, /SSDLite.*MobileNetV2/], ['audio', 4, /признаки.*Dense/], ['tuning', 4, /MLP.*Keras Tuner/]
  ];
  await page.goto(base + '#research', { waitUntil: 'domcontentloaded' });
  const entrance = page.locator('#research a[data-neural-entry]');
  assert(await entrance.count() === 1 && await entrance.getAttribute('href') === 'neural-networks.html', 'Research section offers one direct entrance to the visual neural-network guide');
  const entryBounds = await entrance.boundingBox();
  assert(entryBounds && entryBounds.height >= 44, 'Neural-network entrance has a usable touch target');
  await entrance.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(new URL('neural-networks.html', base).href);
  await page.locator('#nn-choice-grid [data-nn-project]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const board = page.locator('#nn-readable-board');
  const details = page.locator('#nn-selected-project');
  const scene = page.locator('#nn-arch-scene');
  assert(await board.isVisible() && await page.locator('main').count() === 1 && await page.locator('h1').count() === 1, 'Visual guide loads as a standalone customer page');
  assert(await page.locator('[role="tab"], .nn-backlog').count() === 0, 'Public guide contains no internal preparation board');
  const cards = page.locator('#nn-choice-grid [data-nn-project]');
  assert(sameMembers(await cards.evaluateAll(elements => elements.map(el => el.dataset.nnProject)), projects.map(([id]) => id)), 'Guide exposes the six distinct project choices');
  assert(await details.getAttribute('data-selected-project') === 'start', 'Guide initially explains the beginner model');
  for (const card of await cards.all()) {
    assert(await card.evaluate(el => el.tagName === 'BUTTON' && el.type === 'button' && el.querySelectorAll('button, a, input, select, textarea').length === 0), 'Each model card is one native keyboard action');
    assert(await card.locator('.nn-mini-arch[aria-hidden="true"] svg').count() === 1, 'Every model card has a schematic thumbnail alongside its text label');
  }
  await noOverflow(page, 'neural guide cards ' + width);
  await page.locator('#nn-choice-grid').screenshot({ path: `${artifacts}/ai-path-${width}-neural-cards.png`, animations: 'disabled' });
  const sources = new Set();
  let stageChecks = 0;
  for (const [id, stageCount, modelPattern] of projects) {
    const card = page.locator(`#nn-choice-grid [data-nn-project="${id}"]`);
    await card.focus();
    await page.keyboard.press('Enter');
    assert(await details.getAttribute('data-selected-project') === id, `Keyboard selection opens the intended neural project: ${id}`);
    assert((await page.locator('#nn-choice-grid [aria-pressed="true"]').evaluateAll(elements => elements.map(el => el.dataset.nnProject))).join('|') === id, `Exactly one model card is selected: ${id}`);
    assert(modelPattern.test(await page.locator('#nn-model-title').innerText()), `Selected project names its actual model family: ${id}`);
    assert(await page.locator('#nn-steps li').count() === 4 && await page.locator('#nn-artifacts li').count() === 3, `Selected project explains four teaching steps and three concrete artifacts: ${id}`);
    for (const selector of ['#nn-input-detail', '#nn-model-detail', '#nn-output-detail', '#nn-limit', '#nn-readiness']) {
      assert((await page.locator(selector).innerText()).trim().length > 25, `Project gives a useful explanation of ${selector}: ${id}`);
    }
    const readiness = await page.locator('#nn-readiness').innerText();
    assert(id === 'start' ? /выполнен в CI/.test(readiness) : /архив/i.test(readiness), `Readiness distinguishes the executed starter from historical source examples: ${id}`);
    const source = page.locator('#nn-source-link');
    const href = await source.getAttribute('href');
    assert(href.startsWith(sourceRoot) && href.endsWith('.ipynb'), `Project source is a pinned notebook rather than a mutable branch: ${id}`);
    assert(await source.getAttribute('target') === '_blank' && /noopener/.test(await source.getAttribute('rel')), `Notebook source opens safely without replacing the lesson: ${id}`);
    sources.add(href);
    assert((await page.locator('#nn-arch-note').innerText()).includes('не запуск нейросети'), `Diagram is explicitly an explanation rather than simulated model execution: ${id}`);
    const controls = page.locator('#nn-arch-controls [data-arch-step]');
    assert(await controls.count() === stageCount && await scene.locator('svg[role="img"] > g[data-arch-stage]').count() === stageCount, `Architecture and controls contain the expected processing stages: ${id}`);
    assert((await scene.locator('svg > title').textContent()).includes(await page.locator('#nn-model-title').innerText()), `Architecture has an accessible model-specific description: ${id}`);
    assert(await controls.first().getAttribute('aria-pressed') === 'true', `Switching project resets its explanation to the first stage: ${id}`);
    const captions = new Set();
    for (let stage = 0; stage < stageCount; stage += 1) {
      const control = controls.nth(stage);
      const bounds = await control.boundingBox();
      assert(bounds && bounds.height >= 44, `Architecture control remains touchable: ${id}/${stage}`);
      await control.focus();
      await page.keyboard.press(stage % 2 ? 'Space' : 'Enter');
      assert(await control.evaluate(el => document.activeElement === el), `Stage explanation preserves keyboard focus: ${id}/${stage}`);
      const active = await page.locator('#nn-arch-controls [aria-pressed="true"]').evaluateAll(elements => elements.map(el => el.dataset.archStep));
      assert(active.join('|') === String(stage), `Exactly the activated architecture stage is selected: ${id}/${stage}`);
      const caption = (await page.locator('#nn-arch-caption').innerText()).trim();
      assert(caption.startsWith(`${stage + 1}. `) && caption.length > 45, `Activated stage explains its operation in words: ${id}/${stage}`);
      captions.add(caption);
      stageChecks += 1;
    }
    assert(captions.size === stageCount, `Every architecture stage has its own explanation: ${id}`);
    const geometry = await scene.locator('svg').evaluate(svg => ({
      width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height,
      nodes: [...svg.querySelectorAll(':scope > g[data-arch-stage]')].map(stage => {
        const box = stage.firstElementChild.getBBox();
        const labels = [...stage.querySelectorAll('text')].map(text => {
          const bounds = text.getBBox();
          return { text: text.textContent, left: bounds.x, right: bounds.x + bounds.width, font: parseFloat(getComputedStyle(text).fontSize) };
        });
        return { x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height, labels };
      })
    }));
    const vertical = width < 630;
    assert(geometry.nodes.every((node, index, nodes) => index === 0 || (vertical
      ? Math.abs(node.x - nodes[0].x) < 1 && node.y > nodes[index - 1].bottom
      : Math.abs(node.y - nodes[0].y) < 1 && node.x > nodes[index - 1].right)), `Architecture flows ${vertical ? 'vertically on a phone' : 'horizontally on desktop'}: ${id}`);
    assert(geometry.nodes.every(node => node.x >= 0 && node.right <= geometry.width + 1 && node.y >= 0 && node.bottom <= geometry.height + 1 &&
      node.labels.every(label => label.font >= 11 && label.left >= node.x - 1 && label.right <= node.right + 1)), `Architecture labels remain readable inside their stages: ${id} at ${width}px`);
    await noOverflow(page, `neural ${id} ${width}`);
    await details.screenshot({ path: `${artifacts}/ai-path-${width}-neural-${id}.png`, animations: 'disabled' });
  }
  assert(stageChecks === 23 && sources.size === 6, 'All 23 architecture stages work and all six source notebooks are distinct');
  if (width === 390) {
    await page.emulateMedia({ colorScheme: 'dark' });
    await details.screenshot({ path: `${artifacts}/ai-path-${width}-neural-dark.png`, animations: 'disabled' });
    await page.emulateMedia({ colorScheme: 'light' });
  }
  const backLinks = page.locator('a[data-nn-back]');
  assert(await backLinks.count() >= 1, 'Neural guide offers a return to the school archive');
  for (const back of await backLinks.all()) assert(new URL(await back.getAttribute('href'), page.url()).href === base + '#research', 'Return link preserves the school research section');
  await backLinks.first().focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(base + '#research');
  assert(await page.locator('#research a[data-neural-entry]').isVisible(), 'Keyboard return restores the real school research section');
  await page.goto(base + 'neural-networks.html', { waitUntil: 'domcontentloaded' });
  const start = page.locator('a[data-nn-start]');
  const startURL = new URL(await start.getAttribute('href'), page.url());
  assert(startURL.pathname === new URL(base).pathname && startURL.searchParams.get('program') === 'ml' && startURL.searchParams.get('level') === 'zero', 'Neural guide links to the existing ML program with beginner preparation');
  await start.focus();
  await page.keyboard.press('Enter');
  await selected(page, 'ml');
  assert((await page.locator('#selRequirement').innerText()).includes('Python'), 'ML program keeps its Python prerequisite after entering from the visual guide');
  await page.goto(previous, { waitUntil: 'domcontentloaded' });
  const program = new URL(previous).searchParams.get('program');
  if (program) await selected(page, program);
}

async function schoolNavigation(page) {
  const build = { program: 'build', level: 'basic', pace: 'light' };
  await page.goto(base + '?program=build&level=basic&pace=light#selected', { waitUntil: 'domcontentloaded' });
  await selected(page, 'build');
  await revealTarget(page, '#selRefs');
  const previewLink = page.locator('#selRefs').getByRole('link', { name: 'Pocitel: учебный лендинг ↗', exact: true });
  const previewURL = await schoolLink(page, previewLink, 'examples/pocitel.html', build, 'Selected plan café preview');
  const popupEvent = page.waitForEvent('popup');
  await previewLink.click();
  const preview = await popupEvent;
  const popupErrors = [];
  preview.on('pageerror', error => popupErrors.push(error.message));
  try {
    await preview.waitForLoadState('domcontentloaded');
    await preview.waitForURL(previewURL);
    const portfolioURL = await schoolLink(preview, preview.locator('[data-demo-back]'), 'studio.html', build, 'Café preview return');
    await preview.locator('[data-demo-back]').click();
    await preview.waitForURL(portfolioURL);
    const planURL = await schoolLink(preview, preview.locator('#studio-build'), '#selected', build, 'Portfolio return to development plan');
    await preview.locator('#studio-build').click();
    await preview.waitForURL(planURL);
    await selected(preview, 'build');
    const message = await preview.locator('#contactMessage').inputValue();
    assert(message.includes(canonicalRoute(preview)) && message.includes('есть небольшая база') && message.includes('2–3 ч'), 'Plan→preview→portfolio→plan keeps preparation, pace and the matching contact draft');
    assert(popupErrors.length === 0, 'Preview round trip has no unhandled browser errors');
  } finally {
    await preview.close();
  }

  const design = { program: 'designlab', level: 'project', pace: 'deep' };
  await page.goto(base + '?program=designlab&level=project&pace=deep#selected', { waitUntil: 'domcontentloaded' });
  await selected(page, 'designlab');
  const portfolio = page.locator('#web-studio').getByRole('link', { name: 'Открыть портфолио ↗', exact: true });
  const portfolioURL = await schoolLink(page, portfolio, 'studio.html', design, 'Design Lab portfolio');
  await portfolio.click();
  await page.waitForURL(portfolioURL);
  const demo = page.locator('[data-studio-project="flora"] [data-studio-demo]');
  const demoURL = await schoolLink(page, demo, 'examples/flora.html', design, 'Design Lab visual example');
  await demo.click();
  await page.waitForURL(demoURL);
  const plan = page.locator('[data-demo-program]');
  const planURL = await schoolLink(page, plan, '#selected', design, 'Visual example return to Design Lab');
  await plan.click();
  await page.waitForURL(planURL);
  await selected(page, 'designlab');
  assert(await page.locator('#levels [data-level="project"]').getAttribute('aria-pressed') === 'true' && await page.locator('#paces [data-pace="deep"]').getAttribute('aria-pressed') === 'true', 'Design Lab→portfolio→example→plan retains the existing project and chosen pace');
  assert((await page.locator('#contactMessage').inputValue()).includes(canonicalRoute(page)), 'Returned Design Lab contact draft uses the restored route');
  await revealTarget(page, '#website-programs');
  const switchProgram = page.locator('#website-programs').getByRole('link', { name: 'AI Разработчик', exact: true });
  const switchURL = await schoolLink(page, switchProgram, '#selected', { ...design, program: 'build' }, 'Website comparison alternative');
  await switchProgram.click();
  await page.waitForURL(switchURL);
  await selected(page, 'build');
  assert(await page.locator('#levels [data-level="project"]').getAttribute('aria-pressed') === 'true' && await page.locator('#paces [data-pace="deep"]').getAttribute('aria-pressed') === 'true', 'Static website comparison changes the program while preserving the chosen preparation and pace');
}
async function historySelection(page) {
  const buildRoute = base + '?program=build&level=basic&pace=light#selected';
  await page.goto(buildRoute, { waitUntil: 'domcontentloaded' });
  await selected(page, 'build');
  const buildTitle = (await page.locator('#selTitle').innerText()).trim();
  await page.locator('#hero-programs').click();
  await page.waitForURL(base + '?program=build&level=basic&pace=light#programs');
  await page.locator('#showAllPrograms').click();
  await page.locator('#programList [data-program="designlab"]').click();
  await selected(page, 'designlab');
  const designRoute = page.url();
  const designTitle = (await page.locator('#selTitle').innerText()).trim();
  const historyLength = await page.evaluate(() => history.length);

  async function restored(id, title, route) {
    await page.waitForURL(route);
    await selected(page, id);
    assert((await page.locator('#selTitle').innerText()).trim() === title, `Browser history restores the visible ${id} plan rather than only its URL`);
    assert((await ids(page.locator('#programList .program[aria-pressed="true"]'))).join('|') === id, `Browser history restores the selected menu card: ${id}`);
    const message = await page.locator('#contactMessage').inputValue();
    const email = new URL(await page.locator('#contactMentor').getAttribute('href'));
    assert(message.includes(title) && message.includes(canonicalRoute(page)) && email.searchParams.get('body') === message, `Restored ${id} plan and contact draft agree with the URL`);
    assert(await page.locator('#levels [data-level="basic"]').getAttribute('aria-pressed') === 'true' && await page.locator('#paces [data-pace="light"]').getAttribute('aria-pressed') === 'true', `History restores the committed preparation and pace: ${id}`);
    assert(await page.evaluate(() => history.length) === historyLength, 'Restoring a browser entry does not write another history entry');
  }

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await restored('build', buildTitle, buildRoute);
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await restored('designlab', designTitle, designRoute);

  // Changing only the fragment must leave unsubmitted answers separate from the plan.
  await page.locator('#levels [data-level="project"]').click();
  await page.locator('#paces [data-pace="deep"]').click();
  const committedMessage = await page.locator('#contactMessage').inputValue();
  await page.locator('#hero-programs').click();
  const menuRoute = page.url();
  await page.locator('.catalog-more a[href="#selector"]').click();
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForURL(menuRoute);
  assert(await page.locator('#levels [data-level="project"]').getAttribute('aria-pressed') === 'true' && await page.locator('#paces [data-pace="deep"]').getAttribute('aria-pressed') === 'true', 'Fragment-only Back preserves unsubmitted quiz answers');
  assert(await page.locator('#contactMessage').inputValue() === committedMessage && new URL(page.url()).searchParams.get('pace') === 'light', 'Fragment-only Back preserves the committed plan separately from draft answers');

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#hero-programs').click();
  await page.locator('#programList [data-program="build"]').click();
  await selected(page, 'build');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForURL(base);
  assert(await page.locator('#selected').isHidden() && await page.locator('#results').isHidden(), 'Back to a fresh entry clears the committed plan and stale recommendations');
  assert(await page.locator('#programList .program[aria-pressed="true"]').count() === 0 && await page.locator('#selectionDock').isHidden(), 'Fresh history entry clears selected menu and dock state');
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await selected(page, 'build');
}
async function desktopRegressions(page) {
  // Experience describes the current topic; unfinished changes must not rewrite a committed plan.
  await chooseQuiz(page, { goal: 'visual', interest: 'books', level: 'project', pace: 'balanced' });
  await selected(page, 'books');
  const bookURL = page.url();
  const bookTitle = await page.locator('#selTitle').innerText();
  const bookMessage = await page.locator('#contactMessage').inputValue();
  await page.locator('#goals [data-goal="research"]').click();
  assert(await page.locator('#interests [data-interest="ml"]').getAttribute('aria-pressed') === 'true', 'Switching to research starts with its ML topic');
  assert(await page.locator('#levels [data-level="zero"]').getAttribute('aria-pressed') === 'true', 'A new goal resets draft experience instead of reusing book-project experience');
  assert(/Python/.test(await page.locator('#levelHint').innerText()), 'ML experience guidance names its relevant Python preparation');
  assert(page.url() === bookURL && await page.locator('#selTitle').innerText() === bookTitle && await page.locator('#contactMessage').inputValue() === bookMessage, 'Changing the draft goal preserves the committed book title, project-level URL and contact draft');
  assert(new URL(page.url()).searchParams.get('program') === 'books' && new URL(page.url()).searchParams.get('level') === 'project', 'Book selection retains its explicit project experience until the new answers are submitted');
  await page.locator('#showRecommendation').click();
  await selected(page, 'qa');
  assert(new URL(page.url()).searchParams.get('level') === 'zero', 'Submitting the new ML goal uses its reset beginner experience and recommends preparation');
  const preparationURL = page.url();
  const preparationTitle = await page.locator('#selTitle').innerText();
  await page.locator('#levels [data-level="project"]').click();
  await page.locator('#interests [data-interest="frontier"]').click();
  assert(await page.locator('#levels [data-level="zero"]').getAttribute('aria-pressed') === 'true', 'Changing interest within the research goal also resets topic-specific experience');
  assert(page.url() === preparationURL && await page.locator('#selTitle').innerText() === preparationTitle, 'Unsubmitted interest changes preserve the committed preparation plan');

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

  await revealTarget(page, '#programList');
  for (const [filter, expected] of Object.entries(groups)) {
    await page.locator(`#catalogFilters [data-filter="${filter}"]`).click();
    assert(sameMembers(await ids(page.locator('#programList .program:visible')), expected), `Catalog ${filter} filter contains the correct programs`);
  }
  await page.locator('#catalogFilters [data-filter="all"]').click();
  if (await page.locator('#showAllPrograms').isVisible()) await page.locator('#showAllPrograms').click();
  assert(sameMembers(await ids(page.locator('#programList .program:visible')), programIds), 'All programs remain reachable in the catalog');
  await page.locator('#programList [data-program="comics"]').click();
  await selected(page, 'comics');
  assert((await page.locator('#selOutcome').innerText()).includes('PDF'), 'Comic program preserves its concrete PDF deliverable');

  for (const button of await page.locator('[data-start-track]').all()) {
    await revealTarget(page, button);
    const id = await button.getAttribute('data-start-track');
    await button.click();
    await selected(page, id);
  }
  await revealTarget(page, '#chooseAwakening');
  assert(await page.locator('#chooseAwakening').evaluate(el => el.closest('#examples') !== null), 'Awakening action is kept with its single detailed project case');
  assert(await page.locator('#examples img[src="assets/awakening.webp"]').count() === 1 && await page.locator('.awakening-grid').count() === 0, 'Awakening keeps one detailed case image instead of a second full feature');
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
    await schoolEntry(context, width);
    const page = await context.newPage();
    activePage = page;
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => { errors.push('Unexpected dialog: ' + dialog.message()); void dialog.dismiss(); });
    const response = await page.goto(base, { waitUntil: 'domcontentloaded' });
    assert(response?.status() === 200, 'Page returns HTTP 200');
    await page.locator('#programList .program').first().waitFor({ state: 'attached' });
    assert(sameMembers(await ids(page.locator('#programList .program')), programIds), 'All 15 programs are available');
    const trackNumbers = await page.locator('#programList .program').evaluateAll(cards => Object.fromEntries(cards.map(card => [card.dataset.program, card.querySelector('.n').textContent.match(/ТРЕК\s*(\d+)/)?.[1]])));
    for (const [index, id] of programIds.entries()) assert(Number(trackNumbers[id]) === index + 1, `Track number stays stable: ${id}`);
    assert(!(await page.locator('#selected').isVisible()) && !(await page.locator('#results').isVisible()), 'Fresh entry does not claim the visitor already selected a program');
    assert(!new URL(page.url()).searchParams.has('program'), 'Fresh entry does not manufacture a selection in the URL');
    assert(!(await page.locator('#selectionDock').isVisible()), 'Fresh entry has no sticky selection action');
    assert(await page.locator('#headerAction').getAttribute('href') === '#selector', 'Fresh header starts the selection quiz');
    if (width === 1440) await responsivePageBounds(page);
    await compactLanding(page, width);
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
    await revealTarget(page, '#programList');
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
    await catalogSearch(page, width);
    await booksRoute(page, width);
    await designLabRoute(page, width);
    await websiteChoice(page, width);
    await conversionFlow(page, width);
    await navigatorRoute(page, width);
    await mentorExample(page, width);
    await parentResultGallery(page, width);
    if (width === 390) await cosmosExample(page, width);
    await studioPortfolio(page, width);
    await landingSites(page, width);
    await neuralNetworks(page, width);
    if (width === 1440) {
      await schoolNavigation(page);
      await historySelection(page);
      await desktopRegressions(page);
      await pdfLoadingAndRetry(context, width);
    }
    await vibeRoute(page, width);
    if (width === 320) await selectedBreakpointChecks(page);
    await noOverflow(page, 'final');
    await page.goto(new URL('3d-checks.html', base).href, {waitUntil:'domcontentloaded'});
    assert(await page.locator('.matrix tbody tr').count() === 26, '3D verification matrix includes all 26 checks');
    await page.locator('#areaFilter').selectOption('Программа');
    assert(await page.locator('.matrix tbody tr:visible').count() === 6, 'Matrix filters by learning program');
    await page.locator('#statusFilter').selectOption('not_run');
    assert(await page.locator('#empty').isVisible(), 'Empty matrix filter explains the result');
    await page.locator('#areaFilter').selectOption('all');
    assert(await page.locator('.matrix tbody tr:visible').count() === 2, 'Physical-device and other-browser checks remain explicitly unrun');
    await page.locator('#statusFilter').selectOption('all');
    await screenshot(page, width, '3d-check-matrix');
    assert(errors.length === 0, 'No browser JavaScript errors: ' + errors.join('; '));
    console.log(`PASS ${width}x${height}: guided choice, vibe course/CRM, book route, comparison, compact Navigator choice, mentor verification example, parent result gallery${width === 390 ? ' and interactive space website' : ''}, web-studio portfolio and three examples, six neural-network architectures and 23 stage explanations, contact draft, real PDF contents/links and idea isolation, preserved gallery/notebook/lab content and responsive layout`);
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


