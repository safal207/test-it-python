import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { startSite, browserOptions } from './qa/site.mjs';
import { unityGameConcepts } from '../dist/ai-path/unity-game-concepts.js';

const require = createRequire(import.meta.url);
const site = await startSite();
const out = 'artifacts/unity-course';
const results = [];
let browser;
try {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch(browserOptions);
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
    await page.goto(site.base + 'unity.html?program=unity&level=basic&pace=light');
    if (width === 390) {
      for (const name of ['course-slides', 'lesson-01-slides']) {
        for (const extension of ['html', 'pdf', 'pptx']) {
          const response = await page.request.get(`${site.base}teaching/unity/${name}.${extension}`);
          assert.equal(response.status(), 200, `Teaching material is served: ${name}.${extension}`);
          const body = await response.body();
          assert(body.length > 1000, 'Teaching material is nonempty');
          if (extension === 'pdf') assert.equal(body.subarray(0, 5).toString(), '%PDF-', 'PDF download has its expected file signature');
          if (extension === 'pptx') assert.equal(body.subarray(0, 2).toString(), 'PK', 'PPTX download is an Office archive');
        }
      }
    }
    await expect(page.locator('h1')).toHaveText('ИИ + Unity:создаём свою игру.');
    await expect(page.locator('.weeks li')).toHaveCount(8);
    await expect(page.locator('.schedule')).toContainText('Предлагаемый маршрут');
    await expect(page.locator('.game-plan figcaption')).toContainText('не кадр из готовой игры Unity');
    await expect(page.locator('.bridge')).toContainText('отдельная веб-мини-игра');
    assert.equal(unityGameConcepts.length, 3, 'Three proposed Unity game ideas');
    assert.equal(new Set(unityGameConcepts.map(idea => idea.id)).size, 3, 'Game idea identifiers are unique');
    await expect(page.locator('.unity-game-card')).toHaveCount(3);
    await expect(page.locator('.result-grid article')).toHaveCount(3);
    for (const idea of unityGameConcepts) {
      const card = page.locator(`[data-game-idea="${idea.id}"]`);
      await expect(card.locator('h3')).toHaveText(idea.title);
      await expect(card.locator('.unity-game-platform')).toHaveText(idea.platform);
      await expect(card.locator('.unity-game-tags')).toContainText(idea.genre);
      await expect(card.locator('figcaption')).toHaveText('Концепт-арт');
      await expect(card.locator('a')).toHaveCount(1);
      const target = new URL(await card.locator('a').getAttribute('href'), page.url());
      assert(target.pathname.endsWith('/project-start.html'), 'Card opens a project plan');
      for (const [key, value] of Object.entries({ journey: 'story', program: 'unity', mode: 'learn', gameIdea: idea.id, level: 'basic', pace: 'light' })) {
        assert.equal(target.searchParams.get(key), value, `Game selection preserves ${key}`);
      }
      await card.scrollIntoViewIfNeeded();
      await expect.poll(() => card.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    await expect(page.locator('.unity-game-footnote')).toContainText('физическом телефоне');
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    for (const theme of ['light', 'dark', 'matrix']) {
      await page.locator(`[data-theme-choice="${theme}"]`).click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      const bounds = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
      assert(bounds.scroll <= bounds.width + 1, `${width}/${theme}: no overflow`);
      const audit = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
      results.push({ width, theme, violations: audit.violations, manualReview: audit.incomplete.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) });
      assert.equal(audit.violations.length, 0, `${width}/${theme}: no WCAG A/AA violations`);
      await page.locator('.hero').screenshot({ path: `${out}/hero-${width}-${theme}.png`, animations: 'disabled' });
      await page.locator('.unity-games').screenshot({ path: `${out}/game-cards-${width}-${theme}.png`, animations: 'disabled' });
    }
    await page.locator('.requirements summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.requirements details')).toHaveAttribute('open', '');
    for (const link of await page.locator('a[href*="teaching/unity/"]:not([download]), #unity-start, #unity-game-trial, #unity-course-choice').all()) {
      const url = new URL(await link.getAttribute('href'), page.url());
      assert.equal(url.searchParams.get('program'), 'unity', 'Course context is preserved');
      assert.equal(url.searchParams.get('level'), 'basic');
      assert.equal(url.searchParams.get('pace'), 'light');
    }
    const startURL = new URL(await page.locator('#unity-start').getAttribute('href'), page.url());
    assert.equal(startURL.searchParams.get('journey'), 'story');
    assert.equal(startURL.searchParams.get('mode'), 'learn');
    await page.locator('#unity-course-choice').click();
    await expect(page.locator('#selTitle')).toHaveText('ИИ + Unity: создаём свою игру');
    await expect(page.locator('#selDuration')).toContainText('Предлагаемый маршрут');
    await expect(page.locator('#selSteps li')).toHaveCount(8);
    await expect(page.locator('#enquiryLevel')).toHaveValue('basic');
    await expect(page.locator('#enquiryPace')).toHaveValue('light');
    await expect(page.locator('#gameTrialLink')).toBeVisible();
    await page.locator('#selectedJourneyLink').click();
    await expect(page.locator('#journey-unity details')).toHaveAttribute('open', '');
    await page.locator('#journey-unity a[href*="unity.html"]').click();
    await expect(page.locator('h1')).toContainText('Unity');
    await page.locator('#unity-game-trial').click();
    await expect(page.locator('#game-board')).toBeVisible();
    assert.equal(new URL(page.url()).searchParams.get('program'), 'unity');
    await page.locator('#game-unity-course').click();
    await expect(page.locator('h1')).toContainText('Unity');
    const returnURL = new URL(page.url());
    assert.equal(returnURL.searchParams.get('program'), 'unity');
    assert.equal(returnURL.searchParams.get('level'), 'basic');
    assert.equal(returnURL.searchParams.get('pace'), 'light');
    assert.deepEqual(errors, [], 'No browser errors');
    assert.deepEqual(failed, [], 'No failed page resources');
    await page.close();
    console.log(`PASS Unity ${width}px: three themes, three game concepts and plan links, source labels, eight lessons, keyboard and chooser/journey/web-trial context`);
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  await site.close();
}
