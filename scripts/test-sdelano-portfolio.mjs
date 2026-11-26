import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('figure img').count(),5);
 assert.equal(await page.locator('figure img').evaluateAll(nodes=>nodes.every(i=>i.complete&&i.naturalWidth===390)),true);
 assert.equal(await page.locator('iframe').getAttribute('sandbox'),'allow-scripts');
 await page.evaluate(()=>localStorage.setItem('todo-list.tasks.v1','canary-not-real-data'));
 const frame=page.frameLocator('iframe');
 await frame.locator('#phone-qa-complete').click();
 await frame.locator('#fox-evolution-notice').waitFor({state:'visible'});
 assert.match(await frame.locator('#phone-qa-result').textContent(),/20 XP/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('todo-list.tasks.v1')),'canary-not-real-data');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 assert.deepEqual(errors,[]);
 console.log('Portfolio export acceptance: 5 real images; sandboxed interactive preview; stable-storage canary unchanged.');
} finally {await browser.close();}
