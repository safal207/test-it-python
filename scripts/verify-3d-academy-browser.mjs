import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4181/ai-path/';
const artifacts = 'artifacts/ai-path-qa';
const server = spawn('python3', ['-m','http.server','4181','--bind','127.0.0.1','--directory','dist'], {stdio:'ignore'});
const expected = ['biology','physics','engineering','architecture','threejs','edtech'];
const authoredCourses = JSON.parse(readFileSync('dist/ai-path/3d-academy-curriculum.json','utf8')).courses;

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
    await page.waitForFunction(()=>!document.querySelector('#demoStatus').textContent.includes('Загрузка'),null,{timeout:12000});
    const status=await page.locator('#demoStatus').innerText();
    if(status.includes('модель готова')){
      for(const mode of ['device','building','physics','cell']){
        const button=page.locator('[data-scene="'+mode+'"]');
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'),'true','Selected demo '+mode);
        assert((await page.locator('#sceneText').innerText()).length>50,'Scene '+mode+' explains the model');
        if(mode==='device'||mode==='building'){
          assert(await page.locator('#explodeControl').isVisible(),'Explode control visible for '+mode);
          await page.locator('#explode').evaluate(el => { el.value='50'; el.dispatchEvent(new Event('input',{bubbles:true})); });
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

    await page.locator('#biology .course-start').click();
    await page.waitForURL(/3d-academy-practice\.html\?course=biology/);
    await page.locator('#workbench').waitFor({state:'visible'});
    assert.equal(await page.locator('#trackButtons button').count(),6,'Practicum exposes all six tracks');
    for(const course of authoredCourses){
      await page.locator('[data-course="'+course.id+'"]').click();
      assert.equal(await page.locator('#lessonSelect option').count(),course.duration,'All lessons are navigable in '+course.id);
      const lessons = width===1440 ? course.lessons.map((lesson,index)=>({lesson,index}))
        : [course.lessons[0],course.lessons[course.lessons.length-1]].map((lesson,i)=>({lesson,index:i===0?0:course.lessons.length-1}));
      for(const {lesson,index} of lessons){
        await page.locator('#lessonSelect').selectOption(String(index));
        assert.equal(await page.locator('#quizQuestion').innerText(),lesson.quiz.question,'Correct course content at '+course.id+' #'+index);
        const wrong=(lesson.quiz.correct+1)%3;
        await page.locator('#quizOptions input[value="'+wrong+'"]').check();
        await page.locator('#quizForm button[type="submit"]').click();
        assert.equal(await page.locator('#quizFeedback').getAttribute('data-result'),'retry','Wrong answer is not accepted');
        await page.locator('#quizOptions input[value="'+lesson.quiz.correct+'"]').check();
        await page.locator('#quizForm button[type="submit"]').click();
        assert.equal(await page.locator('#quizFeedback').getAttribute('data-result'),'pass','Correct answer accepted');
      }
      assert(await page.locator('#projectText').innerText()===course.project,'Distinct final project for '+course.id);
      assert.equal(await page.locator('#rubric li').count(),3,'Project has 3 manual acceptance criteria');
      assert((await page.locator('#labLink').getAttribute('href')).includes('scene='+course.scene),'Correct demo linked for '+course.id);
    }
    const progress=await page.locator('#progressLabel').innerText();
    assert(progress.includes(width===1440?'6 из 6':'2 из 6'),'Progress counts verified answers');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#workbench').waitFor({state:'visible'});
    assert.equal(await page.locator('#progressLabel').innerText(),progress,'Device-local verified answers survive reload');
    const practiceBounds=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth}));
    assert(practiceBounds.page<=practiceBounds.viewport+1,'No practicum horizontal overflow at '+width+'px: '+JSON.stringify(practiceBounds));
    await page.screenshot({path:artifacts+'/3d-academy-practice-'+width+'.png',fullPage:true,animations:'disabled'});
    if(width===1440){
      const negative=await context.newPage();
      await negative.route('**/3d-academy-curriculum.json',route=>route.abort());
      await negative.goto(new URL('3d-academy-practice.html',base),{waitUntil:'domcontentloaded'});
      assert(await negative.locator('#loadError').isVisible(),'Missing curriculum shows accessible failure message');
      assert(!await negative.locator('#workbench').isVisible(),'Failed load does not render broken controls');
      await negative.close();
    }
    assert.deepEqual(errors,[],'No browser JS exceptions at '+width+'px');
    console.log('PASS 3D Academy '+width+'px: six syllabi, navigation, controls or fallback, responsive bounds');
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
