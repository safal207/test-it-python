import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = 'dist/ai-path/';
const page = readFileSync(root + '3d-academy.html', 'utf8');
const script = readFileSync(root + '3d-academy.js', 'utf8');
const home = readFileSync(root + 'index.html', 'utf8');
const sitemap = readFileSync(root + 'sitemap.xml', 'utf8');
const expected = ['biology','physics','engineering','architecture','threejs','edtech'];
const found = [...page.matchAll(/<article class="course" id="([^"]+)"/g)].map(match=>match[1]);

assert.deepEqual(found, expected, 'All six unique 3D courses appear in canonical order');
assert.equal((page.match(/<summary>План занятий и критерии<\/summary>/g)||[]).length, 6, 'Every course has an inspectable syllabus');
for (const id of expected) {
  assert(page.includes('id="' + id + '"'), 'Missing course anchor ' + id);
}
for (const scene of ['cell','physics','device','building']){
  assert(page.includes('data-scene="'+scene+'"'), 'Missing scene control '+scene);
  assert(script.includes(scene + ':'), 'Missing scene description '+scene);
}
assert(page.includes('id="stageFallback"') && page.includes('[hidden]{display:none!important}'), '3D fallback must remain accessible and hide correctly');
assert(page.includes('id="sceneCanvas"') && page.includes('aria-label="Интерактивная'), '3D canvas has a usable accessible name');
assert(page.includes('<html lang="ru">') && page.includes('name="viewport"'), 'Mobile and locale metadata exist');
assert(page.includes('prefers-reduced-motion:reduce'), 'Reduced-motion presentation is supported');
assert(script.includes("import * as THREE from './vendor/three.module.min.js'"), 'Only local 3D renderer is loaded');
assert(existsSync(root+'vendor/three.module.min.js'), 'Bundled Three.js dependency exists');
assert(home.includes('id="academy-3d-entry"') && home.includes('href="3d-academy.html"'), 'Homepage links to Academy');
assert(sitemap.includes('/ai-path/3d-academy.html'), 'Sitemap includes the academy');
assert(!/https?:\/\/.*(\.js|\.css)[^\n]*<\/script>/.test(page), 'No remote JS scripts');
execFileSync(process.execPath, ['--check', root+'3d-academy.js'], { stdio: 'pipe' });

const practicum = readFileSync(root + '3d-academy-practice.html','utf8');
const practicumScript = readFileSync(root + '3d-academy-practice.js','utf8');
const catalogue = JSON.parse(readFileSync(root + '3d-academy-curriculum.json','utf8'));
assert.equal(catalogue.schemaVersion,1,'Known lesson data schema');
assert.deepEqual(catalogue.courses.map(course=>course.id),expected,'Practicum has exactly six matching course IDs');
assert.equal(catalogue.courses.reduce((n,c)=>n+c.lessons.length,0),38,'38 real weekly lessons, not placeholders');
for(const course of catalogue.courses){
  assert.equal(course.lessons.length,course.duration,'Each '+course.id+' course has correct duration');
  assert.equal(course.rubric.length,3,'Every '+course.id+' course has explicit final-project checks');
  assert(page.includes('href="3d-academy-practice.html?course='+course.id+'&amp;lesson=1"'),'Academy links to '+course.id+' practice');
  for(const lesson of course.lessons){
    for(const key of ['title','theory','practice','artifact']) assert(typeof lesson[key]==='string' && lesson[key].trim().length>=(key==='title'?4:20),'Missing '+key+' lesson content: '+course.id);
    const q=lesson.quiz;
    assert(q?.question?.length>=20,'Real control question for '+course.id);
    assert(q.options.length===3 && Number.isInteger(q.correct) && q.correct>=0 && q.correct<3,'Valid answer key for '+course.id);
    assert(new Set(q.options).size===3,'Distinct answer choices for '+course.id);
    assert(q.why.length>=25,'Detailed feedback for '+course.id);
  }
}
assert(practicum.includes('id="quizForm"') && practicum.includes('id="progressBar"'),'Accessible control question and progress');
assert(practicum.includes('[hidden]{display:none!important}'),'Hidden learning content does not flash before fetch');
assert(practicumScript.includes("localStorage.setItem(storageKey"),'Progress is kept on device');
assert(practicumScript.includes("feedback.dataset.result"),'Accessible feedback distinguishes correct/incorrect answers');
assert(sitemap.includes('/ai-path/3d-academy-practice.html'),'Sitemap includes the practicum');
execFileSync(process.execPath,['--check',root+'3d-academy-practice.js'],{stdio:'pipe'});
console.log('3D Academy static acceptance: PASS (six curricula, 38 lessons, quizzes, rubrics, scene controls, fallback, navigation, syntax)');
