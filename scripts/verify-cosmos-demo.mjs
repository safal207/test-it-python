import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startSite, browserOptions } from './qa/site.mjs';

const site = await startSite();
let browser;
const output = 'artifacts/ai-path-cosmos';
try {
  browser = await chromium.launch(browserOptions);
  await mkdir(output, { recursive: true });
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], failures = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    page.on('request', request => { if (!request.url().startsWith(site.origin + '/') && !request.url().startsWith('blob:')) external.push(request.url()); });
    await page.goto(`${site.base}examples/my-cosmos.html`);
    await page.locator('#cosmos-mission').waitFor({ state: 'visible' });
    assert(await page.locator('#mission-check').isDisabled(), 'No initial answer is silently accepted');
    assert(await page.locator('#mission-export').isDisabled(), 'No empty success journal');
    assert.equal(await page.locator('#mission-log li').count(), 0);

    // An incorrect answer leaves the journal unchanged; choosing alone never passes.
    await page.locator('[data-mission-answer="saturn"]').click();
    assert.equal(await page.locator('#planet-title').innerText(), 'Сатурн');
    await page.locator('#mission-check').click();
    assert.match(await page.locator('#mission-feedback').innerText(), /не совпало/);
    assert.equal(await page.locator('#mission-log li').count(), 0);
    await page.locator('[data-mission-answer="mars"]').click();
    assert.equal(await page.locator('#mission-log li').count(), 0);
    assert.equal(await page.locator('#planet-title').innerText(), 'Марс');
    await page.locator('#mission-check').click();
    assert.equal(await page.locator('#mission-log li').count(), 1);
    assert.match(await page.locator('#mission-log').innerText(), /Проверок ответа: 2/);
    assert.equal(await page.locator('#mission-progress').getAttribute('value'), '1');
    assert.equal(await page.locator('#mission-next').evaluate(node => node === document.activeElement), true);
    const partialDownload = page.waitForEvent('download');
    await page.locator('#mission-export').click();
    const partial = await partialDownload;
    const partialText = await readFile(await partial.path(), 'utf8');
    assert.match(partialText, /Разгадано 1 из 4/);
    assert.match(partialText, /science\.nasa\.gov\/mars\/facts/);
    assert(!partialText.includes('2. Юпитер'), 'Unanswered signals are not exported as discoveries');

    for (const [planet, title] of [['jupiter', 'Юпитер'], ['neptune', 'Нептун'], ['saturn', 'Сатурн']]) {
      await page.locator('#mission-next').click();
      assert(await page.locator('#mission-check').isDisabled(), 'A new signal requires a fresh choice');
      // Existing atlas controls also work, including keyboard activation.
      await page.locator(`#planet-picker [data-planet="${planet}"]`).focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#planet-title').innerText(), title);
      await page.locator('#mission-check').click();
    }
    assert.equal(await page.locator('#mission-log li').count(), 4);
    assert(await page.locator('#mission-next').isHidden());
    assert(await page.locator('#mission-check').isHidden());
    assert.equal(await page.locator('#mission-export').evaluate(node => node === document.activeElement), true);
    assert.match(await page.locator('#mission-feedback').innerText(), /Все четыре сигнала/);
    const fullDownload = page.waitForEvent('download');
    await page.locator('#mission-export').click();
    const full = await fullDownload;
    assert.equal(full.suggestedFilename(), 'my-cosmos-expedition.txt');
    const fullText = await readFile(await full.path(), 'utf8');
    assert.match(fullText, /Разгадано 4 из 4/);
    assert.match(fullText, /4\. Сатурн/);
    assert.equal((fullText.match(/Источник:/g) || []).length, 4);
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await page.locator('#cosmos-theme').click();
      assert.equal(await page.locator('body').getAttribute('data-theme'), theme);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${width}px ${theme}: no horizontal overflow`);
      await page.locator('#cosmos-mission').screenshot({ path: `${output}/mission-${width}-${theme}.png`, animations: 'disabled' });
    }
    await page.locator('#mission-reset').click();
    assert.equal(await page.locator('#mission-log li').count(), 0);
    assert(await page.locator('#mission-export').isDisabled());
    assert(await page.locator('#mission-check').isDisabled());
    assert.equal(await page.locator('#mission-progress').getAttribute('value'), '0');
    assert.equal(await page.locator('[data-mission-answer="mars"]').evaluate(node => node === document.activeElement), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    assert.deepEqual(external, []);
    await context.close();
    console.log(`PASS Cosmos ${width}px: incorrect/correct answers, all four signals, keyboard, actual partial/full downloads, reset, both themes, no overflow or network errors`);
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${site.base}examples/my-cosmos.html`);
  assert.equal(await page.locator('#planet-title').innerText(), 'Сатурн');
  assert(await page.locator('#cosmos-mission').isHidden(), 'Nonfunctional mission controls are not shown without JavaScript');
  assert(await page.locator('noscript').isVisible());
  await context.close();
} finally {
  await browser?.close();
  await site.close();
}
