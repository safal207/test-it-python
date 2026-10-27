import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { startSite, browserOptions } from './qa/site.mjs';

const out = 'artifacts/school-functional';
const catalog = { window: {} };
runInNewContext(await readFile('dist/ai-path/journey-catalog.js', 'utf8'), catalog);
const programs = catalog.window.AIPathJourneyCatalog;
assert.equal(programs.length, 23);
const site = await startSite();
let browser, context, page;
const checks = [];
try {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch(browserOptions);
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const program of programs) {
    await page.goto(`${site.base}journeys.html?program=${program.id}&level=basic&pace=deep#journey-${program.id}`);
    const link = page.locator(`#journey-${program.id} .card-link`).first();
    await expect(link).toBeVisible();
    await link.click();
    // A click may finish before the destination's scripts render the plan.
    // Assert eventual user-visible state, and still fail on an incorrect route.
    await expect(page.locator('#selected')).toBeVisible();
    await expect(page.locator('#selTitle')).toHaveText(program.name);
    assert.equal(new URL(page.url()).searchParams.get('program'), program.id);
    await expect(page.locator('#enquiryLevel')).toHaveValue('basic');
    await expect(page.locator('#enquiryPace')).toHaveValue('deep');
    await expect(page.locator('#startProgram')).toHaveText(program.name);
    await page.locator('#selectedJourneyLink').click();
    await expect(page.locator(`#journey-${program.id} details`)).toHaveAttribute('open', '');
    checks.push({ case: `journey round-trip: ${program.id}`, status: 'PASS' });
  }
  await page.goto(site.base);
  await page.locator('#showAllPrograms').click();
  await expect(page.locator('#programList [data-program]:visible')).toHaveCount(23);
  await page.locator('#programSearch').fill('комиксы');
  await expect(page.locator('#programList [data-program]:visible')).toHaveCount(1);
  await page.locator('#programList [data-program="comics"]').click();
  await expect(page.locator('#selTitle')).toHaveText('Комиксы и визуальные истории');
  await page.locator('#enquiryLevel').selectOption('project');
  await page.locator('#enquiryPace').selectOption('light');
  assert.equal(new URL(page.url()).searchParams.get('pace'), 'light');
  await page.reload();
  await expect(page.locator('#enquiryLevel')).toHaveValue('project');
  await expect(page.locator('#enquiryPace')).toHaveValue('light');
  checks.push({ case: 'catalog search, plan, parameters and reload', status: 'PASS' });
  // Untrusted URL values must not become markup or a missing program.
  await page.goto(site.base + '?program=%3Cscript%3E&level=invalid&pace=invalid#selected');
  await expect(page.locator('#selected')).toBeHidden();
  await expect(page.locator('#programList [data-program]')).toHaveCount(23);
  await page.locator('#schoolMenuToggle').click();
  await expect(page.locator('#schoolMenuToggle')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#schoolMenuToggle')).toHaveAttribute('aria-expanded', 'false');
  checks.push({ case: 'invalid URL and mobile keyboard recovery', status: 'PASS' });
  assert.deepEqual(errors, [], 'No uncaught application errors');
  await page.screenshot({ path: `${out}/mobile.png`, fullPage: false, animations: 'disabled' });
  console.log(`PASS functional: ${checks.length} cases, including all 23 journey links and selected plans`);
} catch (error) {
  checks.push({ case: 'functional regression', status: 'FAIL', message: error.message });
  if (page) await page.screenshot({ path: `${out}/failure.png`, fullPage: false }).catch(() => {});
  throw error;
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(checks, null, 2));
  if (context) await context.tracing.stop({ path: `${out}/trace.zip` });
  if (browser) await browser.close();
  await site.close();
}
