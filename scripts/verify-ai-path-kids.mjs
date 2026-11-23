import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const url=pathToFileURL(resolve('dist/ai-path/kids/index.html')).href;
const browser=await chromium.launch({headless:true});
const errors=[],network=[];
try {
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:844},acceptDownloads:true});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
  await page.goto(url);
  await page.locator('#path button').first().waitFor();
  assert.equal(await page.locator('#path button').count(),5);
  assert.equal(await page.locator('#xp').textContent(),'0');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+width);
  await page.locator('#path button').first().click();
  assert.equal(await page.locator('#next').isDisabled(),true);
  await page.locator('#answers button').nth(1).click();
  assert.equal(await page.locator('#next').isDisabled(),true);
  await page.locator('#answers button').nth(0).click();
  assert.equal(await page.locator('#next').isDisabled(),false);
  await page.locator('#lang').click();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('#next').isDisabled(),false);
  await page.locator('#next').click();
  for(const i of [1,2,0,1]){await page.locator('#answers button').nth(i).click();await page.locator('#next').click()}
  await page.locator('#return').click();
  assert.equal(await page.locator('#xp').textContent(),'30');
  await page.locator('#path button').first().click();
  for(const i of [0,1,2,0,1]){await page.locator('#answers button').nth(i).click();await page.locator('#next').click()}
  await page.locator('#return').click();
  assert.equal(await page.locator('#xp').textContent(),'30','duplicate XP');
  await page.locator('#path button').nth(1).click();
  for(const i of [0,1,2,0,1]){await page.locator('#answers button').nth(i).click();await page.locator('#next').click()}
  await page.locator('#return').click();
  assert.equal(await page.locator('#xp').textContent(),'60');
  await page.locator('#bookTitle').fill('The fox');
  await page.locator('#story').fill('A fox found a key.');
  await page.locator('#pitch').fill('A little mystery.');
  await page.locator('#rehearsed').check();
  await page.locator('#saveBook').click();
  await page.reload();
  assert.equal(await page.locator('#bookTitle').inputValue(),'The fox');
  assert.equal(await page.locator('#story').inputValue(),'A fox found a key.');
  assert.equal(await page.locator('#rehearsed').isChecked(),true);
  assert.equal(await page.locator('#xp').textContent(),'60');
  const download=page.waitForEvent('download');
  await page.locator('#exportBook').click();
  assert.equal((await download).suggestedFilename(),'my-book.txt');
  await page.locator('#parents summary').click();
  page.once('dialog',d=>d.accept());
  await page.locator('#reset').click();
  assert.equal(await page.locator('#bookTitle').inputValue(),'');
  assert.equal(await page.locator('#xp').textContent(),'0');
  await page.reload();
  assert.equal(await page.locator('#story').inputValue(),'');
  assert.equal(await page.locator('#xp').textContent(),'0');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow after reset '+width);
  await page.close();
  console.log('PASS viewport',width);
 }
 assert.deepEqual(errors,[]);
 assert.deepEqual(network,[]);
 console.log('PASS no page errors or external HTTP requests');
}finally{await browser.close()}
