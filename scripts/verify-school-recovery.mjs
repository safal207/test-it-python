import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Focused regression cases for three audited recovery/accessibility defects.
// Synthetic records only; all third-party requests are blocked.
const origin = 'http://127.0.0.1:4185';
const base = origin + '/test-it-python/ai-path/';
const artifacts = 'artifacts/ai-path-qa';
const server = spawn('python3', ['-c', `
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
class PagesHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix('/test-it-python'))
ThreadingHTTPServer(('127.0.0.1', 4185), partial(PagesHandler, directory='dist')).serve_forever()
`], { stdio: ['ignore', 'pipe', 'pipe'] });
let log = '', browser, activePage;
const results = [];
for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { log = (log + String(data)).slice(-4000); });

async function ready() {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Recovery test server exited: ' + log);
    try { const response = await fetch(base); await response.arrayBuffer(); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Recovery test server did not start: ' + log);
}
async function settled(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(size.content <= size.width + 1, label + ': no horizontal page overflow: ' + JSON.stringify(size));
}
async function hasFocus(locator, label) {
  assert.ok(await locator.evaluate(element => element === document.activeElement), label);
}
async function notebookLinks(page) {
  await page.goto(base + '#research', { waitUntil: 'domcontentloaded' });
  const list = page.getByRole('list', { name: 'Ссылки на Jupyter-ноутбуки' });
  await list.waitFor({ state: 'visible' });
  assert.equal(await list.getByRole('listitem').count(), 6, 'Featured notebooks retain six list items');
  assert.equal(await list.getByRole('link').count(), 6, 'Every featured notebook retains its native accessible link role');
  for (const link of await list.getByRole('link').all()) {
    assert.match(await link.getAttribute('href'), /^https:\/\/github\.com\/safal207\/students\//, 'Notebook link retains its source');
    assert.ok((await link.innerText()).trim().length > 20, 'Notebook link has a descriptive accessible label');
  }
  await list.getByRole('link').first().focus();
  await hasFocus(list.getByRole('link').first(), 'Notebook link is keyboard focusable');
  await page.locator('#nbSeeAll').click();
  assert.equal(await list.getByRole('link').count(), 24, 'Expanded archive exposes all 24 native links');
  await noOverflow(page, 'Notebook archive');
}
async function researchRecovery(page, width) {
  const key = 'ai-path-career-research-v1';
  await page.goto(base + 'career-research.html#researchWorkspace', { waitUntil: 'domcontentloaded' });
  const downloads = [];
  const onDownload = download => downloads.push(download);
  page.on('download', onDownload);
  const title = page.locator('#vacancyTitle');
  await title.fill('Синтетическая вакансия: проверка сохранения');
  await page.locator('#vacancyDirection').selectOption('1');
  await page.locator('#vacancyUrl').fill('https://example.com/synthetic-audit-job');
  await page.locator('#vacancySkills').fill('Тестирование, SQL');
  await page.locator('#vacancyQuote').fill('Синтетический пример для регрессионной проверки.');
  assert.match(await page.locator('#workspaceStatus').innerText(), /Черновик вакансии/, 'Draft typing is announced as not yet added');
  for (const id of ['saveResearch', 'exportResearchJson', 'exportResearchMarkdown']) {
    await page.locator('#' + id).click();
    await hasFocus(page.locator('#addVacancy'), 'Blocked ' + id + ' focuses the action that completes the record');
    assert.match(await page.locator('#vacancyError').innerText(), /незавершённая вакансия/, 'Blocked action explains the unfinished record');
    assert.equal(await title.inputValue(), 'Синтетическая вакансия: проверка сохранения', 'Blocked action retains draft text');
    assert.equal(await page.evaluate(storageKey => localStorage.getItem(storageKey), key), null, 'Incomplete record does not produce a misleading saved copy');
  }
  await settled(page);
  assert.equal(downloads.length, 0, 'Neither export silently omits an unfinished vacancy');
  await page.locator('#vacancyForm').screenshot({ path: `${artifacts}/school-recovery-${width}-draft-guard.png` });
  await page.locator('#addVacancy').click();
  await page.locator('#saveResearch').click();
  let saved = await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
  assert.equal(saved.vacancies.length, 1, 'Completed record saves normally');
  await page.locator('[data-edit-vacancy]').click();
  await title.fill('Синтетическая вакансия: исправленный заголовок');
  await page.locator('#saveResearch').click();
  saved = await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
  assert.equal(saved.vacancies[0].title, 'Синтетическая вакансия: проверка сохранения', 'Blocked global save preserves the previous valid stored record');
  assert.match(await page.locator('#workspaceStatus').innerText(), /Сохранить изменения вакансии/, 'Editing guard points to the specific record save');
  await page.locator('#addVacancy').click();
  await page.locator('#saveResearch').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#vacancyList h4').innerText(), 'Синтетическая вакансия: исправленный заголовок', 'Completing the edit then saving survives reload');
  await title.fill('Неполный черновик для отмены');
  await page.locator('#cancelEdit').click();
  assert.equal(await title.inputValue(), '', 'Discarding a new draft clears only the vacancy form');
  assert.equal(await page.locator('#vacancyList [data-vacancy-id]').count(), 1, 'Discarding draft preserves the completed record');
  await hasFocus(title, 'Discard returns focus to the vacancy title');
  for (const [button, extension] of [['exportResearchJson', 'json'], ['exportResearchMarkdown', 'md']]) {
    const event = page.waitForEvent('download');
    await page.locator('#' + button).click();
    const download = await event;
    const path = `${artifacts}/school-recovery-${width}.${extension}`;
    await download.saveAs(path);
    assert.equal(await download.failure(), null, 'Completed ' + extension + ' report downloads');
    const contents = await readFile(path, 'utf8');
    assert.ok(contents.includes('Синтетическая вакансия: исправленный заголовок'), 'Export contains the completed edit');
    assert.ok(!contents.includes('Неполный черновик для отмены'), 'Discarded draft is absent from export');
  }
  await noOverflow(page, 'Research recovery');
  page.off('download', onDownload);
}
async function crmFocus(page, width) {
  await page.goto(base + 'vibe-coding/crm-demo.html', { waitUntil: 'domcontentloaded' });
  const firstStage = page.locator('#rows select').first();
  await firstStage.focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  assert.equal(await firstStage.inputValue(), 'lost', 'Keyboard changes the first CRM record to the final stage');
  await hasFocus(firstStage, 'Changing a CRM stage keeps focus on its original native select');
  assert.equal(await page.locator('#activeCount').innerText(), '3', 'Stage change updates the summary without destroying controls');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  assert.equal(await firstStage.inputValue(), 'new', 'A second keyboard change works without refocusing');
  await hasFocus(firstStage, 'Repeated stage changes preserve keyboard continuity');
  assert.equal(await page.locator('#activeCount').innerText(), '4');
  await page.locator('#rows .remove').first().focus();
  await page.keyboard.press('Enter');
  await hasFocus(page.locator('#rows .remove').first(), 'Deleting first CRM record focuses the next record action');
  assert.match(await page.locator('#rows .remove').first().getAttribute('aria-label'), /Демо-Б/, 'Deletion chooses the adjacent record');
  await page.locator('#rows .remove').last().focus();
  await page.keyboard.press('Enter');
  await hasFocus(page.locator('#rows .remove').last(), 'Deleting last CRM record focuses the previous record action');
  while (await page.locator('#rows .remove').count()) {
    await page.locator('#rows .remove').first().focus();
    await page.keyboard.press('Enter');
  }
  await hasFocus(page.locator('#leadLabel'), 'Deleting final CRM record returns focus to the creation form');
  assert.equal(await page.locator('#leadCount').innerText(), '0');
  await noOverflow(page, 'CRM empty recovery');
  await page.screenshot({ path: `${artifacts}/school-recovery-${width}-crm-empty.png`, fullPage: true });
}

try {
  await mkdir(artifacts, { recursive: true });
  await ready();
  browser = await chromium.launch({ headless: true });
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 960 }, reducedMotion: 'reduce', acceptDownloads: true });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    const page = await context.newPage(); activePage = page;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await notebookLinks(page);
    await researchRecovery(page, width);
    await crmFocus(page, width);
    assert.deepEqual(errors, [], 'No uncaught page errors during recovery workflows');
    results.push({ width, height: width < 768 ? 844 : 960, notebookLinks: 'PASS', vacancyDraftRecovery: 'PASS', crmKeyboardRecovery: 'PASS' });
    await context.close(); activePage = null;
    console.log(`PASS ${width}: notebook link semantics, unfinished vacancy save/export guards, CRM keyboard focus`);
  }
  const sourceHashes = {};
  for (const path of ['dist/ai-path/app.js', 'dist/ai-path/career-research.js', 'dist/ai-path/vibe-coding/crm-demo.html']) sourceHashes[path] = createHash('sha256').update(await readFile(path)).digest('hex');
  await writeFile(`${artifacts}/school-recovery-results.json`, JSON.stringify({ testedAt: new Date().toISOString(), sourceHashes, results, limitations: ['Chromium laboratory profiles, not physical devices.', 'Third-party requests blocked; no messages, real records or external transactions.'] }, null, 2) + '\n');
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: `${artifacts}/school-recovery-failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
