import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const dir='dist/ai-path/';
const [theme,themeCss,baseCss,courseCss,content,storage,app]=await Promise.all(['theme.js','theme.css','finance.css','life-skills.css','life-skills-content.js','life-skills-storage.js','life-skills.js'].map(file=>readFile(dir+file,'utf8')));
const context={window:{}};runInNewContext(content,context);
const questions=[];
for(const course of ['goals','time']){
 const lessons=context.window.AIPathLifeSkills[course];assert.equal(lessons.length,5);assert.equal(new Set(lessons.map(l=>l.id)).size,5);
 for(const lesson of lessons){
  assert(lesson.title.length>3 && lesson.rule.length>20);
  assert.equal(new Set(Object.values(lesson.checks).map(c=>c.question)).size,3,'Each age has a distinct check');
  for(const quiz of [...Object.values(lesson.checks),...['6-9','10-13','14-17'].map(age=>lesson.cases[age])]){
   assert(quiz.question.length>8 && quiz.hint.length>8 && quiz.choices.length===3);
   assert(Number.isInteger(quiz.answer) && quiz.answer>=0 && quiz.answer<quiz.choices.length);
  }
  for(const check of Object.values(lesson.checks)){assert(check.explanation.length>20);questions.push(check.question);}
  for(const age of ['6-9','10-13','14-17'])assert(lesson.cases[age].story.length>20 && lesson.cases[age].example.length>15);
 }
}
assert.equal(new Set(questions).size,30,'Thirty original age-specific checks');
for(const kind of ['checks','cases']){const answers=Object.values(context.window.AIPathLifeSkills).flatMap(lessons=>lessons.flatMap(l=>Object.values(l[kind]).map(item=>item.answer)));for(const index of [0,1,2])assert(answers.filter(a=>a===index).length<=answers.length/2,'Answer keys must not favor one position');}
assert(!/<\/script/i.test(content+storage+app+theme));
const media={};
for(const key of ['goal','steps','project','day','focus','rest'])for(const suffix of ['','-thumb']){
 const path='assets/life-skills/cards/'+key+suffix+'.webp',bytes=await readFile(dir+path);
 assert(bytes.length>1000 && bytes.length<150000,`${path}: optimized original illustration`);
 media[path]='data:image/webp;base64,'+bytes.toString('base64');
}
const origin='https://safal207.github.io/test-it-python/ai-path/';
for(const [name,output] of [['goals.html','goals-offline.html'],['time-management.html','time-management-offline.html']]){
 let html=await readFile(dir+name,'utf8');
 html=html.replace('<script src="theme.js?v=1"></script>',()=>'<script>\n'+theme+'\n</script>')
  .replace('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">','')
  .replace('<link rel="stylesheet" href="theme.css?v=1">',()=>'<style>\n'+themeCss+'\n</style>')
  .replace('<link rel="stylesheet" href="finance.css?v=2">',()=>'<style>\n'+baseCss+'\n</style>')
  .replace('<link rel="stylesheet" href="life-skills.css?v=2">',()=>'<style>\n'+courseCss+'\n</style>')
  .replace(/<a class="quiet" id="offline-download"[^>]+>[^<]+<\/a>/,'<span class="quiet">Курс открыт в офлайн-версии</span>')
  .replaceAll('href="./"',`href="${origin}"`)
  .replaceAll('href="finance.html"',`href="${origin}finance.html"`)
  .replaceAll('href="goals.html"',`href="${origin}goals.html"`)
  .replaceAll('href="time-management.html"',`href="${origin}time-management.html"`)
  .replace('<script src="life-skills-content.js?v=2"></script>',()=>'<script>\n'+content+'\n</script>')
  .replace('<script src="life-skills-storage.js?v=2"></script>',()=>'<script>\nwindow.AIPathLifeSkillsMedia='+JSON.stringify(media)+';\n'+storage+'\n</script>')
  .replace('<script src="life-skills.js?v=2"></script>',()=>'<script>\n'+app+'\n</script>');
 for(const [path,data] of Object.entries(media))html=html.replaceAll('src="'+path+'"','src="'+data+'"');
 assert(!/src="(?!data:)/.test(html) && !/<link\s+rel="stylesheet"/i.test(html),`${name}: offline assets`);
 if(process.argv.includes('--check'))assert.equal(await readFile(dir+output,'utf8'),html,`${output} is stale`);
 else await writeFile(dir+output,html);
 console.log(`${output}: ${Buffer.byteLength(html)} bytes; all twelve image renditions embedded`);
}
