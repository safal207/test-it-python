import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4188';
const base = `${origin}/ai-path/`;
const out = 'artifacts/ai-path-journeys';
const server = spawn('python3', ['-m', 'http.server', '4188', '--bind', '127.0.0.1', '--directory', 'dist'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
try {
  await mkdir(out, { recursive: true });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Site server started');
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 740 : width === 390 ? 844 : 960 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], failures = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (!r.url().startsWith(origin + '/') && !r.url().startsWith('data:')) external.push(r.url()); });
    page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
    await page.goto(base + 'journeys.html');
    assert.equal(await page.locator('.path-card').count(), 29);
    assert.equal(await page.locator('.path-card:not([data-group="academy"])').count(), 23);
    assert.equal(await page.locator('.path-card[data-group="academy"]').count(), 6);
    assert.match(await page.locator('#card-count').innerText(), /29 из 29/);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: no overflow`);
    await page.screenshot({ path: `${out}/journeys-${width}-intro.png`, animations:'disabled' });
    await page.locator('#age-select').selectOption('6-8');
    assert.match(await page.locator('#age-note').innerText(), /взрослым/i);
    assert.match(await page.locator('#journey-game [data-age-tip]').textContent(), /правило игры и цель героя/);
    assert.match(await page.locator('#journey-comics [data-age-tip]').textContent(), /героя и первую сцену/);
    assert.equal(new URL(page.url()).searchParams.has('age'), false, 'Age is not added to URL');
    await page.locator('[data-filter="code"]').click();
    assert.equal(await page.locator('.path-card:visible').count(), 4);
    assert.match(await page.locator('#card-count').innerText(), /4 из 29/);
    await page.locator('#journey-game summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#journey-game details').getAttribute('open'), '');
    assert.equal(await page.locator('#journey-game .path-steps li').count(), 4);
    for (const control of await page.locator('#journey-game summary, #journey-game .card-link').all()) {
      const box = await control.boundingBox();
      assert(box.height >= 44, `${width}: primary card control is at least 44px high`);
    }
    assert.match(await page.locator('#journey-game').innerText(), /доработка игры «Пробуждение»/);
    assert.match(await page.locator('#journey-game').innerText(), /Со взрослым можно придумать правило игры/);
    await page.locator('#journey-game').scrollIntoViewIfNeeded();
    await page.locator('#journey-game').screenshot({ path: `${out}/journeys-${width}-game.png`, animations:'disabled' });
    await page.locator('#age-select').selectOption('13-17');
    assert.match(await page.locator('#journey-game [data-age-tip]').textContent(), /проверить идею/);
    await page.locator('[data-filter="neural"]').click();
    assert.equal(await page.locator('.path-card:visible').count(), 8);
    assert.match(await page.locator('#journey-ml .card-requirement').innerText(), /Основы Python/);
    await page.locator('[data-filter="academy"]').click();
    assert.equal(await page.locator('.path-card:visible').count(), 6);
    assert.match(await page.locator('#journey-academy-biology').innerText(), /готовность.*уточняется/i);
    assert.equal(new URL(await page.locator('#journey-academy-biology .card-link').getAttribute('href'), page.url()).hash, '#biology');
    await page.locator('[data-filter="all"]').click();
    assert.equal(await page.locator('.path-card:visible').count(), 29, 'Changing age never hides a course');
    const allLinks = await page.locator('.path-card:not([data-group="academy"]) .card-links a:first-child').evaluateAll(links => links.map(a => ({ href: a.href, title:a.closest('article').querySelector('h3').textContent })));
    assert.equal(new Set(allLinks.map(x => new URL(x.href).searchParams.get('program'))).size, 23);
    assert(allLinks.every(x => new URL(x.href).hash === '#selected'));
    await page.reload();
    assert.equal(await page.locator('#age-select').inputValue(), 'all', 'Age choice is not stored');
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, [], 'Journey resources load');
    assert.deepEqual(external, [], 'Age and page interactions make no external requests');
    console.log(`PASS ${width}px: 29 cards, age-specific examples, filters, keyboard, requirements, privacy and screenshots`);
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}?program=game&level=basic&pace=deep#selected`);
  await page.locator('#selectedJourneyLink').click();
  await page.waitForURL(/journeys\.html/);
  assert.equal(new URL(page.url()).hash, '#journey-game');
  assert.equal(await page.locator('#journey-game details').getAttribute('open'), '');
  let target = new URL(await page.locator('#journey-game .card-link').first().getAttribute('href'), page.url());
  assert.equal(target.searchParams.get('program'), 'game');
  assert.equal(target.searchParams.get('level'), 'basic');
  assert.equal(target.searchParams.get('pace'), 'deep');
  await page.locator('#journey-game .card-link').first().click();
  assert.equal(await page.locator('#selTitle').innerText(), '3D GameDev — Пробуждение');
  await page.locator('#showAllPrograms').click();
  await page.locator('#programList [data-program="comics"]').click();
  target = new URL(await page.locator('#selectedJourneyLink').getAttribute('href'), page.url());
  assert.equal(target.searchParams.get('program'), 'comics', 'Changing course updates the journey link');
  assert.equal(target.hash, '#journey-comics');
  for (const [id, title] of [['comics','Комиксы и визуальные истории'], ['ml-python','Python и данные для нейросетей'], ['career','Выбор направления с ИИ']]) {
    await page.goto(`${base}journeys.html#journey-${id}`);
    await page.locator(`#journey-${id} .card-link`).first().click();
    assert.equal(await page.locator('#selTitle').innerText(), title, `${id}: opens matching course`);
  }
  await context.close();
  const noJS = await browser.newContext({ javaScriptEnabled:false });
  const fallback = await noJS.newPage();
  await fallback.goto(base + 'journeys.html');
  assert.match(await fallback.locator('noscript').textContent(), /каталоге школы/);
  assert(await fallback.getByRole('link', { name:'каталоге школы' }).isVisible());
  await noJS.close();
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
