import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4187';
const base = `${origin}/ai-path/`;
const output = 'artifacts/ai-path-game-lab';
const server = spawn('python3', ['-m', 'http.server', '4187', '--bind', '127.0.0.1', '--directory', 'dist'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
try {
  await mkdir(output, { recursive: true });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Site server started');
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 740 : width === 390 ? 844 : 960 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], externalRequests = [];
    let observingTrial = false;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (observingTrial && !request.url().startsWith(origin + '/') && !request.url().startsWith('data:')) externalRequests.push(request.url()); });
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));

    await page.goto(base);
    const card = page.locator('.brand-interest').first();
    assert.equal(new URL(await card.getAttribute('href'), page.url()).pathname, '/ai-path/game-lab.html', 'The game interest opens the trial');
    await card.click();
    await page.waitForURL(/game-lab\.html/);
    observingTrial = true;
    await page.reload();
    assert.equal(await page.locator('#game-board .game-cell').count(), 25);
    assert.equal(await page.locator('#counter').innerText(), '0 / 2 ✦');
    assert.equal(await page.locator('#skill-move').innerText(), 'Ещё не пробовал');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: page fits viewport`);
    await page.screenshot({ path: `${output}/game-lab-${width}-intro.png`, animations: 'disabled' });
    for (const button of await page.locator('[data-move]').all()) {
      const box = await button.boundingBox();
      assert(box.width >= 44 && box.height >= 44, `${width}: touch control is at least 44px`);
    }
    await page.locator('[data-avatar="cat"]').click();
    await page.locator('[data-goal="3"]').click();
    assert.equal(await page.locator('[data-avatar="cat"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-goal="3"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#skill-rule').innerText(), 'Выбрано');
    assert.equal(await page.locator('#counter').innerText(), '0 / 3 ✦');
    await page.locator('#game-board').focus();
    await page.keyboard.press('ArrowUp');
    const beforeWall = await page.locator('#game-board').getAttribute('aria-label');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#game-board').getAttribute('aria-label'), beforeWall, 'Obstacle prevents movement');
    assert.match(await page.locator('#game-status').innerText(), /препятствие/);
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator('#counter').innerText(), '1 / 3 ✦');
    assert.equal(await page.locator('#skill-move').innerText(), 'Попробовал');
    for (const direction of ['right', 'right', 'right', 'right', 'up', 'up']) await page.locator(`[data-move="${direction}"]`).click();
    assert.equal(await page.locator('#counter').innerText(), '3 / 3 ✦');
    assert.match(await page.locator('#game-status').innerText(), /Получилось/);
    assert.equal(await page.locator('#skill-win').innerText(), 'Цель достигнута');
    assert.match(await page.locator('#summary-text').innerText(), /Герой: кот.*Собрано звёзд: 3 из 3.*Цель достигнута/);
    if (width === 320) {
      const feedback = await page.locator('.game-feedback').boundingBox();
      assert(feedback.width >= 180, 'The result remains readable on narrow screens');
    }
    await page.locator('#play-title').scrollIntoViewIfNeeded();
    await page.locator('.play-panel').screenshot({ path: `${output}/game-lab-${width}-win.png`, animations: 'disabled' });
    await page.locator('[data-move="down"]').click();
    assert.equal(await page.locator('#counter').innerText(), '3 / 3 ✦', 'Finished game does not move');
    await page.locator('#copy-summary').click();
    assert(await page.locator('#copy-fallback').isVisible(), 'A selectable copy fallback exists when clipboard is blocked');
    assert.equal(await page.locator('#copy-fallback').inputValue(), await page.locator('#summary-text').innerText());
    await page.locator('[data-goal="2"]').click();
    assert.equal(await page.locator('#counter').innerText(), '0 / 2 ✦', 'Changing the goal resets the run');
    assert.equal(await page.locator('#skill-win').innerText(), 'Впереди');
    assert.equal(await page.locator('#copy-fallback').isVisible(), false);
    await page.locator('[data-move="up"]').click();
    await page.locator('#reset-game').click();
    assert.equal(await page.locator('#counter').innerText(), '0 / 2 ✦');
    assert.match(await page.locator('#summary-text').innerText(), /пока не двигался/);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: no overflow after interaction`);
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, [], 'The trial itself makes no external requests');
    console.log(`PASS ${width}px: trial route, keyboard, obstacle, rule, win, report, fallback, reset, and no data requests`);
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedSummary = text; } } }));
  await page.goto(`${base}?program=game&level=basic&pace=deep#selected`);
  await page.locator('#gameTrialLink').waitFor({ state: 'visible' });
  const trial = new URL(await page.locator('#gameTrialLink').getAttribute('href'), page.url());
  assert.equal(trial.searchParams.get('program'), 'game');
  assert.equal(trial.searchParams.get('level'), 'basic');
  assert.equal(trial.searchParams.get('pace'), 'deep');
  await page.locator('#gameTrialLink').click();
  const planLink = page.locator('.lab-nav a[href*="#selected"]');
  const plan = new URL(await planLink.getAttribute('href'), page.url());
  assert.equal(plan.searchParams.get('program'), 'game');
  assert.equal(plan.searchParams.get('level'), 'basic');
  assert.equal(plan.searchParams.get('pace'), 'deep');
  await page.locator('#copy-summary').click();
  assert.match(await page.locator('#copy-status').innerText(), /Скопировано/);
  assert.equal(await page.evaluate(() => window.__copiedSummary), await page.locator('#summary-text').innerText());
  await planLink.click();
  await page.waitForURL(url => url.pathname === '/ai-path/' && url.searchParams.get('program') === 'game');
  assert.equal(new URL(page.url()).searchParams.get('level'), 'basic');
  assert.equal(new URL(page.url()).searchParams.get('pace'), 'deep');
  await page.goto(`${base}?program=build&level=zero&pace=balanced#selected`);
  assert.equal(await page.locator('#gameTrialLink').isVisible(), false, 'Unrelated courses do not show the game trial');
  await context.close();

  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noJS.newPage();
  await fallback.goto(`${base}game-lab.html`);
  assert.match(await fallback.locator('noscript').last().textContent(), /включи JavaScript/);
  assert(await fallback.getByRole('link', { name: /Посмотреть план курса/ }).isVisible());
  await noJS.close();
  console.log('PASS course plan round-trip, copy success, and no-JavaScript information fallback');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
