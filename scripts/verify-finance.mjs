import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { startSite, browserOptions } from './qa/site.mjs';

const source = { window: {} };
runInNewContext(await readFile('dist/ai-path/finance-content.js','utf8'),source);
const groups = source.window.AIPathFinance.groups;
const out = 'artifacts/ai-path-finance';
const site = await startSite();
const browser = await chromium.launch(browserOptions);
const results = [];
let activePage;
async function noOverflow(page,label) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),label);
}
async function solveLessons(page,age) {
  const group = groups[age];
  for (let i=0;i<6;i++) {
    const lesson = group.lessons[i];
    await page.locator(`[data-lesson="${lesson.id}"]`).click();
    await expect(page.locator('#lesson-title')).toHaveText(lesson.title);
    await expect(page.locator('#lesson-title')).toBeFocused();
    assert.equal(new URL(page.url()).searchParams.get('lesson'),lesson.id);
    await page.locator(`input[name="lesson-answer"][value="${(lesson.answer+1)%3}"]`).check();
    await page.getByRole('button',{name:'Проверить ответ',exact:true}).click();
    await expect(page.locator('#quiz-feedback')).toHaveText(/^Пока неверно/);
    await expect(page.locator('#course-progress')).toHaveAttribute('value',String(i));
    await page.locator(`input[name="lesson-answer"][value="${lesson.answer}"]`).check();
    await page.getByRole('button',{name:'Проверить ответ',exact:true}).click();
    await expect(page.locator('#quiz-feedback')).toHaveText(/^Верно/);
    await expect(page.locator('#course-progress')).toHaveAttribute('value',String(i+1));
  }
  await expect(page.locator('#completion-status')).not.toHaveText(/^Уровень .* пройден/);
}
async function practices(page,age) {
  const b=groups[age].budget;
  await page.locator('#budget-fun').fill(String(b.income));
  await expect(page.locator('#budget-live')).toHaveText(/^Нехватка/);
  await page.locator('#budget-check').click();
  await expect(page.locator('#budget-feedback')).toHaveText(/^Не хватает/);
  await page.locator('#budget-income').fill('999999');
  await page.locator('#budget-check').click();
  await expect(page.locator('#budget-feedback')).toHaveText(/^Для проверки верни поступления/);
  await page.locator('#budget-income').fill(String(b.income));
  await page.locator('#budget-fun').fill(String(b.fun));
  await page.locator('#budget-save').fill('0');
  await page.locator('#budget-check').click();
  await expect(page.locator('#budget-feedback')).toHaveText(/^По условию на цель/);
  await page.locator('#budget-save').fill(String(b.save));
  await expect(page.locator('#budget-balance')).toHaveText('0');
  await page.locator('#budget-check').click();
  await expect(page.locator('#budget-feedback')).toHaveText(/^Бюджет проверен/);
  await page.locator('#goal-prediction').fill('5');
  await page.locator('#goal-check').click();
  await expect(page.locator('#goal-feedback')).toHaveText(/^Пока не совпало.*6 /);
  await page.locator('#goal-prediction').fill('6');
  await page.locator('#goal-check').click();
  await expect(page.locator('#goal-feedback')).toHaveText(/^Верно.*6 /);
  await expect(page.locator('#course-progress')).toHaveAttribute('value','8');
  await expect(page.locator('#completion-status')).toHaveText(/^Уровень .* пройден/);
}
try {
  await mkdir(out,{recursive:true});
  for (const width of [320,390,768,1440]) {
    const context=await browser.newContext({viewport:{width,height:width<768?844:960},reducedMotion:'reduce'});
    const page=activePage=await context.newPage();
    const errors=[], failed=[], external=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.url().startsWith(site.origin)&&r.status()>=400)failed.push(r.url());});
    page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(site.origin+'/'))external.push(r.url());});
    await page.goto(site.base);
    await page.locator('#finance-course-entry').click();
    await expect(page.locator('#course-app')).toBeVisible();
    errors.length=0;failed.length=0;external.length=0;
    await page.reload();
    await page.screenshot({path:`${out}/finance-${width}-intro.png`,animations:'disabled'});
    await noOverflow(page,`${width}: introduction fits`);
    await expect(page.locator('[data-lesson]')).toHaveCount(6);
    await page.locator('#lesson-card').screenshot({path:`${out}/finance-${width}-lesson.png`,animations:'disabled'});
    await page.locator('#practice').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${out}/finance-${width}-practice.png`,animations:'disabled'});
    if(width===320||width===1440) {
      await solveLessons(page,'10-13'); await practices(page,'10-13');
      await page.reload();
      await expect(page.locator('#course-progress')).toHaveAttribute('value','8');
      await expect(page.locator('#lesson-title')).toHaveText(groups['10-13'].lessons[5].title);
      await page.locator('[data-age="6-9"]').click();
      await expect(page.locator('#course-progress')).toHaveAttribute('value','0');
      await page.locator('[data-age="10-13"]').click();
      await expect(page.locator('#course-progress')).toHaveAttribute('value','8');
      await page.locator('#goal-target').fill('6100');
      await expect(page.locator('#course-progress')).toHaveAttribute('value','7');
      await page.locator('#goal-prediction').fill('7'); await page.locator('#goal-check').click();
      await expect(page.locator('#goal-feedback')).toHaveText(/^Верно.*7 недель/);
      await page.locator('#goal-contribution').fill('0'); await page.locator('#goal-check').click();
      await expect(page.locator('#goal-feedback')).toHaveText(/конечного срока нет/);
      await page.locator('#goal-saved').fill('6100'); await page.locator('#goal-prediction').fill('0'); await page.locator('#goal-check').click();
      await expect(page.locator('#goal-feedback')).toHaveText(/^Верно.*0 недель.*уже достигнута/);
      await page.locator('#goal-target').fill('-1'); await page.locator('#goal-check').click();
      await expect(page.locator('#goal-feedback')).toHaveText(/^Укажи целые числа/);
      await page.locator('#budget-income').fill(''); await page.locator('#budget-check').click();
      await expect(page.locator('#budget-balance')).toHaveText('—');
      await expect(page.locator('#budget-feedback')).toHaveText(/^Заполни все поля/);
      assert(!/NaN|Infinity/.test(await page.locator('#practice').innerText()));
      await page.locator('#reset-progress').click(); await expect(page.locator('#reset-panel')).toBeVisible();
      await page.keyboard.press('Escape'); await expect(page.locator('#reset-panel')).toBeHidden();
      await expect(page.locator('#reset-progress')).toBeFocused();
      await page.locator('[data-age="6-9"]').click();
      await page.locator('#reset-progress').click(); await page.locator('#reset-confirm').click();
      await page.locator('[data-age="10-13"]').click();
      await expect(page.locator('#course-progress')).toHaveAttribute('value','6');
    }
    await noOverflow(page,`${width}: interactive states fit`);
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[],'Course makes no external requests');
    results.push({case:`${width}px navigation, visual states and resources`,status:'PASS'});
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=activePage=await context.newPage();
  await page.goto(site.base+'finance.html');
  for(const age of ['6-9','10-13','14-17']) {
    await page.locator(`[data-age="${age}"]`).click();
    await solveLessons(page,age); await practices(page,age);
    const promise=page.waitForEvent('download'); await page.locator('#export-plan').click(); const download=await promise;
    const text=await readFile(await download.path(),'utf8');
    assert(text.includes(`Уровень: ${groups[age].label}`));
    assert(text.includes('Практика бюджета: пройдена')&&text.includes('Практика накоплений: пройдена'));
    assert.equal((text.match(/: пройдена/g)||[]).length,8);
    await page.reload(); await expect(page.locator('#course-progress')).toHaveAttribute('value','8');
    await noOverflow(page,`${age}: completed course fits`);
    results.push({case:`${age}: all six quizzes, both practices, export and reload`,status:'PASS'});
  }
  await page.locator('[data-lesson="choice"]').click();
  await page.locator('[data-lesson="budget"]').click();
  await page.goBack(); await expect(page.locator('#lesson-title')).toHaveText(groups['14-17'].lessons[0].title);
  for (const theme of ['light','dark','matrix']) {
    await page.locator(`[data-theme-choice="${theme}"]`).click();
    await page.screenshot({path:`${out}/finance-390-${theme}.png`,animations:'disabled'});
    await noOverflow(page,`${theme}: completed course fits`);
  }
  await context.close();

  for(const mode of ['blocked','corrupt']) {
    const isolated=await browser.newContext();
    await isolated.addInitScript(mode=>{
      if(mode==='blocked') Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}});
      else localStorage.setItem('ai-path-finance-v1','{broken');
    },mode);
    const tab=activePage=await isolated.newPage(),errors=[]; tab.on('pageerror',e=>errors.push(e.message));
    await tab.goto(site.base+'finance.html?age=invalid&lesson=%3Cscript%3E');
    await expect(tab.locator('#course-app')).toBeVisible();
    await expect(tab.locator('#storage-status')).toContainText(mode==='blocked'?'Сохранение недоступно':'Повреждённый прогресс');
    await tab.locator('#goal-prediction').fill('6'); await tab.locator('#goal-check').click();
    await expect(tab.locator('#goal-feedback')).toHaveText(/^Верно/);
    assert.deepEqual(errors,[]); await isolated.close();
    results.push({case:`${mode} storage and invalid route recovery`,status:'PASS'});
  }
  const offline=await browser.newContext({viewport:{width:1440,height:960}});
  const file=activePage=await offline.newPage(),requests=[],errors=[];
  file.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());}); file.on('pageerror',e=>errors.push(e.message));
  await file.goto(pathToFileURL(resolve('dist/ai-path/finance-offline.html')).href);
  await file.locator('[data-age="6-9"]').click(); await solveLessons(file,'6-9'); await practices(file,'6-9');
  assert.deepEqual(requests,[],'Offline file needs no HTTP requests'); assert.deepEqual(errors,[]);
  await offline.close(); results.push({case:'offline file:// full level and zero network requests',status:'PASS'});
  console.log('PASS finance: 18 age-specific lessons, honest progress, arithmetic edge cases, recovery, export, themes, responsive screens and offline course.');
} catch(error) {
  if(activePage&&!activePage.isClosed()) await activePage.screenshot({path:`${out}/failure.png`,animations:'disabled'}).catch(()=>{});
  results.push({case:'finance acceptance',status:'FAIL',message:error.message}); throw error;
} finally {
  await writeFile(`${out}/results.json`,JSON.stringify(results,null,2)); await browser.close(); await site.close();
}
