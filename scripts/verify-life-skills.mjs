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

async function recoveryChecks(course,file){
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const a=await context.newPage(),b=await context.newPage();
 await a.goto(site.base+file+'?age=6-9');await b.goto(site.base+file+'?age=14-17');
 const first=courses[course][0];
 await a.locator('[data-step="check"]').click();
 await a.locator(`input[name="quiz-answer"][value="${first.checks['6-9'].answer}"]`).check();await a.getByRole('button',{name:'Проверить ответ',exact:true}).click();
 await expect(a.locator('#course-progress')).toHaveAttribute('value','0');
 await expect(a.locator('#lesson-status')).toContainText('осталось выполнить практику');
 await a.locator('#completion-next').click();await expect(a.locator('#step-try')).toBeVisible();
 await a.locator(`input[name="activity-answer"][value="${first.cases['6-9'].answer}"]`).check();await a.getByRole('button',{name:'Проверить решение'}).click();
 await expect(a.locator('#course-progress')).toHaveAttribute('value','1');await expect(a.locator('#lesson-status')).toContainText('Урок зачтён');
 await a.locator('#plan-first').fill('Первый план');await b.locator('#plan-first').fill('Старший план');
 const fresh=await context.newPage();await fresh.goto(site.base+file+'?age=6-9');await expect(fresh.locator('#plan-first')).toHaveValue('Первый план');
 await expect(fresh.locator('#course-progress')).toHaveAttribute('value','1');
 await fresh.locator('[data-age="14-17"]').click();await expect(fresh.locator('#plan-first')).toHaveValue('Старший план');
 await b.locator('[data-age="6-9"]').click();const field=course==='goals'?'aim':'important';
 await b.locator('#plan-'+field).fill('Другое поле');await expect(a.locator('#plan-'+field)).toHaveValue('Другое поле');
 await fresh.goto(site.base+file+'?age=6-9');await expect(fresh.locator('#plan-first')).toHaveValue('Первый план');await expect(fresh.locator('#plan-'+field)).toHaveValue('Другое поле');
 await b.locator('#reset-progress').click();await b.locator('#reset-confirm').click();
 await a.locator('#plan-'+field).fill('После сброса');
 await fresh.goto(site.base+file+'?age=6-9');await expect(fresh.locator('#plan-first')).toHaveValue('');await expect(fresh.locator('#plan-'+field)).toHaveValue('После сброса');
 await fresh.locator('[data-age="14-17"]').click();await expect(fresh.locator('#plan-first')).toHaveValue('Старший план');
 const target=courses[course][3];await fresh.locator(`[data-lesson="${target.id}"]`).click();await fresh.locator('[data-step="try"]').click();
 await fresh.reload();await expect(fresh.locator('#lesson-title')).toHaveText(target.title);await expect(fresh.locator('#step-try')).toBeVisible();
 const resume=await context.newPage();await resume.goto(site.base+file);await expect(resume.locator('#lesson-title')).toHaveText(target.title);await expect(resume.locator('#step-try')).toBeVisible();
 await expect(resume.locator('[data-age="14-17"]')).toHaveAttribute('aria-pressed','true');
 await resume.locator('[data-step="check"]').click();await resume.goBack();await expect(resume.locator('#step-try')).toBeVisible();
 await context.close();
 const legacy=await browser.newContext();
 await legacy.addInitScript(({key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({age:'6-9',levels:{'6-9':{answers:{choose:{activity:true,quiz:true},notice:{activity:true,quiz:true}},plan:{first:'Старый сохранённый шаг'}}}}));},{key:'ai-path-life-skills-'+course+'-v1'});
 const old=await legacy.newPage();await old.goto(site.base+file);await expect(old.locator('#plan-first')).toHaveValue('Старый сохранённый шаг');await expect(old.locator('#course-progress')).toHaveAttribute('value','1');
 await old.locator('#reset-progress').click();await old.locator('#reset-confirm').click();await old.reload();await expect(old.locator('#plan-first')).toHaveValue('');await expect(old.locator('#course-progress')).toHaveAttribute('value','0');
 await legacy.close();
}
try {
 for(const [course,file] of Object.entries(files)) {
  await recoveryChecks(course,file);
  const context=await browser.newContext({viewport:{width:1440,height:900}}), page=await context.newPage();
  const errors=[]; page.on('pageerror',err=>errors.push(err.message));
  await page.goto(site.base+file); await expect(page.locator('#course-app')).toBeVisible();
  await expect(page.locator('.hero-photo figcaption')).toContainText('AI-иллюстрация');
  await expect(page.locator('.visual-lesson-card img')).toHaveCount(5);
  await page.locator('.visual-lesson-card img').evaluateAll(images=>Promise.all(images.map(async image=>{image.loading='eager';await image.decode();})));
  await expect(page.locator('#hero-photo')).toHaveAttribute('src',/cards/);
  for(const age of ages) {
   await page.locator(`[data-age="${age}"]`).click();
   for(let index=0;index<courses[course].length;index++) {
    const lesson=courses[course][index], example=lesson.cases[age], check=lesson.checks[age];
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
    await expect(page.locator('#quiz-question')).toHaveText(check.question);
    await page.locator(`input[name="quiz-answer"][value="${(check.answer+1)%3}"]`).check();
    await page.getByRole('button',{name:'Проверить ответ'}).click(); await expect(page.locator('#quiz-feedback')).toHaveAttribute('data-kind','error');
    await expect(page.locator('#course-progress')).toHaveAttribute('value',String(index));
    await page.locator('#quiz-hint-button').click(); await expect(page.locator('#quiz-hint')).toHaveText(check.hint);
    await page.locator(`input[name="quiz-answer"][value="${check.answer}"]`).check();
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
 for(const [query,id] of [['финансовая','finance'],['целеполагание','goals'],['тайм','time']]){
  await page.locator('#programSearch').fill(query);
  await expect(page.locator('#openCourseSearchResults')).toBeVisible();
  await expect(page.locator(`[data-open-course="${id}"]`)).toBeVisible();
  await expect(page.locator('#catalogEmpty')).toBeHidden();
  await noOverflow(page,`search ${query}`);
  await page.screenshot({path:`${out}/search-${id}-390.png`,animations:'disabled'});
 }
 await page.locator('#programSearch').fill('Python');await expect(page.locator('#openCourseSearchResults')).toBeHidden();
 await expect(page.locator('#catalogCount')).toHaveText('Показано 2 из 23 программ');
 await page.locator('#clearProgramSearch').click();
 await noOverflow(page,'home'); await page.screenshot({path:`${out}/home-390.png`,animations:'disabled'});
 await page.close(); console.log('Life skills: age-specific checks, independent tab saves, migration, progress guidance, resume, visual cards, search and offline courses passed.');
} finally {await browser.close(); await site.close();}
