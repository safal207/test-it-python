import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {expect} from 'playwright/test';
import {startSite, browserOptions} from './qa/site.mjs';

const require = createRequire(import.meta.url);
const out = 'artifacts/ai-path-brand-demos';
await mkdir(out, {recursive:true});
const site = await startSite();
const browser = await chromium.launch(browserOptions);
const results = [];
async function download(page, selector, suffix) {
  const waiting = page.waitForEvent('download');
  await page.locator(selector).click();
  const item = await waiting;
  assert.equal(await item.failure(), null);
  assert(item.suggestedFilename().endsWith(suffix));
  const path = `${out}/${item.suggestedFilename()}`;
  await item.saveAs(path);
  return readFile(path, 'utf8');
}
async function svgText(page, source) {
  return page.evaluate(source => {
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
    if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('Invalid SVG');
    if (doc.querySelector('script, foreignObject')) throw new Error('Executable SVG content');
    return doc.documentElement.textContent.replace(/\s+/g,' ').trim();
  }, source);
}
async function flora(page) {
  const original = await page.locator('.botanical-drawing').innerHTML();
  await page.locator('[data-flora-preset="studio"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-mood','bold');
  await expect(page.locator('#flora-moodboard')).toHaveAttribute('data-size','space');
  await expect(page.locator('#flora-moodboard')).toHaveAttribute('data-density','lush');
  assert.notEqual(await page.locator('.botanical-drawing').innerHTML(), original, 'Density changes actual artwork');
  const name = 'Наш <сад> & "свет"';
  await page.locator('#flora-project-name').fill(name);
  await expect(page.locator('#flora-project-label')).toHaveText(name);
  const source = await download(page,'#flora-download','.svg');
  const text = await svgText(page,source);
  for (const value of [name,'Живой характер','Композиция для пространства / 02','#702b46','Три ветви']) assert(text.includes(value),value);
  assert(source.includes('&lt;сад&gt;'), 'Custom text is XML escaped');
  await page.locator('#flora-project-name').fill('');
  await expect(page.locator('#flora-project-label')).toHaveText('Мой визуальный бриф');
  await page.locator('#flora-reset').click();
  await expect(page.locator('#flora-project-name')).toHaveValue('Камерный ужин');
  await expect(page.locator('#flora-moodboard')).toHaveAttribute('data-density','minimal');
  assert.equal(await page.locator('.botanical-drawing').innerHTML(),original);
  await page.locator('[data-flora-preset="studio"]').click();
}
async function mori(page, thorough) {
  const paths = thorough ? Array.from({length:8},(_,i)=>[(i>>2)&1,(i>>1)&1,i&1]) : [[1,0,0],[0,1,1]];
  for(const choices of paths) {
    await expect(page.locator('#mori-back')).toBeDisabled();
    for(const choice of choices) {
      await page.locator(`[data-choice="${choice}"]`).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#story-title')).toBeFocused();
    }
    await expect(page.locator('#mori-story')).toHaveAttribute('data-ending',choices[2]?'beacon':'grove');
    await expect(page.locator('#story-visual')).toHaveAttribute('data-companion',String(choices[1]===0));
    await expect(page.locator('#story-visual')).toHaveAttribute('data-shelter',String(choices[1]===1));
    await expect(page.locator('#mori-decisions li')).toHaveCount(3);
    const text=await svgText(page,await download(page,'#mori-save','.svg'));
    assert(text.includes(await page.locator('#ending-title').innerText()));
    for(const decision of await page.locator('#mori-decisions li').allTextContents()) assert(text.includes(decision));
    await page.locator('#mori-back').click();
    await expect(page.locator('#mori-story')).toHaveAttribute('data-chapter','3');
    await expect(page.locator('#mori-story')).toHaveAttribute('data-ending','');
    await expect(page.locator('#mori-save')).toBeHidden();
    await page.locator(`[data-choice="${1-choices[2]}"]`).click();
    await expect(page.locator('#mori-story')).toHaveAttribute('data-ending',choices[2]?'grove':'beacon');
    await page.locator('#story-restart').click();
    await expect(page.locator('#mori-story')).toHaveAttribute('data-chapter','1');
    await expect(page.locator('#story-visual')).toHaveAttribute('data-companion','false');
    await expect(page.locator('#mori-decisions')).toContainText('Пока ни одного решения');
  }
  for(const choice of [1,0,0]) await page.locator(`[data-choice="${choice}"]`).click();
}
async function dal(page) {
  const incomplete=await download(page,'#dal-save-journal','.txt');
  assert(incomplete.includes('[Идея кадра пока не записана]'));
  const ideas=['Отражение луны <&> на камнях','Бухта на закате','Чай на фоне воды'];
  for(let i=0;i<3;i++) {
    await page.locator(`[data-stop-index="${i}"]`).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(`[data-stop-index="${i}"]`)).toHaveAttribute('aria-pressed','true');
    await page.locator('#dal-note').fill(ideas[i]);
  }
  await expect(page.locator('#dal-note-count')).toContainText('3 из 3');
  const full=await download(page,'#dal-save-journal','.txt');
  assert(!full.includes('[Идея кадра пока не записана]'));
  for(const idea of ideas) assert(full.includes(idea));
  await page.locator('[data-route="forest"]').click();
  await expect(page.locator('#dal-note-count')).toContainText('0 из 3');
  await page.locator('#dal-use-idea').click();
  await expect(page.locator('#dal-note')).toHaveValue(await page.locator('#dal-shot-prompt').innerText());
  await page.locator('#dal-clear-journal').click();
  await expect(page.locator('#dal-note-count')).toContainText('0 из 3');
  await page.locator('[data-route="shore"]').click();
  await expect(page.locator('#dal-note-count')).toContainText('3 из 3');
  await expect(page.locator('#dal-note')).toHaveValue(ideas[0]);
  await page.locator('#dal-next-stop').click();
  await expect(page.locator('#dal-note')).toHaveValue(ideas[1]);
  await expect(page.locator('#dal-note')).toBeFocused();
}
try {
  for(const width of [320,390,1440]) {
    for(const [name,interaction,section] of [['flora',flora,'#flora-builder'],['mori',mori,'#story'],['dal',dal,'#dal-routes']]) {
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      const page=await context.newPage(), errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
      await page.goto(site.base+'examples/'+name+'.html');
      await page.addStyleTag({content:'html{overflow-y:scroll}'});
      await interaction(page,width===1440);
      const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert(dimensions.scroll<=dimensions.width+1,`${name} overflows ${width}: ${JSON.stringify(dimensions)}`);
      await page.locator(section).screenshot({path:`${out}/${name}-${width}.png`,animations:'disabled'});
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const audit=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
      await writeFile(`${out}/${name}-${width}-axe.json`,JSON.stringify(audit,null,2));
      assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${name} accessibility ${width}`);
      assert.deepEqual(errors,[],`${name} console ${width}`);
      results.push({name,width,status:'passed',dimensions,axeViolations:audit.violations.length,manualReview:audit.incomplete.length});
      await context.close();
    }
  }
  console.log('Brand demos: functional outcomes, exported contents, reset/back, 8 story paths, responsive and axe checks passed.');
} finally {
  await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
  await browser.close();
  await site.close();
}
