import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { startSite, browserOptions } from './qa/site.mjs';
import { demos } from '../dist/ai-path/demo-catalog.js';
const site = await startSite();
const out = 'artifacts/project-demos';
const results = [];
let browser;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function download(page, selector) {
  const pending = page.waitForEvent('download'); await page.locator(selector).click();
  const file = await pending; return readFile(await file.path());
}
async function a11y(page, label) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  results.push({ label, violations: result.violations, manualReview: result.incomplete.map(({ id, nodes }) => ({ id, elements: nodes.map(n => n.target) })) });
  assert.equal(result.violations.length, 0, `${label}: ${JSON.stringify(result.violations.map(v => ({ id:v.id, nodes:v.nodes.map(n => n.target) })))}`);
}
async function noOverflow(page) {
  const bounds = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(el => ({tag:el.tagName,id:el.id,class:el.className,right:el.getBoundingClientRect().right})).slice(0,8) }));
  assert(bounds.scroll <= bounds.width + 1, `No horizontal overflow beyond subpixel rounding: ${page.url()} ${JSON.stringify(bounds)}`);
}
try {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch(browserOptions);
  assert.equal(new Set(demos.map(d => d.id)).size, demos.length);
  // Validate every internal destination and every catalog image, not external services.
  for (const entry of demos) {
    for (const path of [!entry.url.startsWith('https:') && entry.url, entry.image].filter(Boolean)) {
      const response = await fetch(new URL(path, site.base)); assert.equal(response.status, 200, `${entry.id}: ${path}`); await response.arrayBuffer();
    }
  }
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.scrollbarGutter = 'stable'; }));
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(site.base + 'demos.html');
    await expect(page.locator('.demo-card')).toHaveCount(demos.filter(d => d.group === 'local').length);
    await page.locator('[data-filter="all"]').click(); await expect(page.locator('.demo-card')).toHaveCount(demos.length);
    await page.locator('#demo-search').fill('qqq-no-project'); await expect(page.locator('#demo-empty')).toBeVisible();
    await page.locator('#demo-search').fill('AI Desk'); await expect(page.locator('.demo-card')).toHaveCount(1);
    await page.locator('#demo-search').fill(''); await page.locator('[data-filter="artifact"]').click();
    await expect(page.locator('.demo-card')).toHaveCount(demos.filter(d => d.group === 'artifact').length);
    await page.locator('[data-filter="local"]').click();
    await noOverflow(page); await a11y(page, `catalog-${width}`);
    await page.screenshot({ path: `${out}/catalog-${width}.png`, fullPage: true });
    await page.locator('[data-demo="desk"] .demo-open').click();
    await expect(page.locator('#desk-capture')).toBeDisabled();
    await page.locator('#desk-save-a').click(); await page.locator('#desk-save-b').click();
    await expect(page.locator('#desk-comparison')).toContainText('одинаковые');
    await page.locator('#start-scene').click(); await expect(page.locator('#scene-panel')).toHaveAttribute('data-state','ready');
    const first = hash(await download(page,'#desk-capture'));
    await page.locator('[data-material="walnut"]').click(); await page.locator('button[data-lighting="evening"]').click(); await page.locator('#desk-save-b').click();
    await expect(page.locator('#desk-comparison')).toContainText('материал стола и освещение');
    const second = await download(page,'#desk-capture'); assert.notEqual(hash(second), first, 'Changed settings alter actual exported scene pixels');
    assert.equal(second.subarray(1,4).toString(), 'PNG');
    const deskText = (await download(page,'#desk-export')).toString('utf8');
    assert.match(deskText,/A: Светлый дуб \/ дневной/); assert.match(deskText,/B: Тёмный орех \/ вечерний/); assert.match(deskText,/material=walnut&light=evening/);
    await page.locator('#desk-show-a').click(); await expect(page.locator('#scene-panel')).toHaveAttribute('data-material','oak');
    await page.locator('#desk-show-b').click(); await expect(page.locator('#scene-panel')).toHaveAttribute('data-lighting','evening');
    await noOverflow(page); await a11y(page,`desk-${width}`);
    await page.screenshot({ path:`${out}/desk-${width}.png`,fullPage:true });
    await page.locator('#desk-clear').click(); await expect(page.locator('#desk-show-a')).toBeDisabled();
    await page.goto(site.base + 'examples/plan-to-space.html'); await expect(page.locator('body')).toHaveAttribute('data-renderer','webgl');
    await page.locator('#paletteWarm').click(); const warm = hash(await download(page,'#room-capture'));
    await page.locator('#paletteSage').click(); await expect(page.locator('#paletteSage')).toHaveAttribute('aria-pressed','true');
    const sage = await download(page,'#room-capture'); assert.notEqual(hash(sage),warm,'Palette changes exported 3D pixels');
    const roomText = (await download(page,'#room-brief')).toString('utf8'); assert.match(roomText,/Шалфей и лён/); assert.match(roomText,/Свет меняет всё/);
    await page.locator('#room-before').click(); await expect(page.locator('body')).toHaveAttribute('data-progress','0');
    await page.locator('#room-after').click(); await expect(page.locator('body')).toHaveAttribute('data-progress','100');
    await noOverflow(page); await a11y(page,`room-${width}`); await page.screenshot({path:`${out}/room-${width}.png`,fullPage:true});
    assert.deepEqual(errors,[],`${width}: console/resource errors`); await context.close();
  }
  // Normal motion must preserve a directly chosen stage while reaching export below it.
  const normal = await browser.newContext({ viewport:{width:1440,height:960}, reducedMotion:'no-preference' });
  const normalPage = await normal.newPage(); await normalPage.goto(site.base+'examples/plan-to-space.html');
  await normalPage.locator('[data-stage="50"]').click();
  assert.match((await download(normalPage,'#room-brief')).toString('utf8'),/Место для жизни/);
  await expect(normalPage.locator('body')).toHaveAttribute('data-progress','50');
  await normalPage.locator('#room-before').click();
  const planPng = await download(normalPage,'#room-capture'); await writeFile(`${out}/exported-plan.png`,planPng);
  // Count dark plan pixels in the actual PNG, not just its signature or DOM overlay.
  const dark = await normalPage.evaluate(async data => {
    const image=new Image(); image.src='data:image/png;base64,'+data; await image.decode();
    const c=document.createElement('canvas'); c.width=image.width;c.height=image.height; const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    const rgba=ctx.getImageData(0,0,c.width,c.height).data; let count=0;
    for(let i=0;i<rgba.length;i+=4) if(rgba[i]<100 && rgba[i+1]<120 && rgba[i+2]<100 && rgba[i+3]>200)count++;
    return count;
  },planPng.toString('base64'));
  assert(dark>1000, `Plan PNG contains dark wall/furniture/label pixels: ${dark}`);
  await expect(normalPage.locator('body')).toHaveAttribute('data-progress','0');
  await normalPage.locator('#resume-scroll').click(); await expect(normalPage.locator('#resume-scroll')).toBeHidden();
  await normal.close();
  const fallback = await browser.newContext({ viewport:{width:390,height:844} });
  await fallback.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type,...args){ return /webgl/.test(type) ? null : get.call(this,type,...args); }; });
  const page = await fallback.newPage(); await page.goto(site.base+'examples/plan-to-space.html');
  await expect(page.locator('body')).toHaveAttribute('data-renderer','fallback'); await expect(page.locator('#room-capture')).toBeDisabled(); await expect(page.locator('#paletteSage')).toBeDisabled();
  assert.match((await download(page,'#room-brief')).toString('utf8'),/3D недоступно/);
  await page.goto(site.base+'examples/ai-desk.html'); await page.locator('#start-scene').click(); await expect(page.locator('#scene-panel')).toHaveAttribute('data-state','error'); await expect(page.locator('#desk-capture')).toBeDisabled();
  await fallback.close();
  console.log(`Catalog ${demos.length} projects; actual 3D A/B, PNG/TXT exports, fallback and 320/390/1440 accessibility passed.`);
} finally { await writeFile(`${out}/results.json`,JSON.stringify(results,null,2)); await browser?.close(); await site.close(); }
