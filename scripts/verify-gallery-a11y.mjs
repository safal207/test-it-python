import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { startSite, browserOptions } from './qa/site.mjs';

const require = createRequire(import.meta.url);
const site = await startSite();
let browser;
try {
  browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(site.base, { waitUntil: 'networkidle' });
  const selectors = [
    '[data-hero-project="room"]', '[data-hero-project="python"]', '[data-hero-project="game"]',
    '#mentor-certificates [data-certificate="neural-networks"] button',
    '#mentor-certificates [data-certificate="computer-vision"] button',
    '#mentor-documents [data-mentor-document="appreciation"] button',
    '#mentor-documents [data-mentor-document="diploma"] button'
  ];
  for (const selector of selectors) {
    const button = page.locator(selector);
    const imageAlt = await button.locator('img').getAttribute('alt');
    const source = await button.getAttribute('data-shot-source');
    const fullImage = await button.getAttribute('data-shot');
    assert(imageAlt?.trim() && source && fullImage, `${selector}: description and original source are retained`);
    const visibleCaption = await button.locator('span:not(.sr-only):not(.shot-zoom)').allTextContents();
    const accessibleName = `Увеличить: ${imageAlt}${visibleCaption.length ? ' ' + visibleCaption.join(' ') : ''}`;
    await expect(button).toHaveAccessibleName(accessibleName);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#projectLightbox')).toHaveJSProperty('open', true);
    await expect(page.locator('#galleryImage')).toHaveAttribute('src', fullImage);
    await expect(page.locator('#gallerySource')).toHaveAttribute('href', source);
    await page.keyboard.press('Escape');
    await expect(page.locator('#projectLightbox')).toHaveJSProperty('open', false);
    await expect(button).toBeFocused();
  }
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const audit = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'rule', values: ['label-content-name-mismatch'] } }));
  assert.deepEqual(audit.violations, [], 'Visible text and accessible names must match');
  assert.deepEqual(audit.incomplete, [], 'No unresolved name/label checks');
  console.log('PASS: seven descriptive names, keyboard gallery, focus restoration, original sources and axe label-content-name-mismatch');
} finally {
  if (browser) await browser.close();
  await site.close();
}
