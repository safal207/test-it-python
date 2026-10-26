import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4181/ai-path/';
const artifacts = 'artifacts/ai-path-qa';
const server = spawn('python3', ['-m','http.server','4181','--bind','127.0.0.1','--directory','dist'], {stdio:'ignore'});
const expected = ['biology','physics','engineering','architecture','threejs','edtech'];

async function ready() {
  for(let i=0;i<60;i++){
    try { const r=await fetch(base+'3d-academy.html');if(r.status===200)return; }catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('3D Academy server unavailable');
}
let browser;
try {
  await mkdir(artifacts,{recursive:true});
  await ready();
  browser=await chromium.launch({headless:true});
  for(const width of [1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:width===1440?900:760},deviceScaleFactor:1,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const home=await page.goto(base,{waitUntil:'domcontentloaded'});
    assert.equal(home.status(),200);
    assert.equal(await page.locator('#academy-3d-entry').count(),1,'Home includes a single Academy link');
    await page.locator('#academy-3d-entry').click();
    await page.waitForURL(/3d-academy\.html$/);
    assert.deepEqual(await page.locator('article.course').evaluateAll(nodes=>nodes.map(n=>n.id)),expected,'Six course cards rendered');
    assert.equal(await page.locator('article.course details').count(),6);
    for(const id of expected){
      const course=page.locator('#'+id);
      await course.locator('summary').click();
      assert(await course.locator('ol li').count()>=4,'Course '+id+' includes real weekly curriculum');
      await course.locator('summary').click();
    }
    await page.waitForFunction(()=>!document.querySelector('#demoStatus').textContent.includes('Загрузка'),{timeout:12000});
    const status=await page.locator('#demoStatus').innerText();
    if(status.includes('модель готова')){
      for(const mode of ['device','building','physics','cell']){
        const button=page.locator('[data-scene="'+mode+'"]');
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'),'true','Selected demo '+mode);
        assert((await page.locator('#sceneText').innerText()).length>50,'Scene '+mode+' explains the model');
        if(mode==='device'||mode==='building'){
          assert(await page.locator('#explodeControl').isVisible(),'Explode control visible for '+mode);
          await page.locator('#explode').fill('50');
          assert.equal(await page.locator('#explodeValue').innerText(),'50%');
        } else assert(!await page.locator('#explodeControl').isVisible(),'No irrelevant explode control in '+mode);
      }
      await page.locator('#sceneCanvas').focus();
      await page.keyboard.press('ArrowRight');
    } else {
      assert(/WebGL недоступен|не запустился/.test(status),'Fallback explicitly explains missing WebGL');
      assert(await page.locator('#stageFallback').isVisible(),'Fallback must be visible');
    }
    const bounds=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth}));
    assert(bounds.page<=bounds.viewport+1,'No horizontal overflow at '+width+'px: '+JSON.stringify(bounds));
    await page.screenshot({path:artifacts+'/3d-academy-'+width+'.png',fullPage:true,animations:'disabled'});
    assert.deepEqual(errors,[],'No browser JS exceptions at '+width+'px');
    console.log('PASS 3D Academy '+width+'px: six syllabi, navigation, controls or fallback, responsive bounds');
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
