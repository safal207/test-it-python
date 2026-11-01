import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { startSite, browserOptions } from './qa/site.mjs';

const require = createRequire(import.meta.url);
const site = await startSite();
const out = 'artifacts/ai-path-commerce';
const results = [];
let browser;
async function readDownload(page, selector, name) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await pending;
  assert.equal(download.suggestedFilename(), name);
  return readFile(await download.path(), 'utf8');
}
async function inspect(page, name, width) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${name} ${width}px overflow`);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const audit = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  const row = { demo: name, width, violations: audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), manualReview: audit.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) };
  results.push(row);
  await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true, animations: 'disabled' });
  assert.deepEqual(row.violations, [], 'WCAG A/AA violations');
}
try {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch(browserOptions);
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.scrollbarGutter = 'stable'; }));
    const page = await context.newPage();
    const errors = [], failures = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    page.on('request', request => { if (!request.url().startsWith(site.origin + '/') && !request.url().startsWith('blob:')) external.push(request.url()); });

    await page.goto(site.base + 'examples/pocitel.html');
    await expect(page.locator('#selection-total')).toHaveText('0 TL');
    assert(await page.locator('#save-selection').isDisabled());
    await page.locator('#try-breakfast').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#selection-total')).toHaveText('805 TL');
    await expect(page.locator('#selection-saving')).toHaveText('Выгода: 40 TL');
    await expect(page.locator('#selection-count')).toHaveText('Сочетаний: 2');
    await expect(page.locator('#budget-status')).toContainText('осталось 95 TL');
    await expect(page.locator('[data-quantity-id="classic"][data-action="less"]')).toBeFocused();
    await page.locator('[data-quantity-id="classic"][data-action="more"]').click();
    await expect(page.locator('#selection-total')).toHaveText('1150 TL');
    await expect(page.locator('#budget-status')).toContainText('Выше бюджета на 250 TL');
    await expect(page.locator('[data-quantity-id="classic"][data-action="more"]')).toBeFocused();
    await page.locator('[data-filter="fresh"]').click();
    await expect(page.locator('.pairing:visible')).toHaveCount(1);
    await expect(page.locator('#selection-total')).toHaveText('1150 TL');
    await page.locator('#selection-budget').fill('-1');
    await expect(page.locator('#budget-status')).toContainText('Укажите бюджет');
    await page.locator('#selection-budget').fill('');
    await expect(page.locator('#budget-status')).toContainText('Укажите бюджет');
    await page.locator('#selection-budget').fill('1200');
    const breakfast = await readDownload(page, '#save-selection', 'pocitel-breakfast.txt');
    assert.match(breakfast, /Турецкая классика: 2 × 345 TL = 690 TL/);
    assert.match(breakfast, /Итого: 1150 TL/);
    assert.match(breakfast, /Выгода по предоставленному меню: 55 TL/);
    assert.match(breakfast, /осталось 50 TL/);
    assert.match(breakfast, /заказ не отправлен/);
    await inspect(page, 'pocitel', width);
    // Quantity limit and zero removal also have to update the original card.
    for (let n = 2; n < 12; n++) await page.locator('[data-quantity-id="classic"][data-action="more"]').click();
    assert(await page.locator('[data-quantity-id="classic"][data-action="more"]').isDisabled());
    for (let n = 12; n > 0; n--) await page.locator('[data-quantity-id="classic"][data-action="less"]').click();
    await expect(page.locator('#selection-total')).toHaveText('460 TL');
    await expect(page.locator('[data-pairing="classic"]')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#clear-selection').click();
    await expect(page.locator('[data-pairing="fresh"]')).toBeFocused();
    await expect(page.locator('#selection-total')).toHaveText('0 TL');
    assert(await page.locator('#save-selection').isDisabled());

    await page.goto(site.base + 'vibe-coding/crm-demo.html');
    await expect(page.locator('#leadCount')).toHaveText('5');
    await page.locator('#startScenario').click();
    await expect(page.locator('#leadCount')).toHaveText('6');
    await expect(page.locator('#activeCount')).toHaveText('5');
    await expect(page.locator('#advanceScenario')).toBeFocused();
    const activeBefore = await page.locator('#pipelineValue').innerText();
    assert.match(activeBefore.replace(/\s/g, ''), /77000/);
    for (const stage of ['qualified', 'demo', 'proposal', 'won']) {
      await page.locator('#advanceScenario').click();
      await expect(page.locator('#rows select').last()).toHaveValue(stage);
      if (stage === 'demo') await expect(page.locator('#rows .next-input').last()).toHaveValue('Зафиксировать объём и учебное предложение');
    }
    await expect(page.locator('#activeCount')).toHaveText('4');
    assert.match((await page.locator('#pipelineValue').innerText()).replace(/\s/g, ''), /52000/);
    await expect(page.locator('#scenarioExport')).toBeFocused();
    await expect(page.locator('#scenarioResult')).toContainText('не реальная продажа');
    const report = await readDownload(page, '#scenarioExport', 'crm-landing-case.txt');
    assert.match(report, /Стадия: Успех/);
    assert.match(report, /Учебный макет передан/);
    await page.locator('#filterStage').selectOption('won');
    await expect(page.locator('#rows [data-lead-id]:visible')).toHaveCount(1);
    await page.locator('#searchLeads').fill('нет-такого-проекта');
    await expect(page.locator('.filter-empty')).toContainText('Совпадений нет');
    await page.locator('#searchLeads').fill('');
    await page.locator('#filterStage').selectOption('all');
    const next = page.locator('#rows .next-input').first();
    await next.fill('=HYPERLINK("https://example.invalid")');
    await next.press('Tab');
    const csv = await readDownload(page, '#export', 'ai-path-demo-crm.csv');
    assert.match(csv, /"'=HYPERLINK\(""https:\/\/example.invalid""\)"/);
    await page.reload();
    await expect(page.locator('#rows .next-input').first()).toHaveValue('=HYPERLINK("https://example.invalid")');
    await expect(page.locator('#scenarioResult')).toBeVisible();
    const firstStage = page.locator('#rows select').first();
    await firstStage.focus();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(firstStage).toHaveValue('lost');
    await expect(firstStage).toBeFocused();
    await page.locator('#filterStage').selectOption('won');
    await inspect(page, 'crm', width);
    await page.locator('#reset').click();
    await expect(page.locator('#leadCount')).toHaveText('5');
    await expect(page.locator('#scenarioResult')).toBeHidden();
    await expect(page.locator('#filterStage')).toHaveValue('all');
    await expect(page.locator('#rows [data-lead-id]:visible')).toHaveCount(5);
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    assert.deepEqual(external, []);
    await context.close();
    console.log(`PASS commerce demos ${width}px: quantities, budget, receipts, CRM stages/filter/persistence, CSV injection, keyboard, WCAG, overflow and network`);
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser?.close();
  await site.close();
}
