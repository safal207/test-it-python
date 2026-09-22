import {modules,lessons,resources} from './course.js';
import {labs,projects} from './labs.js';
const $=s=>document.querySelector(s),KEY='testit-python-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const initial=()=>({version:1,done:{},labs:{},drafts:{},review:{},projects:{},activity:{},lastLesson:null});
const validLesson=id=>lessons.some(l=>l.id===id);
function sanitize(v){
 if(!v||typeof v!=='object'||v.version!==1)throw new Error('Это не файл прогресса Test it.');
 const s=initial();
 for(const l of lessons){
  if(Number.isFinite(v.done?.[l.id])&&v.done[l.id]>0)s.done[l.id]=v.done[l.id];
  const r=v.review?.[l.id];
  if(s.done[l.id]&&r&&Number.isFinite(r.due)&&Number.isFinite(r.interval)&&r.interval>=0&&r.interval<=60)s.review[l.id]={due:r.due,interval:r.interval};
 }
 for(const l of labs){if(Number.isFinite(v.labs?.[l.id])&&v.labs[l.id]>0)s.labs[l.id]=v.labs[l.id];if(typeof v.drafts?.[l.id]==='string'&&v.drafts[l.id].length<=30000)s.drafts[l.id]=v.drafts[l.id];}
 for(const p of projects)s.projects[p.id]=p.steps.map((_,i)=>v.projects?.[p.id]?.[i]===true);
 for(const [d,n] of Object.entries(v.activity??{}))if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(n)&&n>0)s.activity[d]=Math.min(n,10000);
 if(validLesson(v.lastLesson))s.lastLesson=v.lastLesson;
 return s;
}
let state=initial(),storageOK=true;
try{const raw=localStorage.getItem(KEY);if(raw)state=sanitize(JSON.parse(raw));}catch{storageOK=false;}
let toastTimer,worker,runTimer,generation=0,quiz=null,reviewSeen=new Set(),reviewAll=false;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
function warning(){if($('#storage-warning'))return;const el=document.createElement('div');el.id='storage-warning';el.className='storage-warning';el.textContent='Браузер не смог прочитать или сохранить прогресс. Сделай резервную копию в разделе «Прогресс».';document.querySelector('header').after(el);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOK=false;warning();}}
function activity(){const d=day();state.activity[d]=(state.activity[d]||0)+1;}
const due=()=>lessons.filter(l=>state.done[l.id]&&(!state.review[l.id]||state.review[l.id].due<=Date.now()));
const count=()=>Object.keys(state.done).length, listFor=id=>lessons.filter(l=>l.module===id);
const next=()=>lessons.find(l=>l.id===state.lastLesson&&!state.done[l.id])||lessons.find(l=>!state.done[l.id])||lessons[0];
function stop(){generation++;worker?.terminate();worker=null;clearTimeout(runTimer);}
function heading(t,s,e='ТВОЙ PYTHON И АВТОТЕСТЫ',extra=''){return `<div class="page-heading"><div><p class="eyebrow">${esc(e)}</p><h1>${esc(t)}</h1><p>${esc(s)}</p></div>${extra}</div>`;}
function track(n,total){return `<div class="progress-track" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${total}" aria-label="Пройдено"><span style="width:${Math.round(n/total*100)}%"></span></div>`;}
function row(l){return `<a class="lesson-row" href="#lesson/${l.id}"><span class="lesson-number ${state.done[l.id]?'done':''}">${state.done[l.id]?'✓':String(l.n).padStart(2,'0')}</span><div><h3>${esc(l.title)}</h3><p>${esc(l.goal)}</p></div><span class="row-end">${state.done[l.id]?'Пройдено':l.minutes+' мин'}</span></a>`;}
function today(){
 const l=next(),m=modules.find(m=>m.id===l.module);
 return heading(count()?'Продолжим прокачивать навыки.':'Хороший день для первого теста.','Один урок, немного кода — и ещё один навык в копилке.','PYTHON · АВТОТЕСТИРОВАНИЕ',`<span class="level-pill">${String(modules.indexOf(m)+1).padStart(2,'0')} / 08 · ${esc(m.name)}</span>`)+
 `<div class="dashboard-grid"><section class="feature"><p class="eyebrow">ТВОЙ СЛЕДУЮЩИЙ ШАГ</p><h2>${esc(l.title)}</h2><p>${esc(l.goal)}</p><div class="feature-meta"><span class="tag">${esc(m.level)}</span><span class="tag">≈ ${l.minutes} минут</span><span class="tag">Урок ${lessons.indexOf(l)+1} / ${lessons.length}</span></div><a class="btn lime" href="#lesson/${l.id}">${count()?'Продолжить':'Начать урок'} →</a><span class="feature-code" aria-hidden="true">assert<br><em>you.can()</em></span></section>
 <section class="practice-card"><p class="eyebrow">ПИШИ И ПРОВЕРЯЙ</p><div class="terminal"><span>test_first.py · пример</span><pre><code>def test_first_step():
    result = 2 + 2
    assert result == 4</code></pre><small>Маленький тест. Настоящий Python.</small></div><h2>Python прямо здесь</h2><p>Редактор, запуск кода и проверка решения. Начни без установки.</p><a class="btn outline" href="#lab/assert">Открыть практику →</a></section></div>
 <div class="stats"><div class="stat"><strong>${count()} <small>/ ${lessons.length}</small></strong><span>уроков пройдено</span></div><div class="stat"><strong>${Object.keys(state.labs).length} <small>/ ${labs.length}</small></strong><span>задач решено</span></div><div class="stat"><strong>${due().length}</strong><span>карточек на повторение</span></div></div>
 <div class="section-head"><h2>Ближайшие шаги</h2><a class="text-link" href="#path/${m.id}">Вся программа →</a></div><div class="lesson-list">${listFor(m.id).slice(Math.min(l.n-1,2),Math.min(l.n-1,2)+3).map(row).join('')}</div>
 <div class="tip"><strong>Твой ритм: 20–30 минут.</strong> Разбери идею, напиши код, проверь себя. После урока появится карточка для повторения. Прогресс и черновики сохраняются в этом браузере.</div>`;
}
function path(id){
 const m=modules.find(m=>m.id===id)||modules.find(m=>m.id===next().module),list=listFor(m.id),n=list.filter(l=>state.done[l.id]).length;
 return heading('От первого assert до своей QA-системы.','8 этапов. Все уроки открыты: иди по порядку или выбери нужную тему.','ПРОГРАММА · 40 УРОКОВ')+
 `<div class="tabs" aria-label="Этапы программы">${modules.map((x,i)=>`<a class="tab ${x.id===m.id?'active':''}" href="#path/${x.id}" ${x.id===m.id?'aria-current="page"':''}>${String(i+1).padStart(2,'0')} ${esc(x.name)}</a>`).join('')}</div>
 <section class="panel module-summary"><div><p class="eyebrow">${esc(m.level)}</p><h2>${esc(m.name)}</h2><p>${esc(m.outcome)}</p><small>Результат практики: ${esc(m.project)}</small></div><div><div class="progress-label"><span>Этап ${modules.indexOf(m)+1} / 8</span><strong>${n} / ${list.length}</strong></div>${track(n,list.length)}<small>≈ ${list.reduce((a,l)=>a+l.minutes,0)} минут + время на проект</small></div></section><div class="lesson-list">${list.map(row).join('')}</div>
 <div class="section-head"><h2>Бесплатные первоисточники</h2></div><section class="panel resource-list">${resources.map(r=>`<div><a href="${r[1]}" target="_blank" rel="noopener noreferrer">${esc(r[0])} ↗</a><small>${esc(r[2])}</small></div>`).join('')}</section><p class="note">Объяснения — на русском, документация — преимущественно на английском. Продвинутый уровень закрепляется проектами и ревью; прохождение уроков само по себе не присваивает грейд.</p>`;
}
function lesson(id){
 const l=lessons.find(l=>l.id===id);if(!l)return missing();
 state.lastLesson=id;save();quiz={id,correct:false,task:false};const m=modules.find(m=>m.id===l.module);
 return `<div class="lesson-header"><a class="back" href="#path/${m.id}">← ${esc(m.name)}</a><p class="eyebrow">УРОК ${lessons.indexOf(l)+1} / ${lessons.length} · ≈ ${l.minutes} МИН</p></div><div class="lesson-layout"><article><h1>${esc(l.title)}</h1><p class="muted">${esc(l.goal)}</p><section class="panel rule"><h2>Разберёмся</h2>${l.theory.map(t=>`<p>${esc(t)}</p>`).join('')}<pre><code>${esc(l.code)}</code></pre><a class="text-link" target="_blank" rel="noopener noreferrer" href="${esc(l.source)}">Официальная документация ↗</a></section>
 <section class="panel"><p class="eyebrow">ЗАКРЕПИ ДЕЙСТВИЕМ</p><h2>Маленькое задание</h2><p>${esc(l.task)}</p>${l.lab?`<a class="btn outline" href="#lab/${l.lab}">Открыть задачу с кодом →</a>`:''}<div class="checklist"><label><input id="task-done" type="checkbox">Я выполнил задание и могу объяснить результат</label></div><p class="note">Это твоя самооценка практической части. Для завершения ответь на вопрос ниже.</p></section>
 <section class="panel" id="quiz"><p class="eyebrow">ПРОВЕРЬ ПОНИМАНИЕ</p><h2 class="question">${esc(l.question)}</h2><div class="options">${l.options.map((o,i)=>`<button class="option" data-answer="${i}" aria-pressed="false">${esc(o)}</button>`).join('')}</div><div id="quiz-feedback" aria-live="polite"></div><button class="btn" id="complete-lesson" disabled>Завершить урок →</button><p id="completion-note" class="note">Выполни задание и выбери правильный ответ.</p></section></article>
 <aside class="panel sticky"><p class="eyebrow">В ЭТОМ ЭТАПЕ</p>${listFor(m.id).map(x=>`<a href="#lesson/${x.id}" class="${x.id===id?'active':''}" ${x.id===id?'aria-current="page"':''}>${state.done[x.id]?'✓':x.n+'.'} ${esc(x.title)}</a>`).join('')}<p class="note" style="margin:20px 0 0">После завершения ключевая идея попадёт в повторение.</p></aside></div>`;
}
function practice(section){
 const projectMode=section==='projects';
 let html=heading(projectMode?'Навыки превращаются в проекты.':'Меньше «понятно». Больше кода.',projectMode?'6 заданий на компьютере — от бизнес-логики до полного набора автотестов.':'Пиши Python, запускай и разбирай настоящие результаты проверок.','ПРАКТИКА')+
 `<div class="tabs"><a class="tab ${!projectMode?'active':''}" href="#practice">В браузере · ${labs.length} задач</a><a class="tab ${projectMode?'active':''}" href="#practice/projects">Проекты · ${projects.length}</a></div>`;
 if(projectMode)return html+`<section class="panel"><h2>Твой учебный полигон</h2><p>Скачай стартовый проект: маленький магазин на Python, API, веб-страница и первые тесты. Он работает локально, без аккаунтов и стороннего сервера.</p><a class="btn" href="qa-starter.zip" download>Скачать стартовый проект .zip ↓</a><p class="note" style="margin:14px 0 0">Инструкция для Windows, macOS и Linux — в README. Проекты выполняются на компьютере; чек-листы ниже — твоя самооценка.</p></section><div class="grid-two">${projects.map(p=>{const n=(state.projects[p.id]||[]).filter(Boolean).length;return `<section class="panel lab-card"><span class="chip">${esc(p.level)}</span><h2>${esc(p.title)}</h2><p>${esc(p.goal)}</p><div>${track(n,p.steps.length)}<small>${n} / ${p.steps.length} шагов</small></div><a class="btn outline" href="#project/${p.id}">Открыть проект →</a></section>`;}).join('')}</div>`;
 return html+`<p class="note">Первый запуск загружает Python через интернет. Задачи выполняются в браузере; Playwright и реальные HTTP-сценарии — в проектах.</p><div class="grid-two">${labs.map(l=>`<section class="panel lab-card"><span class="chip">${esc(l.level)} · ${l.minutes} мин ${state.labs[l.id]?'· ✓ решено':''}</span><h2>${esc(l.title)}</h2><p class="muted">${esc(l.description)}</p><a class="btn outline" href="#lab/${l.id}">${state.labs[l.id]?'Повторить':'Решить задачу'} →</a></section>`).join('')}</div>`;
}
function project(id){
 const p=projects.find(p=>p.id===id);if(!p)return missing();const flags=state.projects[id]||[];
 return `<div class="lesson-header"><a class="back" href="#practice/projects">← Проекты</a><p class="eyebrow">${esc(p.level)}</p></div>`+heading(p.title,p.goal,'ПРАКТИКА НА КОМПЬЮТЕРЕ')+`<section class="panel"><h2>Что должно получиться</h2><p>${esc(p.artifact)}</p><a class="btn outline" href="qa-starter.zip" download>Скачать учебный магазин ↓</a></section><section class="panel"><div class="progress-label"><h2>План работы</h2><span id="project-count">${flags.filter(Boolean).length} / ${p.steps.length}</span></div><div class="checklist">${p.steps.map((s,i)=>`<label><input type="checkbox" data-project-step="${i}" ${flags[i]?'checked':''}>${esc(s)}</label>`).join('')}</div><div class="tip"><strong>Проверь качество результата.</strong> ${esc(p.review)}</div><p class="note">Отметки — самооценка. Сайт не проверяет файлы твоего локального проекта автоматически.</p></section>`;
}
function lab(id){
 const l=labs.find(l=>l.id===id);if(!l)return missing();
 return `<div class="lesson-header"><a class="back" href="#practice">← Практика</a><p class="eyebrow">${esc(l.level)} · ≈ ${l.minutes} МИН</p></div><div class="lesson-layout"><article><h1>${esc(l.title)}</h1><p>${esc(l.description)}</p>
 <div class="editor-bar"><span>${l.pytest?'test_exercise.py':'exercise.py'}</span><span id="draft-label">Черновик сохраняется</span></div><textarea class="code-editor" id="code" aria-label="Код Python" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off">${esc(state.drafts[id]??l.starter)}</textarea>
 <div class="btn-row" style="margin:17px 0"><button class="btn" id="run-code">▷ Запустить и проверить</button><button class="btn quiet" id="stop-code" hidden>Остановить</button><button class="btn quiet" id="download-code">Скачать .py</button></div><p class="note">Первый запуск требует интернета. Код ограничен 10 секундами выполнения. Tab выходит из редактора; для отступа используй четыре пробела.</p>
 <section class="panel"><h2>Результат</h2><div id="run-status" role="status" aria-live="polite">${state.labs[id]?'✓ Ранее задача решена. Можно проверить новый вариант.':'Запусти код — здесь появятся вывод и результаты проверок.'}</div><pre id="run-output" class="output" hidden></pre><div id="run-results" aria-live="polite"></div></section>
 <details class="panel"><summary>Подсказка</summary><p>${esc(l.hint)}</p></details><details class="panel"><summary>Разобрать готовое решение</summary><p class="note">Сначала попробуй сам. Просмотр ответа не засчитывает задачу — нужен успешный запуск.</p><pre><code>${esc(l.solution)}</code></pre><button class="btn quiet" id="use-solution">Подставить решение в редактор</button></details></article>
 <aside class="panel sticky"><p class="eyebrow">ЧТО ПРОВЕРЯЕМ</p><ul>${l.checks.map(c=>`<li>${esc(c.label)}</li>`).join('')}</ul><p class="note">Это учебная проверка заданных примеров, а не доказательство корректности для всех входов.</p><a href="#path/${l.module}">Разобрать тему в программе →</a></aside></div>`;
}
function review(){
 const learned=lessons.filter(l=>state.done[l.id]),pool=(reviewAll?learned:due()).filter(l=>!reviewSeen.has(l.id)),l=pool[0];
 const intro=heading('Чтобы знания оставались с тобой.','Вспомни ответ своими словами, потом открой объяснение.','ПОВТОРЕНИЕ');
 if(!learned.length)return intro+`<section class="panel empty"><h2>Здесь будут твои знания.</h2><p>Заверши первый урок — и его ключевая идея появится в карточках.</p><a class="btn" href="#lesson/start-1">К первому уроку →</a></section>`;
 if(!l)return intro+`<section class="panel empty"><h2>На сегодня всё.</h2><p>Карточки вернутся по расписанию. Можно повторить изученное или перейти к новому уроку.</p><div class="btn-row review-controls"><button class="btn quiet" id="review-all">Повторить все изученные</button><a class="btn" href="#lesson/${next().id}">Следующий урок →</a></div></section>`;
 const interval=Math.min(30,state.review[l.id]?.interval?Math.max(3,state.review[l.id].interval*2):1);
 return intro+`<div class="review-wrap"><div class="section-head"><small>Осталось в сессии: ${pool.length}</small><small>${esc(modules.find(m=>m.id===l.module).name)}</small></div><section class="panel flashcard"><p class="eyebrow">${esc(l.title)}</p><h2>${esc(l.question)}</h2><button class="btn outline" id="reveal-review">Показать ответ</button><div id="review-answer" hidden><p>${esc(l.options[l.answer])}</p><p class="muted">${esc(l.explanation)}</p><a class="text-link" href="#lesson/${l.id}">Вернуться к уроку →</a></div></section><div class="btn-row review-controls" id="review-controls" hidden><button class="btn quiet" data-review="again" data-id="${l.id}">Не вспомнил · через 10 мин</button><button class="btn" data-review="good" data-id="${l.id}">Помню · ${interval} дн.</button></div><p class="note" style="text-align:center">Оценка по памяти — твоя. Интервал увеличивается при ответе «Помню».</p></div>`;
}
function progress(){
 const days=Array.from({length:28},(_,i)=>{const d=new Date();d.setDate(d.getDate()-27+i);return day(d);}),pc=projects.filter(p=>p.steps.every((_,i)=>state.projects[p.id]?.[i])).length;
 return heading('Твой прогресс — шаг за шагом.','Сравнивай себя с собой вчерашним. Практика важнее скорости.','ЛИЧНЫЙ КАБИНЕТ')+`<div class="stats"><div class="stat"><strong>${count()} / ${lessons.length}</strong><span>уроков завершено</span></div><div class="stat"><strong>${Object.keys(state.labs).length} / ${labs.length}</strong><span>задач прошли проверку</span></div><div class="stat"><strong>${pc} / ${projects.length}</strong><span>проектов по самооценке</span></div></div>
 <section class="panel"><div class="section-head" style="margin-top:0"><h2>Последние 28 дней</h2><small>${days.filter(d=>state.activity[d]).length} активных дней</small></div><div class="activity-grid">${days.map(d=>`<div class="day ${state.activity[d]?'active':''}" title="${d}: ${state.activity[d]||0} учебных действий" aria-label="${d}: ${state.activity[d]||0} учебных действий"></div>`).join('')}</div><p class="note">Завершение урока, успешная задача или повторение карточки отмечают день активности.</p></section>
 <div class="grid-two">${modules.map(m=>{const list=listFor(m.id),n=list.filter(l=>state.done[l.id]).length;return `<section class="panel"><div class="progress-label"><strong>${esc(m.name)}</strong><span>${n} / ${list.length}</span></div>${track(n,list.length)}<a class="text-link" href="#path/${m.id}">Продолжить этап →</a></section>`;}).join('')}</div>
 <section class="panel" style="margin-top:22px"><h2>Сохрани свой путь</h2><p>Прогресс и черновики хранятся в этом браузере. Автоматической синхронизации телефона и компьютера нет: перенеси данные через файл.</p><div class="btn-row"><button class="btn" id="export-progress">Скачать прогресс .json ↓</button><button class="btn quiet" id="import-button">Загрузить прогресс ↑</button><input type="file" id="import-progress" accept="application/json,.json" class="hidden"></div><p class="note" style="margin:14px 0 0">Импорт объединяет пройденные уроки и проекты. Черновики из файла заменяют совпадающие задачи.</p></section>`;
}
function missing(){return '<section class="panel empty"><h1>Такой страницы нет.</h1><a class="btn" href="#path">Открыть программу</a></section>';}
function download(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function render(focus=false){
 if(location.hash==='#main'){$('#main').focus();return;}stop();
 let [page,id]=location.hash.slice(1).split('/');page=page||'today';
 const nav=({lesson:'path',lab:'practice',project:'practice'})[page]||page;
 document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===nav);if(a.dataset.nav===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('#breadcrumb').textContent='Практика / '+(({today:'Сегодня',path:'Программа',lesson:'Урок',practice:'Практика',project:'Проект',lab:'Редактор',review:'Повторение',progress:'Прогресс'})[page]||'Страница');
 $('#review-badge').textContent=due().length;$('#review-badge').hidden=!due().length;
 const views={today,path:()=>path(id),lesson:()=>lesson(id),practice:()=>practice(id),project:()=>project(id),lab:()=>lab(id),review,progress};
 $('#main').innerHTML=Object.hasOwn(views,page)?views[page]():missing();document.title=($('#main h1')?.textContent||'Test it')+' — Test it';bind(page,id);
 if(focus){window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});}if(!storageOK)warning();
}
function bind(page,id){
 if(page==='lesson'&&quiz?.id===id&&$('#task-done')){
  const l=lessons.find(l=>l.id===id),update=()=>{$('#complete-lesson').disabled=!(quiz.correct&&quiz.task);$('#completion-note').textContent=quiz.correct&&quiz.task?'Готово. Заверши урок, чтобы сохранить результат.':'Выполни задание и выбери правильный ответ.';};
  $('#task-done').onchange=e=>{quiz.task=e.target.checked;update();};
  document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{quiz.correct=Number(b.dataset.answer)===l.answer;document.querySelectorAll('[data-answer]').forEach(x=>{x.classList.remove('correct','wrong');x.setAttribute('aria-pressed',String(x===b));});b.classList.add(quiz.correct?'correct':'wrong');$('#quiz-feedback').innerHTML=`<div class="feedback ${quiz.correct?'':'wrong'}"><strong>${quiz.correct?'Верно.':'Пока не так. Попробуй ещё раз.'}</strong>${esc(l.explanation)}</div>`;update();});
  $('#complete-lesson').onclick=()=>{if(!quiz.correct||!quiz.task)return;const first=!state.done[id];state.done[id]=Date.now();if(first)state.review[id]={due:Date.now(),interval:0};activity();save();const n=lessons[lessons.indexOf(l)+1];$('#quiz').innerHTML=`<div class="feedback"><strong>✓ Урок завершён</strong>Результат сохранён${first?', карточка добавлена в повторение':''}.</div><div class="btn-row"><a class="btn" href="${n?'#lesson/'+n.id:'#practice/projects'}">${n?'Следующий урок':'К итоговому проекту'} →</a><a class="btn quiet" href="#review">Повторить знания</a></div>`;$('#review-badge').textContent=due().length;$('#review-badge').hidden=!due().length;toast('Урок завершён. Хороший шаг!');};
 }
 if(page==='project'){
  const p=projects.find(p=>p.id===id);if(!p)return;document.querySelectorAll('[data-project-step]').forEach(b=>b.onchange=()=>{state.projects[id]??=p.steps.map(()=>false);state.projects[id][Number(b.dataset.projectStep)]=b.checked;save();$('#project-count').textContent=state.projects[id].filter(Boolean).length+' / '+p.steps.length;});
 }
 if(page==='lab'){
  const l=labs.find(l=>l.id===id);if(!l)return;const remember=()=>{state.drafts[id]=$('#code').value.slice(0,30000);save();$('#draft-label').textContent=storageOK?'Черновик сохранён':'Скачай черновик';};
  $('#code').oninput=remember;$('#download-code').onclick=()=>download(l.pytest?'test_exercise.py':l.id+'.py',$('#code').value);
  $('#use-solution').onclick=()=>{$('#code').value=l.solution;remember();$('#code').focus();toast('Разбери решение и запусти проверку.');};$('#run-code').onclick=()=>runLab(l);
  $('#stop-code').onclick=()=>{stop();$('#run-status').textContent='Выполнение остановлено. Можно исправить код и запустить снова.';$('#run-code').disabled=false;$('#stop-code').hidden=true;};
 }
 if(page==='review'){
  if($('#review-all'))$('#review-all').onclick=()=>{reviewSeen.clear();reviewAll=true;render();};
  if($('#reveal-review'))$('#reveal-review').onclick=()=>{$('#review-answer').hidden=false;$('#review-controls').hidden=false;$('#reveal-review').hidden=true;};
  document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{const old=state.review[b.dataset.id]?.interval||0,interval=b.dataset.review==='again'?0:Math.min(30,old?Math.max(3,old*2):1);state.review[b.dataset.id]={interval,due:Date.now()+(interval?interval*86400000:600000)};reviewSeen.add(b.dataset.id);activity();save();render();});
 }
 if(page==='progress'){
  $('#export-progress').onclick=()=>download('test-it-progress-'+day()+'.json',JSON.stringify(state,null,2),'application/json');$('#import-button').onclick=()=>$('#import-progress').click();
  $('#import-progress').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>1000000)throw new Error('Нужна копия прогресса до 1 МБ.');const s=sanitize(JSON.parse(await f.text()));for(const key of ['done','labs','drafts','review','activity'])state[key]={...state[key],...s[key]};for(const p of projects)state.projects[p.id]=p.steps.map((_,i)=>!!(state.projects[p.id]?.[i]||s.projects[p.id]?.[i]));if(s.lastLesson)state.lastLesson=s.lastLesson;save();render();toast('Прогресс объединён.');}catch(error){toast(error.message||'Не удалось прочитать файл.');}};
 }
}
function runLab(l){
 stop();const token=generation,code=$('#code').value;if(code.length>30000){toast('Максимум 30 000 символов.');return;}state.drafts[l.id]=code;save();
 $('#run-code').disabled=true;$('#stop-code').hidden=false;$('#run-output').hidden=true;$('#run-output').textContent='';$('#run-results').innerHTML='';$('#run-status').textContent='Подключаем Python…';let output='',finished=false;
 const done=()=>{if(finished)return;finished=true;worker?.terminate();worker=null;clearTimeout(runTimer);$('#run-code').disabled=false;$('#stop-code').hidden=true;};
 const fail=t=>{if(token!==generation)return;$('#run-status').textContent=t;done();};
 try{
  worker=new Worker(new URL('./python-worker.js',import.meta.url),{type:'module'});
  runTimer=setTimeout(()=>fail('Python не загрузился за 90 секунд. Проверь интернет и повтори. Можно скачать .py для запуска на компьютере.'),90000);
  worker.onerror=()=>fail('Python не удалось запустить. Проверь интернет и повтори. Код можно скачать для локального запуска.');
  worker.onmessage=({data})=>{
   if(token!==generation)return;
   if(data.type==='status')$('#run-status').textContent=data.text;
   if(data.type==='ready'){clearTimeout(runTimer);$('#run-status').textContent='Python готов. Выполняем код и проверки…';runTimer=setTimeout(()=>fail('Выполнение остановлено через 10 секунд. Проверь бесконечные циклы.'),10000);}
   if(data.type==='stdout'){output=(output+data.text+'\n').slice(-12000);$('#run-output').hidden=false;$('#run-output').textContent=output;}
   if(data.type==='error'){$('#run-output').hidden=false;$('#run-output').textContent=(output+'\n'+data.text).slice(-16000);fail('В коде ошибка. Прочитай последнюю строку сообщения и исправь её.');}
   if(data.type==='result'){const n=data.results.filter(r=>r.passed).length,all=n===data.results.length&&n>0;$('#run-status').textContent=all?`✓ Все проверки пройдены: ${n} / ${data.results.length}. Задача решена.`:`Пройдено ${n} / ${data.results.length}. Исправь отмеченные случаи и попробуй снова.`;$('#run-results').innerHTML=data.results.map(r=>`<div class="feedback ${r.passed?'':'wrong'}"><strong>${r.passed?'✓':'×'} ${esc(r.label)}</strong>${r.error?esc(r.error):''}</div>`).join('');if(all){const first=!state.labs[l.id];state.labs[l.id]=Date.now();if(first)activity();save();}done();}
  };
  worker.postMessage({code,checks:l.checks,packages:l.packages||[],pytest:!!l.pytest});
 }catch{fail('Браузер не поддерживает запуск Python. Скачай код и выполни его на компьютере.');}
}
window.addEventListener('hashchange',()=>{reviewSeen.clear();reviewAll=false;render(true);});
window.addEventListener('pagehide',()=>stop());render();
const context=document.modelContext;
if(context?.registerTool){
 const lifecycle=new AbortController();
 const tools=[
 {name:'get_learning_progress',title:'Прочитать учебный прогресс',description:'Return completed lessons, solved exercises and cards due on this device.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(input&&Object.keys(input).length)throw new Error('No arguments expected');return {completedLessons:Object.keys(state.done),solvedExercises:Object.keys(state.labs),dueCards:due().map(l=>l.id)};}},
 {name:'open_course_lesson',title:'Открыть урок',description:'Open a lesson without completing it or answering the quiz.',inputSchema:{type:'object',properties:{lessonId:{type:'string',enum:lessons.map(l=>l.id)}},required:['lessonId'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||Object.keys(input).some(k=>k!=='lessonId')||!validLesson(input.lessonId))throw new Error('Unknown lesson');history.replaceState(null,'','#lesson/'+input.lessonId);render(true);return {lessonId:input.lessonId,completed:!!state.done[input.lessonId]};}}
 ];
 for(const t of tools)try{Promise.resolve(context.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
