(() => {
  'use strict';
  const course = document.body.dataset.course;
  const lessons = window.AIPathLifeSkills && window.AIPathLifeSkills[course];
  if (!lessons) return;
  const ages = ['6-9','10-13','14-17'];
  const steps = ['task','learn','try','check'];
  const ageLabels = {'6-9':'6–9 лет','10-13':'10–13 лет','14-17':'14–17 лет'};
  const ageDescriptions = {'6-9':'Короткие истории и маленькие шаги. Проходите урок вместе со взрослым.','10-13':'Учебные истории, самостоятельные решения и возможность попросить поддержки.','14-17':'Примеры проектов, гибкие планы и обдуманные решения. Поддержка тоже важна.'};
  const plans = {
    goals: [
      {id:'aim',label:'Что я хочу попробовать или создать?',examples:['Нарисовать открытку','Сделать короткий комикс','Подготовить учебный проект']},
      {id:'first',label:'Мой первый маленький шаг',examples:['Выбрать карандаши и бумагу','Придумать героя','Выбрать одну тему']},
      {id:'when',label:'Когда я могу попробовать?',examples:['В субботу вместе со взрослым','После школы в удобный день','В свободное время на этой неделе']},
      {id:'support',label:'Кто или что может помочь?',examples:['Попросить взрослого','Друг или учитель','Наставник или полезный источник']},
      {id:'review',label:'Как я замечу прогресс?',examples:['Покажу готовый рисунок','Посмотрю на первые кадры','Проверю черновик и попрошу отзыв']}
    ],
    time: [
      {id:'important',label:'Моё важное дело',examples:['Собрать рюкзак','Начать школьное задание','Подготовить часть проекта']},
      {id:'first',label:'С какого небольшого шага начну?',examples:['Найти тетрадь со взрослым','Посмотреть условие задания','Составить короткий план']},
      {id:'when',label:'Когда удобно этим заняться?',examples:['После обеда со взрослым','После прогулки','Когда есть силы и свободное время']},
      {id:'rest',label:'Когда и как я отдохну?',examples:['Поиграть или погулять','Сделать перерыв и встретиться с друзьями','Оставить время на еду, сон и отдых']},
      {id:'backup',label:'Что я изменю, если планы сдвинутся?',examples:['Обсужу со взрослым','Переставлю необязательное дело','Уточню сроки и уменьшу объём']}
    ]
  };
  const cardKeys = {goals:['goal','steps','project','focus','steps'],time:['day','day','project','focus','rest']};
  const mediaAlt = {goal:'Ребёнок собирает ракету из картона',steps:'Школьники обсуждают кадры собственного комикса',project:'Подростки обсуждают план учебного проекта',day:'Ребёнок со взрослым составляет план дня из карточек',focus:'Школьница сосредоточенно рисует за столом',rest:'Дети делают перерыв между занятиями'};
  const mediaPath = (key,thumb=false) => 'assets/life-skills/cards/'+key+(thumb?'-thumb':'')+'.webp';
  const mediaURL = path => window.AIPathLifeSkillsMedia?.[path] || path;
  function lessonMedia(index){
    let key=cardKeys[course][index];
    if(age==='14-17' && ['goal','day'].includes(key))key='project';
    if(age==='6-9' && key==='project')key='day';
    return key;
  }
  const $ = id => document.getElementById(id);
  const storage = window.AIPathLifeSkillsStorage(course,ages,lessons.map(l=>l.id),plans[course].map(f=>f.id));
  let age = storage.age(), lessonIndex = 0, stepIndex = 0;
  const level = () => storage.level(age);
  const current = () => lessons[lessonIndex];
  const answerState = id => level().answers[id];
  const quiz = () => current().checks[age];
  function storageStatus(message='') {
    $('storage-status').textContent = storage.available() ? (message || 'Прогресс, план и место занятия сохраняются в этом браузере.') : 'Сохранение недоступно: данные останутся до закрытия страницы. Скачай свой план.';
  }
  function restoreLocation(useURL=true) {
    const params = new URL(location.href).searchParams;
    if (useURL && ages.includes(params.get('age'))) age=params.get('age');
    const position=level().position;
    const wanted=useURL && lessons.some(l=>l.id===params.get('lesson')) ? params.get('lesson') : position.lesson;
    const index=lessons.findIndex(l=>l.id===wanted); lessonIndex=index<0?0:index;
    const step=useURL && steps.includes(params.get('step')) ? params.get('step') : position.step;
    stepIndex=steps.includes(step)?steps.indexOf(step):0;
  }
  function remember(push=false) {
    storage.position(age,current().id,steps[stepIndex]);
    const url=new URL(location.href); url.searchParams.set('age',age); url.searchParams.set('lesson',current().id); url.searchParams.set('step',steps[stepIndex]);
    try { if(url.href!==location.href) history[push?'pushState':'replaceState'](null,'',url); } catch { /* Offline file browsers may limit History. */ }
    storageStatus();
  }
  function completionText() {
    const a=answerState(current().id);
    if(a.activity && a.quiz) return 'Урок зачтён: практика и проверка пройдены.';
    if(a.quiz) return 'Проверка пройдена. Для зачёта урока осталось выполнить практику «Попробуй».';
    if(a.activity) return 'Практика пройдена. Для зачёта урока осталось выполнить «Проверку».';
    return 'Для зачёта урока выполни две части: «Попробуй» и «Проверка».';
  }
  function renderProgress() {
    const state=level(),done=lessons.filter(l=>state.answers[l.id].activity && state.answers[l.id].quiz).length;
    $('course-progress').value=done; $('progress-label').textContent=`Пройдено ${done} из ${lessons.length} уроков`;
    document.querySelectorAll('[data-lesson]').forEach(button=>{
      const a=state.answers[button.dataset.lesson];
      button.querySelector('.lesson-state').textContent=a.activity && a.quiz ? 'Урок пройден' : a.activity ? 'Практика ✓ · осталась проверка' : a.quiz ? 'Проверка ✓ · осталась практика' : 'Практика + проверка';
    });
    const a=state.answers[current().id];
    $('lesson-status').textContent=completionText();
    document.querySelector('[data-step="try"]').classList.toggle('step-complete',a.activity);
    document.querySelector('[data-step="check"]').classList.toggle('step-complete',a.quiz);
    const button=$('completion-next'); button.hidden=!(a.activity||a.quiz);
    button.textContent=a.activity && a.quiz ? (lessonIndex<lessons.length-1?'Урок пройден. Дальше →':'К моему плану →') : a.quiz ? 'Осталось пройти практику →' : 'Осталось пройти проверку →';
  }
  function addOptions(container,name,choices) {
    container.replaceChildren();
    // Values retain content identity; only the visible order changes per attempt.
    const order=choices.map((_,i)=>i);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    for(const i of order){
      const label=document.createElement('label');label.className='quiz-option';
      const input=document.createElement('input');input.type='radio';input.name=name;input.value=String(i);
      const text=document.createElement('span');text.textContent=choices[i];label.append(input,text);container.append(label);
    }
  }
  function renderSteps() {
    steps.forEach((step,i)=>{$('step-'+step).hidden=i!==stepIndex;document.querySelector(`[data-step="${step}"]`).setAttribute('aria-pressed',String(i===stepIndex));});
    $('step-prev').disabled=stepIndex===0; $('step-next').hidden=stepIndex===steps.length-1;
    $('step-next').textContent=['К разбору →','Попробовать →','К проверке →',''][stepIndex];
  }
  function changeStep(index,push=true){stepIndex=Math.max(0,Math.min(steps.length-1,index));renderSteps();remember(push);}
  function openLesson(index,focus=true,push=true){lessonIndex=Math.max(0,Math.min(lessons.length-1,index));stepIndex=0;renderLesson(focus);remember(push);}
  function renderLesson(focus=false) {
    const lesson=current(),item=lesson.cases[age],check=quiz();
    $('lesson-counter').textContent=`УРОК ${lessonIndex+1} / ${lessons.length} · ${ageLabels[age]}`;
    $('lesson-title').textContent=lesson.title; $('task-story').textContent=item.story;
    const imageKey=lessonMedia(lessonIndex);$('task-photo').src=mediaURL(mediaPath(imageKey));$('task-photo').alt=mediaAlt[imageKey];
    const rule=document.createElement('p');rule.textContent=lesson.rule;$('lesson-text').replaceChildren(rule);
    $('lesson-example').textContent=item.example; $('activity-question').textContent=item.question;
    addOptions($('activity-options'),'activity-answer',item.choices);
    $('quiz-question').textContent=check.question;addOptions($('quiz-options'),'quiz-answer',check.choices);
    for(const id of ['activity-hint','activity-feedback','quiz-hint','quiz-feedback']){$(id).textContent='';$(id).removeAttribute('data-kind');}
    $('lesson-prev').disabled=lessonIndex===0;$('lesson-next').disabled=lessonIndex===lessons.length-1;
    const list=$('lesson-list');list.replaceChildren();
    lessons.forEach((entry,i)=>{
      const li=document.createElement('li'),button=document.createElement('button'),number=document.createElement('span'),text=document.createElement('span'),status=document.createElement('span'),image=document.createElement('img'),title=document.createElement('span');
      button.type='button';button.dataset.lesson=entry.id;if(i===lessonIndex)button.setAttribute('aria-current','step');
      number.className='lesson-number';number.textContent=String(i+1).padStart(2,'0');text.className='lesson-copy';title.className='lesson-name';title.textContent=entry.title;status.className='lesson-state';text.append(number,title,status);
      image.src=mediaURL(mediaPath(lessonMedia(i),true));image.alt='';image.width=320;image.height=213;image.loading='lazy';image.decoding='async';button.classList.add('visual-lesson-card');button.append(image,text);li.append(button);list.append(li);button.addEventListener('click',()=>openLesson(i));
    });
    renderSteps();renderProgress();if(focus)$('lesson-title').focus();
  }
  function renderPlanPreview() {
    const plan=level().plan,values=plans[course].map(f=>[f.label,plan[f.id].trim()]).filter(([,value])=>value);
    $('plan-preview').textContent=values.length?values.map(([label,value])=>`${label}\n${value}`).join('\n\n'):'Твой план появится здесь после заполнения.';
  }
  function renderPlan() {
    const fields=$('plan-fields'),plan=level().plan;fields.replaceChildren();
    for(const field of plans[course]){
      const wrap=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input');
      wrap.className='field';label.htmlFor='plan-'+field.id;label.textContent=field.label;input.id=label.htmlFor;input.type='text';input.maxLength=160;input.autocomplete='off';
      input.placeholder=field.examples[ages.indexOf(age)];input.value=plan[field.id];
      input.addEventListener('input',()=>{storage.setPlan(age,field.id,input.value);storageStatus();renderPlanPreview();$('plan-status').textContent='';});
      input.addEventListener('blur',()=>{input.value=level().plan[field.id];renderPlanPreview();});
      wrap.append(label,input);fields.append(wrap);
    }
    $('plan-status').textContent='';renderPlanPreview();
  }
  function renderAge() {
    document.querySelectorAll('[data-age]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.age===age)));
    const heroKey=course==='goals'?{'6-9':'goal','10-13':'steps','14-17':'project'}[age]:{'6-9':'day','10-13':'focus','14-17':'project'}[age];
    $('hero-photo').src=mediaURL(mediaPath(heroKey));$('hero-photo').alt=mediaAlt[heroKey];
    $('age-description').textContent=ageDescriptions[age];$('reset-panel').hidden=true;$('reset-progress').setAttribute('aria-expanded','false');
    renderLesson();renderPlan();storageStatus();
  }
  function handleAnswer(event,kind) {
    event.preventDefault();
    const item=kind==='activity'?current().cases[age]:quiz(),picked=document.querySelector(`input[name="${kind}-answer"]:checked`),feedback=$(kind+'-feedback');
    if(!picked){feedback.dataset.kind='error';feedback.textContent='Сначала выбери вариант ответа.';return;}
    if(Number(picked.value)===item.answer){
      storage.complete(age,current().id,kind);feedback.dataset.kind='success';
      feedback.textContent='Верно! '+(kind==='activity'?item.example:item.explanation)+' '+completionText();
      renderProgress();storageStatus();
    }else{feedback.dataset.kind='error';feedback.textContent='Пока не получилось. '+item.hint+' Можно выбрать другой ответ.';}
  }
  document.querySelectorAll('[data-age]').forEach(button=>button.addEventListener('click',()=>{age=button.dataset.age;storage.selectAge(age);restoreLocation(false);renderAge();remember(true);}));
  document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>changeStep(steps.indexOf(button.dataset.step))));
  $('step-prev').addEventListener('click',()=>changeStep(stepIndex-1));$('step-next').addEventListener('click',()=>changeStep(stepIndex+1));
  $('lesson-prev').addEventListener('click',()=>openLesson(lessonIndex-1));$('lesson-next').addEventListener('click',()=>openLesson(lessonIndex+1));
  $('completion-next').addEventListener('click',()=>{
    const a=answerState(current().id);
    if(a.activity && a.quiz){if(lessonIndex<lessons.length-1)openLesson(lessonIndex+1);else{$('practice').scrollIntoView();$('practice').focus();}}
    else changeStep(a.quiz?2:3);
  });
  $('activity-form').addEventListener('submit',event=>handleAnswer(event,'activity'));$('quiz-form').addEventListener('submit',event=>handleAnswer(event,'quiz'));
  $('activity-hint-button').addEventListener('click',()=>{$('activity-hint').textContent=current().cases[age].hint;});$('quiz-hint-button').addEventListener('click',()=>{$('quiz-hint').textContent=quiz().hint;});
  $('plan-form').addEventListener('submit',event=>{event.preventDefault();renderPlanPreview();storageStatus();$('plan-status').textContent=storage.available()?'План сохранён в этом браузере. Его можно изменить.':'Сохранение недоступно. Скачай план, чтобы не потерять его.';});
  $('plan-download').addEventListener('click',()=>{
    const plan=level().plan,text=plans[course].map(f=>`${f.label}: ${plan[f.id].trim()}`).join('\n');
    const blob=new Blob([`AI PATH — ${course==='goals'?'Мой план к цели':'Мой гибкий план дня'}\nУровень: ${ageLabels[age]}\n\n${text}\n`],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`ai-path-${course}-plan.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('plan-status').textContent='План подготовлен для скачивания.';
  });
  $('reset-progress').addEventListener('click',()=>{$('reset-panel').hidden=false;$('reset-progress').setAttribute('aria-expanded','true');$('reset-confirm').focus();});
  $('reset-cancel').addEventListener('click',()=>{$('reset-panel').hidden=true;$('reset-progress').setAttribute('aria-expanded','false');$('reset-progress').focus();});
  $('reset-confirm').addEventListener('click',()=>{storage.reset(age);lessonIndex=0;stepIndex=0;renderAge();remember();$('reset-progress').focus();});
  $('reset-panel').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();$('reset-cancel').click();}});
  window.addEventListener('popstate',()=>{restoreLocation();renderAge();storage.position(age,current().id,steps[stepIndex]);});
  window.addEventListener('storage',event=>{
    if(event.key!==null && !event.key.startsWith(storage.levelPrefix(age)))return;
    const plan=level().plan;
    for(const field of plans[course]){const input=$('plan-'+field.id);if(input!==document.activeElement)input.value=plan[field.id];}
    renderPlanPreview();renderProgress();storageStatus('Изменения из другой вкладки загружены. Место занятия осталось прежним.');
  });
  restoreLocation();storage.selectAge(age);$('course-app').hidden=false;renderAge();remember();
})();
