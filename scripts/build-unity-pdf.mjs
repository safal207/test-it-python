import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startSite, browserOptions } from './qa/site.mjs';

// Render the authored source; no slide text or remote content is generated here.
const site = await startSite();
const output = 'artifacts/unity-slides';
const decks = [['course-slides',10],['lesson-01-slides',12]];
const results = [], errors = [];
let browser;
try {
  await mkdir(output,{recursive:true});
  browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  page.on('pageerror',error => errors.push(error.message));
  page.on('response',response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  for (const [slug,count] of decks) {
    await page.goto(`${site.base}teaching/unity/${slug}.html`);
    await page.emulateMedia({media:'print'});
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.slide').count(),count);
    const overflow = await page.locator('.txt').evaluateAll(items => items.filter(element => element.scrollHeight > element.clientHeight+2 || element.scrollWidth > element.clientWidth+2).map(element => ({text:element.textContent,width:element.clientWidth,scrollWidth:element.scrollWidth,height:element.clientHeight,scrollHeight:element.scrollHeight})));
    assert.deepEqual(overflow,[],`${slug}: slide text fits its authored box`);
    for (let index=0;index<count;index++) await page.locator('.slide').nth(index).screenshot({path:`${output}/${slug}-${String(index+1).padStart(2,'0')}.png`,animations:'disabled'});
    const path = `dist/ai-path/teaching/unity/${slug}.pdf`;
    const pdf = await page.pdf({path,preferCSSPageSize:true,printBackground:true});
    assert(pdf.subarray(0,5).toString() === '%PDF-');
    results.push({slug,slides:count,pdf:path,bytes:pdf.length,textOverflow:overflow});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify(results));
} finally {
  await writeFile(`${output}/render-report.json`,JSON.stringify({results,errors},null,2));
  await browser?.close(); await site.close();
}
