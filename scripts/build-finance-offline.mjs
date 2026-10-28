import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const dir = 'dist/ai-path/';
const [html, css, themeCss, theme, data, activities, app] = await Promise.all(['finance.html','finance.css','theme.css','theme.js','finance-content.js','finance-activities.js','finance.js'].map(file => readFile(dir + file,'utf8')));
const sandbox = { window: {} };
runInNewContext(data,sandbox);
const { groups } = sandbox.window.AIPathFinance;
assert.deepEqual(Object.keys(groups),['6-9','10-13','14-17']);
for (const [age,group] of Object.entries(groups)) {
  assert.equal(group.lessons.length,6,`${age}: six complete lessons`);
  assert.equal(new Set(group.lessons.map(lesson => lesson.id)).size,6);
  for (const lesson of group.lessons) {
    for (const field of ['title','duration','example','action','question','feedback']) assert(lesson[field]?.length > 5,`${age}/${lesson.id}: ${field}`);
    assert.equal(lesson.paragraphs.length,2);
    assert.equal(lesson.options.length,3);
    assert(Number.isInteger(lesson.answer) && lesson.answer >= 0 && lesson.answer < lesson.options.length);
  }
  const { income,needs,fun,save,reserve,minNeeds,minSave,minReserve } = group.budget;
  assert.equal(income, needs + fun + save + reserve,`${age}: initial budget balances`);
  assert(needs >= minNeeds && save >= minSave && reserve >= minReserve);
  assert(group.goal.target > group.goal.saved && group.goal.contribution > 0);
}
assert(!/<\/script/i.test(data + activities + app + theme),'Inline scripts cannot terminate their HTML wrapper');
let result = html
  .replace('<script src="theme.js?v=1"></script>',() => '<script>\n' + theme + '\n</script>')
  .replace('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">','')
  .replace('<link rel="stylesheet" href="theme.css?v=1">',() => '<style>\n' + themeCss + '\n</style>')
  .replace('<link rel="stylesheet" href="finance.css?v=2">',() => '<style>\n' + css + '\n</style>')
  .replace('<a class="quiet" id="offline-download" href="finance-offline.html" download>Скачать курс для офлайн ↓</a>','<span class="quiet">Курс открыт в офлайн-версии</span>')
  .replaceAll('href="./"','href="https://safal207.github.io/test-it-python/ai-path/"')
  .replace('<script src="finance-content.js?v=1"></script>',() => '<script>\n' + data + '\n</script>')
  .replace('<script src="finance-activities.js?v=1"></script>',() => '<script>\n' + activities + '\n</script>')
  .replace('<script src="finance.js?v=2"></script>',() => '<script>\n' + app + '\n</script>');
for (const age of Object.keys(groups)) {
  const name = `assets/finance-kids/ages-${age}.webp`;
  const bytes = await readFile(dir + name);
  assert(bytes.length > 10000 && bytes.length < 150000,`${age}: optimized original illustration`);
  result = result.replaceAll(`src="${name}"`,() => `src="data:image/webp;base64,${bytes.toString('base64')}"`);
}
assert(!/src="(?!data:)/.test(result) && !/<link\s+rel="stylesheet"/i.test(result),'Standalone course must have no external runtime assets');
const path = dir + 'finance-offline.html';
if (process.argv.includes('--check')) {
  assert.equal(await readFile(path,'utf8'),result,'Offline course is stale; run npm run build:finance-offline');
  console.log('Finance: 18 original age-specific lessons and the standalone HTML match source.');
} else {
  await writeFile(path,result);
  console.log(`Built standalone finance course (${Buffer.byteLength(result)} bytes).`);
}
