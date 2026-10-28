import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const base = 'http://127.0.0.1:4183/ai-path/';
const output = 'artifacts/ai-path-qa/themes';
const routes = ['', 'game-lab.html', 'physics-lab.html', 'finance.html', 'journeys.html', 'neural-courses.html', 'neural-networks.html', 'career-research.html', '3d-academy.html', '3d-academy-practice.html', 'studio.html', 'vibe-coding/'];
const themes = ['light', 'dark', 'matrix'];
const server = spawn('python3', ['-m', 'http.server', '4183', '--bind', '127.0.0.1', '--directory', 'dist'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light', 'An unsaved preference retains the approved light theme');
  await page.getByRole('button', { name: 'Тёмная', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Theme works with Enter');
  await page.getByRole('button', { name: 'Матрица', exact: true }).focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'matrix', 'Theme works with Space');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'matrix', 'Theme survives reload');
  await page.locator('.navlinks a[data-neural-courses]').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'matrix', 'Theme follows a real course link');

  // Verify every school route in each theme, without recolouring the demo projects.
  for (const theme of themes) {
    await page.locator(`[data-theme-choice="${theme}"]`).click();
    for (const route of routes) {
      await page.goto(base + route);
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme, `${route}: saved ${theme}`);
      assert.equal(await page.locator('[data-theme-choice][aria-pressed="true"]').count(), 1);
      assert.equal(await page.locator(`[data-theme-choice="${theme}"]`).getAttribute('aria-pressed'), 'true');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route}: no overflow in ${theme}`);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const result = await page.evaluate(() => window.axe.run(document, { runOnly: ['color-contrast', 'button-name', 'aria-valid-attr-value'] }));
      if (result.violations.length) failures.push({ route, theme, violations: result.violations });
      if (!route) await page.screenshot({ path: `${output}/${theme}-1440.png`, animations: 'disabled' });
    }
  }
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: width === 320 ? 740 : 844 });
    for (const theme of themes) {
      await page.goto(base);
      await page.locator(`[data-theme-choice="${theme}"]`).click();
      const controls = await page.locator('.theme-switcher').boundingBox();
      assert(controls.x >= 0 && controls.x + controls.width <= width && controls.y >= 0, `${width}: all theme choices fit`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: no overflow in ${theme}`);
      const action = await page.locator('#hero-programs').boundingBox();
      assert(action.y + action.height <= page.viewportSize().height, `${width}: course CTA remains in first viewport`);
      await page.screenshot({ path: `${output}/${theme}-${width}.png`, animations: 'disabled' });
      await page.getByRole('button', { name: 'Меню', exact: false }).click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#schoolMenuToggle').getAttribute('aria-expanded'), 'false');
    }
  }
  await page.goto(base + '?program=game&level=basic&pace=deep#selected');
  await page.locator('[data-theme-choice="light"]').click();
  assert.equal(new URL(page.url()).searchParams.get('program'), 'game', 'Changing a theme preserves the selected program');
  assert.equal(new URL(page.url()).searchParams.get('pace'), 'deep', 'Changing a theme preserves the plan');
  // Another open tab receives the preference; no stale selected button remains.
  const second = await context.newPage();
  await second.goto(base);
  await second.locator('[data-theme-choice="dark"]').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  assert.equal(await page.locator('[data-theme-choice="dark"]').getAttribute('aria-pressed'), 'true');
  await second.close();
  assert.deepEqual(errors, []);
  await context.close();

  for (const blocked of [false, true]) {
    const isolated = await browser.newContext();
    await isolated.addInitScript(block => {
      if (block) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
      else localStorage.setItem('ai-path-theme', 'invalid-value');
    }, blocked);
    const tab = await isolated.newPage();
    await tab.goto(base);
    assert.equal(await tab.locator('html').getAttribute('data-theme'), 'light', 'Invalid or unavailable storage has a safe default');
    await tab.locator('[data-theme-choice="matrix"]').click();
    assert.equal(await tab.locator('html').getAttribute('data-theme'), 'matrix', 'Theme still changes when storage cannot persist');
    await isolated.close();
  }
  await writeFile(`${output}/accessibility.json`, JSON.stringify(failures, null, 2));
  for (const failure of failures) console.error('THEME_ACCESSIBILITY', JSON.stringify({ route: failure.route, theme: failure.theme, violations: failure.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) }));
  assert.equal(failures.length, 0, 'Every theme passes contrast, button labels and ARIA checks');
  console.log('Three themes: persistence, keyboard, all school routes, contrast and mobile screenshots passed.');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
