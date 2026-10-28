import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { startSite, schoolRoutes, browserOptions } from './qa/site.mjs';

const require = createRequire(import.meta.url);
const out = 'artifacts/school-nonfunctional';
const site = await startSite();
const results = [];
let browser;
try {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch(browserOptions);
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 960 }, reducedMotion: 'reduce' });
    // Headless Chromium normally overlays scrollbars. Reserve the same 15px
    // gutter as a classic desktop scrollbar to catch min-width overflow too.
    await context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.scrollbarGutter = 'stable';
    }));
    for (const route of schoolRoutes) {
      const page = await context.newPage();
      const errors = [], resources = [];
      const row = { route: route || '/', width, errors, resources, violations: [] };
      results.push(row);
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('response', r => { if (r.url().startsWith(site.origin) && r.status() >= 400) resources.push(`${r.status()} ${r.url()}`); });
      page.on('requestfailed', r => { if (r.url().startsWith(site.origin)) resources.push(`${r.failure()?.errorText} ${r.url()}`); });
      try {
        const response = await page.goto(site.base + route, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200, 'Page is served');
        await expect(page.locator('h1')).toBeVisible();
        if (route === 'journeys.html') await expect(page.locator('.path-card')).toHaveCount(29);
        if (route === '3d-academy-practice.html') await expect(page.locator('#workbench')).toBeVisible();
        const bounds = await page.evaluate(() => {
          const available = document.documentElement.getBoundingClientRect().width;
          return {
            client: document.documentElement.clientWidth, available, scroll: document.documentElement.scrollWidth,
            offenders: [...document.querySelectorAll('body *')].filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.width && getComputedStyle(el).position !== 'fixed' && rect.right > available + 1;
            }).slice(0, 12).map(el => ({ tag: el.tagName, id: el.id, class: el.getAttribute('class'), right: el.getBoundingClientRect().right }))
          };
        });
        row.bounds = bounds;
        assert(bounds.scroll <= Math.min(bounds.client, bounds.available) + 1, `${route || '/'} at ${width}px: overflow ${JSON.stringify(bounds)}`);
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
        // Audit real visible DOM on narrow and wide screens. Incomplete axe
        // checks are retained for human review; they never count as passed.
        if (width === 390 || width === 1440) {
          await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
          const audit = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
          row.violations = audit.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
          row.manualReview = audit.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
          assert.equal(row.violations.length, 0, `${route || '/'}: WCAG A/AA violations (see results.json)`);
        }
        const broken = await page.locator('img').evaluateAll(images => images.filter(i => i.currentSrc && i.complete && !i.naturalWidth).map(i => i.currentSrc));
        assert.deepEqual(broken, [], 'Loaded images decode');
        assert.deepEqual(resources, [], 'No failed local resources');
        assert.deepEqual(errors, [], 'No console errors or uncaught exceptions');
        if (['', 'studio.html', 'journeys.html'].includes(route) && width !== 768) await page.screenshot({ path: `${out}/${route.replace('.html', '') || 'home'}-${width}.png`, animations: 'disabled' });
        row.status = 'PASS';
      } catch (error) {
        row.status = 'FAIL'; row.message = error.message;
        await page.screenshot({ path: `${out}/failure-${route.replace(/[^a-z0-9]/gi, '-') || 'home'}-${width}.png` }).catch(() => {});
      } finally { await page.close(); }
    }
    await context.close();
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  const failures = results.filter(r => r.status === 'FAIL');
  for (const row of failures) console.error('FAIL', row.route || '/', row.width, row.message);
  assert.equal(failures.length, 0, 'Nonfunctional acceptance must pass before deploy');
  console.log(`PASS nonfunctional: ${results.length} page/viewport cases, resources, console, classic scrollbar and WCAG A/AA`);
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  await site.close();
}
