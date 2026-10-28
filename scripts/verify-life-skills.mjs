import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runInNewContext} from 'node:vm';
import {chromium} from 'playwright';
import {expect} from 'playwright/test';
import {startSite,browserOptions} from './qa/site.mjs';
const source={window:{}}; runInNewContext(await readFile('dist/ai-path/life-skills-content.js','utf8'),source);
const courses=source.window.AIPathLifeSkills, out='artifacts/ai-path-life-skills';
const files={goals:'goals.html',time:'time-management.html'};
const ages=['6-9','10-13','14-17'];
await mkdir(out,{recursive:true});
const site=await startSite(), browser=await chromium.launch(browserOptions);
async function noOverflow(page,label){assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),label);}
try {
 for(const [course,file] of Object.entries(files)) {
  const context=await browser.newContext({viewport:{width:1440,height:900}}), page=await context.newPage();
  const errors=[]; page.on('pageerror',err=>errors.push(err.message));
  await page.goto(site.base+file); await expect(page.locator('#course-app')).toBeVisible();
  await expect(page.locator('.hero-photo figcaption')).toContainText('AI-иллюстрация');
  for(const age of ages) {
   await page.locator(`[data-age="${age}"]`).click();
   for(let index=0;index<courses[course].length;index++) {
    const lesson=courses[course][index], example=lesson.cases[age];
    await page.locator(`[data-lesson="${lesson.id}"]`).click();
    await expect(page.locator('#task-story')).toHaveText(example.story);
    await page.locator('[data-step="learn"]').click(); await expect(page.locator('#lesson-example')).toHaveText(example.example);
    await page.locator('[data-step="try"]').click();
    await page.locator(`input[name="activity-answer"][value="${(example.answer+1)%3}"]`).check();
    await page.getByRole('button',{name:'Проверить решение'}).click();
    await expect(page.locator('#activity-feedback')).toHaveAttribute('data-kind','error');
    await expect(page.locator('#course-progress')).toHaveAttribute('value',String(index));
    await page.locator('#activity-hint-button').click(); await expect(page.locator('#activity-hint')).toHaveText(example.hint);
    await page.locator(`input[name="activity-answer"][value="${example.answer}"]`).check();
    await page.getByRole('button',{name:'Проверить решение'}).click(); await expect(page.locator('#activity-feedback')).toHaveAttribute('data-kind','success');
    await page.locator('[data-step="check"]').click();
    await page.locator(`input[name="quiz-answer"][value="${(lesson.quiz.answer+1)%3}"]`).check();
    await page.getByRole('button',{name:'Проверить ответ'}).click(); await expect(page.locator('#quiz-feedback')).toHaveAttribute('data-kind','error');
    await expect(page.locator('#course-progress')).toHaveAttribute('value',String(index));
    await page.locator('#quiz-hint-button').click(); await expect(page.locator('#quiz-hint')).toHaveText(lesson.quiz.hint);
    await page.locator(`input[name="quiz-answer"][value="${lesson.quiz.answer}"]`).check();
    await page.getByRole('button',{name:'Проверить ответ'}).click(); await expect(page.locator('#course-progress')).toHaveAttribute('value',String(index+1));
   }
   await page.locator('#plan-first').fill(`Первый шаг ${age}`);
   await page.locator('#plan-form button[type="submit"]').click();
   await expect(page.locator('#plan-preview')).toContainText(`Первый шаг ${age}`);
   await page.reload(); await expect(page.locator('#plan-first')).toHaveValue(`Первый шаг ${age}`);
   await expect(page.locator('#course-progress')).toHaveAttribute('value','5');
  }
  await page.locator('[data-age="6-9"]').click(); await expect(page.locator('#plan-first')).toHaveValue('Первый шаг 6-9');
  await page.locator('#reset-progress').click(); await page.keyboard.press('Escape'); await expect(page.locator('#reset-panel')).toBeHidden();
  await page.locator('#reset-progress').click(); await page.locator('#reset-confirm').click();
  await expect(page.locator('#course-progress')).toHaveAttribute('value','0'); await expect(page.locator('#plan-first')).toHaveValue('');
  await page.locator('[data-age="10-13"]').click(); await expect(page.locator('#course-progress')).toHaveAttribute('value','5');
  for(const width of [320,390,1440]) {
   await page.setViewportSize({width,height:900}); await page.goto(site.base+file); await noOverflow(page,`${course}/${width} intro`);
   await page.screenshot({path:`${out}/${course}-${width}-intro.png`,animations:'disabled'});
   await page.locator('[data-step="task"]').click(); await page.locator('#course').scrollIntoViewIfNeeded(); await noOverflow(page,`${course}/${width} lesson`);
   await page.screenshot({path:`${out}/${course}-${width}-lesson.png`,animations:'disabled'});
  }
  const requests=[]; page.on('request',request=>{if(/^https?:/.test(request.url())) requests.push(request.url());});
  const offline=file.replace('.html','-offline.html');
  await page.goto(pathToFileURL(resolve('dist/ai-path',offline)).href); await expect(page.locator('#course-app')).toBeVisible();
  await page.locator('[data-step="try"]').click(); await expect(page.locator('#activity-question')).not.toBeEmpty();
  assert.deepEqual(requests,[],`${course}: no network for offline lesson`);
  assert.deepEqual(errors,[],`${course}: no runtime errors`);
  await context.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:900}}); await page.goto(site.base);
 for(const id of ['goals-course-entry','time-course-entry','finance-course-entry']) await expect(page.locator('#'+id)).toBeVisible();
 await noOverflow(page,'home'); await page.screenshot({path:`${out}/home-390.png`,animations:'disabled'});
 await page.close(); console.log('Life skills: all 30 age-specific scenarios, hints, checks, plans, progress, reset, layouts and offline courses passed.');
} finally {await browser.close(); await site.close();}
