// AI PATH · 3D Academy practice: static authored lessons, no analytics or student-data requests.
const $ = id => document.getElementById(id);
const storageKey = 'ai-path-3d-questions-v1';
const completed = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) saved.filter(v => typeof v === 'string' && /^[a-z0-9-]+:[0-9]{1,2}$/.test(v)).forEach(v => completed.add(v));
} catch { /* Disabled storage leaves current session usable. */ }
let courses = [];
let current = null;
let lessonIndex = 0;
const remember = () => {
  try { localStorage.setItem(storageKey, JSON.stringify([...completed])); } catch { /* Session-only progress. */ }
};
const key = (course, index) => course.id + ':' + index;

function queryFor(course, index) {
  const url = new URL(location.href);
  url.searchParams.set('course', course.id);
  url.searchParams.set('lesson', String(index + 1));
  history.replaceState(null, '', url);
}
function fillText(id, value) { $(id).textContent = value; }
function countPassed(course) {
  return course.lessons.reduce((n, _lesson, i) => n + (completed.has(key(course,i)) ? 1 : 0), 0);
}
function selectCourse(id, index = 0, focus = false) {
  current = courses.find(course => course.id === id) || courses[0];
  lessonIndex = Number.isInteger(index) ? Math.max(0,Math.min(index,current.lessons.length-1)) : 0;
  queryFor(current,lessonIndex);
  drawTracks();
  drawLessonList();
  drawLesson();
  if (focus) $('lessonTitle').focus();
}
function drawTracks() {
  const wrapper = $('trackButtons');
  wrapper.replaceChildren();
  courses.forEach(course => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.course = course.id;
    button.setAttribute('aria-pressed',String(current.id === course.id));
    button.append(document.createTextNode(course.name));
    const sub = document.createElement('span');
    sub.textContent = countPassed(course) + ' / ' + course.lessons.length + ' вопросов';
    button.appendChild(sub);
    button.addEventListener('click', () => selectCourse(course.id, 0, true));
    wrapper.appendChild(button);
  });
}
function drawLessonList() {
  const options = current.lessons.map((lesson,i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = 'Неделя ' + (i+1) + ' · ' + lesson.title + (completed.has(key(current,i))?' ✓':'');
    return option;
  });
  $('lessonSelect').replaceChildren(...options);
  $('lessonSelect').value = String(lessonIndex);
}
function drawRubric() {
  fillText('projectText',current.project);
  $('rubric').replaceChildren(...current.rubric.map(item => {
    const li = document.createElement('li'); li.textContent = item; return li;
  }));
}
function drawProgress() {
  const done = countPassed(current);
  const total = current.lessons.length;
  const percent = Math.round(done / total * 100);
  $('progressFill').style.width = percent+'%';
  $('progressBar').setAttribute('aria-valuenow',String(percent));
  fillText('progressLabel',done + ' из ' + total + ' контрольных вопросов зачтено ('+percent+'%). Практические проекты оцениваются отдельно.');
}
function drawLesson() {
  const lesson = current.lessons[lessonIndex];
  fillText('lessonWeek','Неделя ' + (lessonIndex+1) + ' из ' + current.lessons.length);
  fillText('lessonTitle',lesson.title);
  fillText('courseName',current.name + ' · ' + current.duration + ' занятий');
  fillText('theory',lesson.theory);
  fillText('practice',lesson.practice);
  fillText('artifact',lesson.artifact);
  fillText('quizQuestion',lesson.quiz.question);
  $('quizOptions').replaceChildren(...lesson.quiz.options.map((answer,i)=>{
    const label = document.createElement('label');
    label.className = 'option';
    const input = document.createElement('input');
    input.type='radio';input.name='answer';input.value=String(i);input.required=true;
    const text = document.createElement('span');text.textContent=answer;
    label.append(input,text);
    return label;
  }));
  $('quizForm').reset();
  const feedback = $('quizFeedback');
  feedback.hidden = !completed.has(key(current,lessonIndex));
  if(!feedback.hidden){
    feedback.dataset.result='pass';
    feedback.textContent='Контрольный вопрос уже был зачтён на этом устройстве. Можно пройти его повторно.';
  } else {
    feedback.textContent='';
    feedback.removeAttribute('data-result');
  }
  $('labLink').href='3d-academy.html?scene='+encodeURIComponent(current.scene)+'#live-demo';
  $('prevLesson').disabled=lessonIndex===0;
  $('nextLesson').disabled=lessonIndex===current.lessons.length-1;
  drawRubric();
  drawProgress();
}
$('quizForm').addEventListener('submit',ev=>{
  ev.preventDefault();
  const selected = $('quizForm').querySelector('input[name="answer"]:checked');
  if(!selected)return;
  const quiz=current.lessons[lessonIndex].quiz;
  const passed=Number(selected.value)===quiz.correct;
  const feedback=$('quizFeedback');
  feedback.hidden=false;
  feedback.dataset.result=passed?'pass':'retry';
  feedback.textContent=(passed?'Верно. Контрольный вопрос зачтён. ':'Пока неверно. Попробуй ещё раз. ')+quiz.why;
  if(passed){
    completed.add(key(current,lessonIndex));
    remember();
    drawTracks();
    drawProgress();
    const option=$('lessonSelect').options[lessonIndex];
    if(option&&!option.textContent.endsWith(' ✓'))option.textContent+=' ✓';
  }
});
$('lessonSelect').addEventListener('change',ev=>selectCourse(current.id,Number(ev.target.value)));
$('prevLesson').addEventListener('click',()=>selectCourse(current.id,lessonIndex-1,true));
$('nextLesson').addEventListener('click',()=>selectCourse(current.id,lessonIndex+1,true));
async function load() {
  try {
    const response=await fetch('./3d-academy-curriculum.json',{cache:'no-cache'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();
    if(data.schemaVersion!==1 || !Array.isArray(data.courses) || data.courses.length!==6)throw Error('Unsupported curriculum format');
    for(const course of data.courses) {
      if(!course.id || !Array.isArray(course.lessons) || course.lessons.length!==course.duration)throw Error('Invalid course entry');
      if(!Array.isArray(course.rubric) || course.rubric.length<3)throw Error('Invalid project rubric');
    }
    courses=data.courses;
    const params=new URLSearchParams(location.search);
    const id=courses.some(c=>c.id===params.get('course'))?params.get('course'):courses[0].id;
    const index=Number(params.get('lesson'))-1;
    $('workbench').hidden=false;
    selectCourse(id,Number.isInteger(index)?index:0);
    // Focusable heading for keyboard navigation from course switchers.
    $('lessonTitle').tabIndex=-1;
  } catch {
    $('workbench').hidden=true;
    $('loadError').hidden=false;
  }
}
load();
