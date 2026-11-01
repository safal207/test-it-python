import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startSite, browserOptions } from './qa/site.mjs';

const site = await startSite();
let browser;
const output = 'artifacts/ai-path-game-missions';
const detourPath = ['up', 'up', 'up', 'up', 'down', 'right', 'right', 'down', 'down', 'right', 'right', 'down'];
try {
  browser = await chromium.launch(browserOptions);
  await mkdir(output, { recursive: true });
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
    page.on('request', request => { if (!request.url().startsWith(site.origin + '/') && !request.url().startsWith('blob:')) external.push(request.url()); });
    const move = async path => { for (const direction of path) await page.locator(`[data-move="${direction}"]`).click(); };
    await page.goto(`${site.base}game-lab.html`);
    assert.equal(await page.locator('#game-board .wall').count(), 2, 'Original default board preserved');
    assert.equal(await page.locator('#optimal-count').innerText(), '4');
    assert(await page.locator('#export-run').isDisabled());
    await move(['left']);
    assert.equal(await page.locator('#blocked-count').innerText(), '1');
    assert.equal(await page.locator('#move-count').innerText(), '0');
    assert.equal(await page.locator('#best-count').innerText(), 'Ещё нет');
    const partialDownload = page.waitForEvent('download');
    await page.locator('#export-run').click();
    const partialText = await readFile(await (await partialDownload).path(), 'utf8');
    assert.match(partialText, /Герой пока не двигался/);
    assert.match(partialText, /1\. влево — блок или край поля/);
    assert(!partialText.includes('Цель достигнута.'), 'A failed movement is not a victory');
    await move(['up', 'up', 'right', 'right']);
    assert.equal(await page.locator('#counter').innerText(), '2 / 2 ✦');
    assert.equal(await page.locator('#best-count').innerText(), '4');
    await page.locator('#reset-game').click();
    assert.equal(await page.locator('#best-count').innerText(), '4', 'Completed best survives a same-map retry');
    assert.equal(await page.locator('#blocked-count').innerText(), '0');
    await move(['up', 'down', 'up', 'up', 'right', 'right']);
    assert.equal(await page.locator('#move-count').innerText(), '6');
    assert.equal(await page.locator('#best-count').innerText(), '4', 'Worse retry does not overwrite best');
    assert.match(await page.locator('#challenge-result').innerText(), /сократить путь на 2/);

    await page.locator('[data-board="detour"]').click();
    assert.equal(await page.locator('#game-board .wall').count(), 6);
    assert.equal(await page.locator('#optimal-count').innerText(), '12');
    assert.equal(await page.locator('#best-count').innerText(), 'Ещё нет', 'Best is separate per map and goal');
    await move(detourPath);
    assert.equal(await page.locator('#counter').innerText(), '2 / 2 ✦');
    assert.equal(await page.locator('#move-count').innerText(), '12');
    assert.match(await page.locator('#challenge-result').innerText(), /кратчайший маршрут/);
    await page.locator('[data-goal="3"]').click();
    assert.equal(await page.locator('#optimal-count').innerText(), '16');
    assert.equal(await page.locator('#best-count').innerText(), 'Ещё нет');
    await move([...detourPath, 'up', 'up', 'up', 'up']);
    assert.equal(await page.locator('#counter').innerText(), '3 / 3 ✦');
    assert.equal(await page.locator('#best-count').innerText(), '16');
    await page.locator('[data-avatar="cat"]').click();
    const download = page.waitForEvent('download');
    await page.locator('#export-run').click();
    const artifact = await download;
    assert.equal(artifact.suggestedFilename(), 'ai-path-game-experiment.txt');
    const text = await readFile(await artifact.path(), 'utf8');
    assert.match(text, /Карта: Тайный проход/);
    assert.match(text, /Сделано ходов: 16/);
    assert.match(text, /16\. вверх — ход выполнен/);
    const replayUrl = text.split('\n').find(line => line.startsWith(site.origin));
    assert(replayUrl, 'Export contains a real configuration URL');
    const second = await context.newPage();
    await second.goto(replayUrl);
    assert.equal(await second.locator('[data-board="detour"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await second.locator('[data-avatar="cat"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await second.locator('#counter').innerText(), '0 / 3 ✦', 'Shared configuration starts a new run');
    assert.equal(await second.locator('#game-status').innerText(), 'Герой готов. Собери 3 звезды!', 'Initial instruction matches the goal from the exported URL');
    assert.equal(await second.locator('#best-count').innerText(), 'Ещё нет', 'No browser storage of player records');
    await second.close();
    for (const theme of ['light', 'dark', 'matrix']) {
      await page.locator(`[data-theme-choice="${theme}"]`).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${width} ${theme}: no overflow`);
    }
    await page.locator('[data-theme-choice="light"]').click();
    await page.locator('.play-panel').screenshot({ path: `${output}/game-missions-${width}.png`, animations: 'disabled' });
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await context.close();
    console.log(`PASS game missions ${width}px: two solvable maps, goal-specific shortest paths, blocked moves, best-run comparisons, partial/full exports, replay URL, all themes`);
  }
} finally {
  await browser?.close();
  await site.close();
}
