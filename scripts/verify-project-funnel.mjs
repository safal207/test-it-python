import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {expect} from 'playwright/test';
import {startSite, browserOptions} from './qa/site.mjs';
import {demos} from '../dist/ai-path/demo-catalog.js';
import {unityGameConcepts} from '../dist/ai-path/unity-game-concepts.js';

const require = createRequire(import.meta.url);
const output = 'artifacts/project-funnel';
const programIds = ['explore','build','space','furniture','create','comics','qa','game','unity','ml','hack','grant','frontier','books','designlab','vibe','ml-python','ml-data','ml-vision','ml-text','ml-audio','ml-series','ml-tuning','career'];
const journeys = ['website','space','story','app','practice','research'];
const results = [], errors = [], requests = [];
await mkdir(output,{recursive:true});
const site = await startSite();
let browser;
let downloadSequence=0;

async function createPage(width = 1440) {
  const context = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  // Exercise success and denial without sharing the host clipboard with other suites.
  // The legacy acceptance suite separately checks the native clipboard.
  await context.addInitScript(() => {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{
      if(window.__qaClipboardDenied) throw new Error('Clipboard denied for recovery check');
      window.__qaCopiedText=value;
    }}});
    document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.scrollbarGutter='stable';});
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
  page.on('console',message=>{if(message.type()==='error')errors.push({url:page.url(),message:message.text()});});
  page.on('request',request=>{
    if(!request.url().startsWith(site.origin+'/')&&!request.url().startsWith('blob:')&&!request.url().startsWith('data:'))requests.push({url:request.url(),method:request.method()});
    if(!['GET','HEAD'].includes(request.method()))requests.push({url:request.url(),method:request.method()});
  });
  page.on('response',response=>{if(response.status()>=400)errors.push({url:response.url(),status:response.status()});});
  return {context,page};
}
async function go(page,query='') {
  await page.goto(site.base+'project-start.html'+query);
  await expect(page.locator('#project-wizard')).toBeVisible();
  await expect(page.locator('#plan-result')).toBeHidden();
}
async function step(page,number) {
  await expect(page.locator('fieldset[data-step]:visible')).toHaveCount(1);
  await expect(page.locator(`fieldset[data-step="${number}"]`)).toBeVisible();
}
async function next(page) {
  const button=page.locator('#next-step');
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  const current=Number(await page.locator('[data-progress][aria-current="step"]').getAttribute('data-progress'));
  assert([1,2].includes(current),'Next is available only on steps 1 and 2');
  await step(page,current);
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
  await step(page,current+1);
}
async function selectAction(page) {
  const value=await page.locator('#project-action option').evaluateAll(options=>options.find(option=>!option.disabled&&option.value)?.value);
  assert(value,'Each project route provides a concrete visitor action');
  await page.locator('#project-action').selectOption(value);
  return page.locator('#project-action option:checked').innerText();
}
async function planText(page) {
  await expect(page.locator('#plan-result')).toBeVisible();
  await expect(page.locator('#plan-title')).toBeFocused();
  assert(await page.locator('#plan-text').evaluate(element=>element.readOnly));
  const text=await page.locator('#plan-text').inputValue();
  assert(text.length>250,'The plan contains an actual brief, outcome, checks and first step');
  const email=new URL(await page.locator('#plan-email').getAttribute('href'));
  assert.equal(email.protocol,'mailto:');
  assert.equal(email.pathname,'safal0645@gmail.com');
  assert.equal(email.searchParams.get('body'),text,'Email draft matches exactly the visible current brief');
  const course=new URL(await page.locator('#plan-course').getAttribute('href'),page.url());
  assert(programIds.includes(course.searchParams.get('program')),'The plan links to an existing course');
  assert(['zero','basic','project'].includes(course.searchParams.get('level')));
  assert(['light','balanced','deep'].includes(course.searchParams.get('pace')));
  return {text,course};
}
async function download(page) {
  const pending=page.waitForEvent('download');
  await page.locator('#download-plan').click();
  const result=await pending;
  assert.equal(await result.failure(),null);
  assert(result.suggestedFilename().endsWith('.txt'));
  const text=await readFile(await result.path(),'utf8');
  assert.equal(text,await page.locator('#plan-text').inputValue(),'Downloaded brief equals the displayed version');
  const artifact=`brief-${++downloadSequence}.txt`;
  await writeFile(`${output}/${artifact}`,text);
  results.push({label:'download-'+downloadSequence,status:'passed',artifact,filename:result.suggestedFilename(),characters:text.length});
  return text;
}
async function privateFieldsStayLocal(page,markers) {
  const saved=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
  for(const marker of markers){assert(!page.url().includes(marker));assert(!saved.includes(marker),'Free text must not enter browser storage');}
}
async function inspect(page,label) {
  const bounds=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert(bounds.scroll<=bounds.width+1,`${label}: horizontal overflow ${JSON.stringify(bounds)}`);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const audit=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
  // Axe can mark a scrolled native textarea incomplete. Verify its solid text/
  // background colors independently; retain the original axe note as evidence.
  const textareaContrast=await page.locator('textarea:visible').evaluateAll(elements=>elements.map(element=>{
    const style=getComputedStyle(element);
    const luminance=color=>{
      const components=color.match(/[\d.]+/g).map(Number);
      if(components.length>3&&components[3]!==1)throw new Error('Textarea contrast requires an opaque computed color');
      const linear=components.slice(0,3).map(value=>{const s=value/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});
      return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
    };
    const text=luminance(style.color),background=luminance(style.backgroundColor);
    return {id:element.id,color:style.color,background:style.backgroundColor,ratio:(Math.max(text,background)+.05)/(Math.min(text,background)+.05)};
  }));
  for(const field of textareaContrast)assert(field.ratio>=4.5,`${label}: ${field.id} text contrast ${field.ratio.toFixed(2)} < 4.5`);
  const record={label,bounds,textareaContrast,violations:audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),manualReview:audit.incomplete.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))};
  results.push(record);
  await page.screenshot({path:`${output}/${label}.png`,fullPage:true,animations:'disabled'});
  assert.deepEqual(record.violations,[],`${label}: accessible controls and content`);
}
async function themes(page,label) {
  for(const theme of ['light','dark','matrix']) {
    await page.locator(`[data-theme-choice="${theme}"]`).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    await inspect(page,`${label}-${theme}`);
  }
  await page.locator('[data-theme-choice="light"]').click();
}

async function teachingAssets(page) {
  await page.goto(site.base+'unity.html');
  const hrefs=await page.locator('#first-lesson a[href]').evaluateAll(links=>links.map(link=>link.href));
  const materials=hrefs.map(href=>new URL(href)).filter(url=>/\/teaching\/unity\/[^/]+\.(html|pdf|pptx)$/.test(url.pathname));
  assert.equal(materials.length,6,'Unity offers two slide views and four downloadable files');
  for(const extension of ['html','pdf','pptx'])assert.equal(materials.filter(url=>url.pathname.endsWith('.'+extension)).length,2);
  assert.equal(new Set(materials.map(url=>url.href)).size,6,'Both decks have distinct HTML/PDF/PPTX links');
  for(const url of materials) {
    assert.equal(url.origin,site.origin,'Course material checks remain local');
    const response=await page.request.get(url.href);
    assert.equal(response.status(),200,`Linked material exists: ${url.pathname}`);
    const body=await response.body();
    if(url.pathname.endsWith('.pdf'))assert.equal(body.subarray(0,5).toString('ascii'),'%PDF-','PDF download contains a PDF document');
    else if(url.pathname.endsWith('.pptx'))assert.deepEqual([...body.subarray(0,4)],[0x50,0x4b,0x03,0x04],'PPTX download contains a ZIP-based Office document');
    else assert(/<!doctype html/i.test(body.toString('utf8'))&&/<title>/i.test(body.toString('utf8')),'Slide view is an HTML document');
    results.push({label:'teaching-'+url.pathname.split('/').at(-1),status:'passed',bytes:body.length});
  }
}

async function stableCatalogLoading(page) {
  let resume;
  const ready=new Promise(resolve=>{resume=resolve;});
  await page.route('**/demos.js',async route=>{await ready;await route.continue();});
  const navigation=page.goto(site.base+'demos.html');
  let before;
  try {
    await expect(page.locator('#journey-choices [data-journey-choice]')).toHaveCount(7);
    await expect(page.locator('#journey-choices button:disabled')).toHaveCount(7);
    await expect(page.locator('#catalog-title')).toBeVisible();
    await page.waitForFunction(()=>getComputedStyle(document.getElementById('journey-choices')).display==='flex');
    await page.evaluate(()=>{document.documentElement.style.scrollbarGutter='stable';});
    before=await page.locator('#catalog-title').evaluate(element=>element.getBoundingClientRect().top+scrollY);
  } finally {
    resume();await navigation;await page.unroute('**/demos.js');
  }
  await expect(page.locator('#journey-choices button:enabled')).toHaveCount(7);
  await expect(page.locator('#demo-grid .demo-card')).toHaveCount(17);
  const after=await page.locator('#catalog-title').evaluate(element=>element.getBoundingClientRect().top+scrollY);
  assert(Math.abs(after-before)<=1,`Loading the journey controls does not push the catalog down: ${before} → ${after}`);
  results.push({label:'catalog-delayed-module-layout',status:'passed',before,after,defaultCards:17});
}

async function stableWizardLoading(page) {
  await page.setViewportSize({width:390,height:844});
  let resume;
  const ready=new Promise(resolve=>{resume=resolve;});
  await page.route('**/project-start.js',async route=>{await ready;await route.continue();});
  const navigation=page.goto(site.base+'project-start.html');
  let before;
  try {
    await expect(page.locator('#project-wizard')).toBeVisible();
    await expect(page.locator('input[name="journey"]')).toHaveCount(6);
    await expect(page.locator('#next-step')).toBeDisabled();
    await page.waitForFunction(()=>getComputedStyle(document.getElementById('journey-choices')).display==='grid');
    // Apply the suite's gutter before the deferred module can fire DOMContentLoaded.
    await page.evaluate(()=>{document.documentElement.style.scrollbarGutter='stable';});
    before=await page.locator('.plan-preview').evaluate(element=>element.getBoundingClientRect().top+scrollY);
  } finally {
    resume();await navigation;await page.unroute('**/project-start.js');
  }
  await expect(page.locator('#next-step')).toBeEnabled();
  await expect(page.locator('input[name="journey"]')).toHaveCount(6);
  const after=await page.locator('.plan-preview').evaluate(element=>element.getBoundingClientRect().top+scrollY);
  assert(Math.abs(after-before)<=1,`Loading the wizard does not push its preview down: ${before} → ${after}`);
  results.push({label:'wizard-delayed-module-layout',status:'passed',before,after,width:390});
}

async function delayedWizardKeyboard(page) {
  await page.goto(site.base+'studio.html?program=unity&level=basic&pace=light');
  let resume;
  const ready=new Promise(resolve=>{resume=resolve;});
  await page.route('**/project-start.js',async route=>{await ready;await route.continue();});
  const navigation=page.locator('#mori .case-plan').click();
  let first;
  try {
    await expect(page.locator('#project-wizard')).toBeVisible();
    await expect(page.locator('#next-step')).toBeDisabled();
    // Start the real keyboard helper while the application module is blocked.
    // It must wait for the enabled control, then verify the resulting step.
    first=next(page);
    await expect(page.locator('#next-step')).toBeDisabled();
  } finally {
    resume();await navigation;await page.unroute('**/project-start.js');
  }
  await first;
  await next(page);
  await expect(page.locator('#make-plan')).toBeVisible();
  await page.locator('#make-plan').click();
  const plan=await planText(page);
  assert.equal(plan.course.searchParams.get('program'),'designlab');
  assert.equal(plan.course.searchParams.get('level'),'basic');
  assert.equal(plan.course.searchParams.get('pace'),'light');
  results.push({label:'studio-mori-delayed-wizard-keyboard',status:'passed'});
}

try {
  browser=await chromium.launch(browserOptions);
  for(const width of [320,390,1440]) {
    const {context,page}=await createPage(width);
    await go(page,'?project=pocitel&mode=build&level=basic&pace=light');
    await step(page,1);
    await expect(page.locator('input[name="journey"]:checked')).toHaveValue('website');
    const example=new URL(await page.locator('#selected-example').getAttribute('href'),page.url());
    assert(example.pathname.endsWith('/examples/pocitel.html'));
    await themes(page,`step1-${width}`);
    await next(page);await step(page,2);
    await expect(page.locator('input[name="mode"][value="build"]')).toBeChecked();
    await expect(page.locator('#project-level')).toHaveValue('basic');
    await expect(page.locator('#project-pace')).toHaveValue('light');
    await themes(page,`step2-${width}`);
    await page.locator('#previous-step').click();await step(page,1);
    await next(page);await step(page,2);
    await expect(page.locator('input[name="mode"][value="build"]')).toBeChecked();
    await next(page);await step(page,3);
    const audience='PRIVATE-QA-AUDIENCE: гости небольшой мастерской';
    const idea='PRIVATE-QA-IDEA: <img src=x onerror="window.__qaInjected=1"> & выбрать услугу';
    await page.locator('#project-audience').fill('A'.repeat(105));
    assert.equal((await page.locator('#project-audience').inputValue()).length,100);
    await page.locator('#project-idea').fill('B'.repeat(245));
    assert.equal((await page.locator('#project-idea').inputValue()).length,240);
    await page.locator('#project-audience').fill(audience);
    await page.locator('#project-idea').fill(idea);
    assert.equal(await page.locator('#project-audience').getAttribute('maxlength'),'100');
    assert.equal(await page.locator('#project-idea').getAttribute('maxlength'),'240');
    const action=await selectAction(page);
    await themes(page,`step3-${width}`);
    await page.locator('#make-plan').focus();await page.keyboard.press('Enter');
    const plan=await planText(page);
    assert.equal(plan.course.searchParams.get('program'),'build');
    for(const value of ['Pocitel',audience,idea,action])assert(plan.text.includes(value),`Brief includes chosen value: ${value}`);
    assert.equal(await page.evaluate(()=>window.__qaInjected),undefined,'Markup is treated as plain text');
    await privateFieldsStayLocal(page,['PRIVATE-QA-AUDIENCE','PRIVATE-QA-IDEA']);
    await download(page);
    await page.locator('#copy-plan').click();
    assert.equal(await page.evaluate(()=>window.__qaCopiedText),plan.text,'Copy success receives exact visible content');
    await expect(page.locator('#copy-status')).not.toBeEmpty();
    await page.evaluate(()=>{window.__qaClipboardDenied=true;});
    await page.locator('#copy-plan').click();
    await expect(page.locator('#plan-text')).toBeVisible();
    await expect(page.locator('#copy-status')).not.toBeEmpty();
    await expect(page.locator('#copy-status')).toHaveAttribute('role','status');
    await themes(page,`plan-${width}`);
    await page.locator('#edit-plan').click();await step(page,3);
    await expect(page.locator('#project-idea')).toHaveValue(idea);
    await page.locator('#project-idea').fill('PRIVATE-QA-UPDATED: каталог с записью на встречу');
    await page.locator('#make-plan').click();
    const changed=await planText(page);
    assert(changed.text.includes('PRIVATE-QA-UPDATED'));
    assert(!changed.text.includes('PRIVATE-QA-IDEA'),'Editing replaces the old brief in every output');
    await download(page);
    await page.locator('#new-plan').click();
    await expect(page.locator('#project-idea')).toHaveValue('');
    await expect(page.locator('#project-audience')).toHaveValue('');
    await expect(page.locator('#plan-result')).toBeHidden();
    await page.reload();
    await expect(page.locator('#project-idea')).toHaveValue('');
    await expect(page.locator('#project-audience')).toHaveValue('');
    await context.close();
  }

  const {context,page}=await createPage();
  await go(page,'?project=flora&mode=learn&level=zero&pace=balanced');
  await next(page);await step(page,2);
  await expect(page.locator('input[name="mode"][value="learn"]')).toBeChecked();
  await next(page);await selectAction(page);await page.locator('#make-plan').click();
  const flora=await planText(page);
  assert(flora.text.includes('FLORA'));
  assert.equal(flora.course.searchParams.get('program'),'designlab');

  await go(page,'?journey=story&program=unity&mode=build&level=project&pace=deep');
  await expect(page.locator('input[name="journey"][value="story"]')).toBeChecked();
  assert.equal(new URL(page.url()).searchParams.get('program'),'unity');
  await next(page);
  await expect(page.locator('input[name="mode"][value="build"]')).toBeDisabled();
  await expect(page.locator('input[name="mode"][value="learn"]')).toBeChecked();
  await next(page);await selectAction(page);await page.locator('#make-plan').click();
  const unity=await planText(page);
  assert.equal(unity.course.searchParams.get('program'),'unity');
  assert.equal(unity.course.searchParams.get('level'),'project');
  assert.equal(unity.course.searchParams.get('pace'),'deep');
  assert(unity.text.includes('Unity')&&unity.text.includes('C#'),'Unity brief describes the actual Unity/C# route');
  await download(page);
  results.push({label:'unity-course-handoff',program:'unity',status:'passed'});

  for (const concept of unityGameConcepts) {
    await page.goto(site.base+'unity.html?program=unity&level=basic&pace=light');
    await page.locator(`a[href*="gameIdea=${concept.id}"]`).click();
    await expect(page.locator('#preview-title')).toHaveText(concept.title);
    assert.equal(new URL(page.url()).searchParams.get('gameIdea'),concept.id);
    await page.reload();
    await expect(page.locator('#preview-title')).toHaveText(concept.title);
    await next(page);
    await expect(page.locator('input[name="mode"][value="build"]')).toBeDisabled();
    await next(page); await selectAction(page); await page.locator('#make-plan').click();
    const chosen=await planText(page);
    for(const value of [concept.title,concept.platform,concept.controls,...concept.deliverables,...concept.checks]) assert(chosen.text.includes(value),'Chosen game scope survives into the brief');
    assert.equal(chosen.course.searchParams.get('program'),'unity');
    assert.equal(chosen.course.searchParams.get('level'),'basic');
    assert.equal(chosen.course.searchParams.get('pace'),'light');
    await download(page);
    await page.locator('#edit-plan').click();
    await expect(page.locator('#project-action')).toHaveValue(concept.actions[0]);
    await page.locator('#make-plan').click();
    await page.locator('#new-plan').click();
    assert.equal(new URL(page.url()).searchParams.has('gameIdea'),false);
    results.push({label:`unity-concept-${concept.id}`,status:'passed'});
  }
  for(const tail of ['&gameIdea=unknown-game','&gameIdea=%3Cscript%3E','&gameIdea=moon-jump&project=mori','&gameIdea=moon-jump&project=game']) {
    await go(page,'?journey=story&program=unity'+tail);
    await expect(page.locator('#next-step')).toBeEnabled();
    assert.equal(new URL(page.url()).searchParams.has('gameIdea'),false,'Unknown or conflicting concept context is discarded');
  }
  await go(page,'?journey=story&program=unity&gameIdea=moon-jump');
  await page.locator('input[name="journey"][value="website"]').check();
  await page.locator('input[name="journey"][value="story"]').check();
  assert.equal(new URL(page.url()).searchParams.has('gameIdea'),false,'Changing direction clears the old game choice');
  results.push({label:'unity-concept-context-guards',status:'passed'});

  await go(page,'?journey=website&program=unity');
  await next(page);await next(page);await page.locator('#make-plan').click();
  assert.equal((await planText(page)).course.searchParams.get('program'),'build','Unity override is limited to the story route');

  await page.goto(site.base+'studio.html?program=unity&level=basic&pace=light');
  await page.locator('#mori .case-plan').click();
  await expect(page.locator('#project-wizard')).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get('project'),'mori');
  await next(page);await next(page);await page.locator('#make-plan').click();
  const mori=await planText(page);
  assert.equal(mori.course.searchParams.get('program'),'designlab','Studio source takes priority over an inherited Unity context');
  assert.equal(mori.course.searchParams.get('level'),'basic');
  assert.equal(mori.course.searchParams.get('pace'),'light');
  assert(!mori.text.includes('C#'),'Mori brief must not become a Unity scripting brief');
  results.push({label:'unity-context-studio-mori',program:'designlab',status:'passed'});

  for(const [project,program] of [['book','books'],['comics','comics']]) {
    await go(page,`?project=${project}&journey=story&program=unity&mode=learn`);
    assert.notEqual(new URL(page.url()).searchParams.get('program'),'unity');
    await next(page);await next(page);await page.locator('#make-plan').click();
    const plan=await planText(page);
    assert.equal(plan.course.searchParams.get('program'),program,`${project}: inherited Unity context cannot replace the selected medium`);
    assert(!plan.text.includes('C#'));
    results.push({label:`unity-context-${project}`,program,status:'passed'});
  }

  for(const journey of journeys) {
    await go(page,`?journey=${journey}&mode=build&level=basic&pace=deep`);
    await expect(page.locator(`input[name="journey"][value="${journey}"]`)).toBeChecked();
    await next(page);
    if(['practice','research'].includes(journey)) {
      await expect(page.locator('input[name="mode"][value="build"]')).toBeDisabled();
      await expect(page.locator('input[name="mode"][value="learn"]')).toBeChecked();
    }
    await next(page);await selectAction(page);
    await page.locator('#make-plan').click();
    const route=await planText(page);
    assert.equal(route.course.searchParams.get('level'),'basic');
    assert.equal(route.course.searchParams.get('pace'),'deep');
    results.push({label:`journey-${journey}`,program:route.course.searchParams.get('program'),status:'passed'});
  }
  const malicious=encodeURIComponent('<img src=x onerror="window.__qaInjected=1">');
  await go(page,`?project=${malicious}&journey=constructor&program=constructor&mode=__proto__&level=invalid&pace=invalid`);
  assert(journeys.includes(await page.locator('input[name="journey"]:checked').inputValue()));
  await expect(page.locator('#selected-example')).toBeHidden();
  await next(page);
  await expect(page.locator('input[name="mode"][value="learn"]')).toBeChecked();
  await expect(page.locator('#project-level')).toHaveValue('zero');
  await expect(page.locator('#project-pace')).toHaveValue('balanced');
  assert.equal(await page.evaluate(()=>window.__qaInjected),undefined);
  await context.close();

  const entries=await createPage();
  for(const route of ['demos.html','studio.html','unity.html','examples/pocitel.html','examples/flora.html','examples/mori.html','examples/dal.html','examples/ai-desk.html','examples/plan-to-space.html','examples/my-cosmos.html','game-lab.html','vibe-coding/crm-demo.html']) {
    await entries.page.goto(site.base+route);
    const links=entries.page.locator('a[href*="project-start.html"]');
    assert(await links.count()>0,`${route} offers a next step from the working example`);
    for(const href of await links.evaluateAll(elements=>elements.map(element=>element.href))) {
      const target=new URL(href);
      assert.equal(target.origin,site.origin);
      const source=target.searchParams.get('project');
      if(source)assert(demos.some(demo=>demo.id===source),`${route}: known example ${source}`);
    }
  }
  await stableCatalogLoading(entries.page);
  await stableWizardLoading(entries.page);
  await delayedWizardKeyboard(entries.page);
  await teachingAssets(entries.page);
  await entries.context.close();
  assert.deepEqual(errors,[],'No runtime, console or resource failures');
  assert.deepEqual(requests,[],'Brief construction does not send forms or contact third parties');
  console.log('Project funnel passed: examples→brief→draft/export, all six routes, editing/reset, input safety/privacy, keyboard/copy recovery, 3 widths × 3 themes × 4 states, entry links.');
} catch(error) {
  results.push({label:'failure',message:error.message});
  throw error;
} finally {
  await writeFile(`${output}/results.json`,JSON.stringify({results,errors,requests},null,2));
  await browser?.close();
  await site.close();
}
