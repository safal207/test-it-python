import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4192';
const base = origin + '/ai-path/';
const out = 'artifacts/ai-path-physics-lab';
const server = spawn('python3', ['-m','http.server','4192','--bind','127.0.0.1','--directory','dist'], {stdio:'ignore'});
const browser = await chromium.launch({headless:true, args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
async function waitForReady(page) {
  await page.waitForFunction(() => !document.getElementById('scene-status').textContent.includes('Загрузка'));
}
async function lesson(page) {
  await waitForReady(page);
  assert.equal(await page.locator('#force-value').innerText(),'0,98 Н');
  assert.equal(await page.locator('#extension-value').innerText(),'4,90 см');
  assert.match(await page.locator('#chart').getAttribute('aria-label'),/4,90 сантиметра.*0,98 ньютона/);
  const spring = await page.locator('#fallback-spring').getAttribute('d');
  await page.locator('#next').click();
  assert.equal(await page.locator('#mass').inputValue(),'200');
  assert.equal(await page.locator('#extension-value').innerText(),'9,80 см');
  assert.notEqual(await page.locator('#fallback-spring').getAttribute('d'),spring,'Schematic responds to mass');
  await page.locator('#next').click();
  assert.equal(await page.locator('#stiffness').inputValue(),'40');
  assert.equal(await page.locator('#extension-value').innerText(),'4,90 см');
  await page.locator('#next').click();
  assert.equal(await page.locator('#next').isDisabled(),true);
  await page.locator('#check').click();
  assert.match(await page.locator('#check-result').innerText(),/Сейчас 4,90 см/);
  await page.locator('#mass').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#extension-value').innerText(),'9,80 см');
  assert.equal(await page.locator('#check-result').innerText(),'');
  await page.locator('#check').click();
  assert.match(await page.locator('#check-result').innerText(),/9,80 см.*заданном диапазоне/);
  await page.locator('#forces').uncheck();
  assert.equal(await page.locator('#fallback-forces').getAttribute('visibility'),'hidden');
  await page.locator('#mass').focus(); await page.keyboard.press('Home');
  assert.equal(await page.locator('#force-value').innerText(),'0,00 Н');
  assert.equal(await page.locator('#extension-value').innerText(),'0,00 см');
  await page.locator('#previous').click();
  assert.match(await page.locator('#step-counter').innerText(),/ШАГ 3/);
}
try {
  await mkdir(out,{recursive:true});
  let ready = false;
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,100));}
  assert(ready,'Site server started');
  for(const width of [320,390,1440]) {
    const context=await browser.newContext({viewport:{width,height:width===320?740:width===390?844:960},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[],bad=[],external=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    page.on('response',r=>{if(r.status()>=400)bad.push(`${r.status()} ${r.url()}`)});
    page.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!r.url().startsWith('data:'))external.push(r.url())});
    await page.goto(base+'3d-academy.html');
    assert.equal(new URL(await page.locator('#physics-trial').getAttribute('href'),page.url()).pathname,'/ai-path/physics-lab.html');
    await page.locator('#physics-trial').click();
    await page.waitForURL(/physics-lab\.html/);
    errors.length=0; bad.length=0; external.length=0;
    await page.reload();
    await waitForReady(page);
    await page.screenshot({path:`${out}/physics-${width}-intro.png`,animations:'disabled'});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: no horizontal overflow`);
    await page.locator('#experiment').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${out}/physics-${width}-experiment.png`,animations:'disabled'});
    await page.locator('.stage-panel').screenshot({path:`${out}/physics-${width}-stage.png`,animations:'disabled'});
    await lesson(page);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: no overflow after interactions`);
    assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(external,[],'Lesson does not send data externally');
    console.log(`PASS ${width}px: navigation, formulas, graph, presets, controls and factual result`);
    await context.close();
  }
  const fallbackContext=await browser.newContext();
  await fallbackContext.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args)}; });
  const fallback=await fallbackContext.newPage();
  await fallback.goto(base+'physics-lab.html'); await waitForReady(fallback);
  assert(await fallback.locator('#fallback').isVisible(),'A 2D schematic appears when WebGL2 is unavailable');
  assert(await fallback.locator('#rotate-left').isDisabled(),'3D rotation is unavailable for the 2D schematic');
  await lesson(fallback); await fallbackContext.close();
  const offline=await browser.newContext(); const file=await offline.newPage(), requests=[];
  file.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
  await file.goto(pathToFileURL(resolve('dist/ai-path/physics-lab-offline.html')).href);
  await lesson(file);
  assert.deepEqual(requests,[],'Standalone HTML makes no network requests');
  await offline.close();
  console.log('PASS offline file:// lesson, zero remote requests, and no-WebGL interactive fallback');
} finally { await browser.close(); server.kill('SIGTERM'); }
