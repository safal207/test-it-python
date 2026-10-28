import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const dir='dist/ai-path/';
const [theme,themeCss,baseCss,courseCss,content,app,image] = await Promise.all(['theme.js','theme.css','finance.css','life-skills.css','life-skills-content.js','life-skills.js','assets/life-skills/planning.webp'].map(async file => file.endsWith('.webp') ? readFile(dir+file) : readFile(dir+file,'utf8')));
const context={window:{}}; runInNewContext(content,context);
for (const course of ['goals','time']) {
 const lessons=context.window.AIPathLifeSkills[course]; assert.equal(lessons.length,5);
 assert.equal(new Set(lessons.map(l=>l.id)).size,5);
 for(const lesson of lessons){
  assert(lesson.title.length>3 && lesson.rule.length>20);
  for(const quiz of [lesson.quiz,...['6-9','10-13','14-17'].map(age=>lesson.cases[age])]){
   assert(quiz.question.length>8 && quiz.hint.length>8 && quiz.choices.length===3);
   assert(Number.isInteger(quiz.answer) && quiz.answer>=0 && quiz.answer<quiz.choices.length);
  }
  for(const age of ['6-9','10-13','14-17']) assert(lesson.cases[age].story.length>20 && lesson.cases[age].example.length>15);
 }
}
assert(!/<\/script/i.test(content+app+theme));
assert(image.length>10000 && image.length<200000);
const origin='https://safal207.github.io/test-it-python/ai-path/';
for(const [name,output] of [['goals.html','goals-offline.html'],['time-management.html','time-management-offline.html']]){
 let html=await readFile(dir+name,'utf8');
 html=html.replace('<script src="theme.js?v=1"></script>',()=>'<script>\n'+theme+'\n</script>')
  .replace('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">','')
  .replace('<link rel="stylesheet" href="theme.css?v=1">',()=>'<style>\n'+themeCss+'\n</style>')
  .replace('<link rel="stylesheet" href="finance.css?v=2">',()=>'<style>\n'+baseCss+'\n</style>')
  .replace('<link rel="stylesheet" href="life-skills.css?v=1">',()=>'<style>\n'+courseCss+'\n</style>')
  .replace(/<a class="quiet" id="offline-download"[^>]+>[^<]+<\/a>/,'<span class="quiet">Курс открыт в офлайн-версии</span>')
  .replaceAll('href="./"',`href="${origin}"`)
  .replaceAll('href="finance.html"',`href="${origin}finance.html"`)
  .replaceAll('href="goals.html"',`href="${origin}goals.html"`)
  .replaceAll('href="time-management.html"',`href="${origin}time-management.html"`)
  .replaceAll('src="assets/life-skills/planning.webp"',`src="data:image/webp;base64,${image.toString('base64')}"`)
  .replace('<script src="life-skills-content.js?v=1"></script>',()=>'<script>\n'+content+'\n</script>')
  .replace('<script src="life-skills.js?v=1"></script>',()=>'<script>\n'+app+'\n</script>');
 assert(!/src="(?!data:)/.test(html) && !/<link\s+rel="stylesheet"/i.test(html),`${name}: offline assets`);
 if(process.argv.includes('--check')) assert.equal(await readFile(dir+output,'utf8'),html,`${output} is stale`);
 else await writeFile(dir+output,html);
 console.log(`${output}: ${Buffer.byteLength(html)} bytes`);
}
