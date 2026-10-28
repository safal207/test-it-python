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
  const key = 'ai-path-life-skills-' + course + '-v1';
  const $ = id => document.getElementById(id);
  let saved = {};
  let storageWorks = true;
  try { saved = JSON.parse(localStorage.getItem(key) || '{}'); }
  catch { storageWorks = false; saved = {}; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  let age = ages.includes(saved.age) ? saved.age : '10-13';
  let levels = saved.levels && typeof saved.levels === 'object' && !Array.isArray(saved.levels) ? saved.levels : {};
  let lessonIndex = 0, stepIndex = 0;
  function level() {
    const old = levels[age];
    if (!old || typeof old !== 'object' || Array.isArray(old)) levels[age] = {};
    const current = levels[age];
    if (!current.answers || typeof current.answers !== 'object' || Array.isArray(current.answers)) current.answers = {};
    if (!current.plan || typeof current.plan !== 'object' || Array.isArray(current.plan)) current.plan = {};
    return current;
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify({age,levels})); storageWorks = true; }
    catch { storageWorks = false; }
    $('storage-status').textContent = storageWorks ? 'Прогресс и план сохраняются в этом браузере.' : 'Сохранение в браузере недоступно: данные останутся только до закрытия страницы.';
  }
  function answerState(id) {
    const answers = level().answers;
    if (!answers[id] || typeof answers[id] !== 'object') answers[id] = {activity:false,quiz:false};
    return answers[id];
  }
  function renderProgress() {
    const done = lessons.filter(l => answerState(l.id).activity === true && answerState(l.id).quiz === true).length;
    $('course-progress').value = done;
    $('progress-label').textContent = `Пройдено ${done} из ${lessons.length} уроков`;
    document.querySelectorAll('[data-lesson]').forEach(button => {
      const a = answerState(button.dataset.lesson);
      button.querySelector('.lesson-state').textContent = a.activity === true && a.quiz === true ? 'Урок пройден' : 'Задача и проверка';
    });
  }
  function addOptions(container, name, choices) {
    container.replaceChildren();
    choices.forEach((choice,i) => {
      const label = document.createElement('label'); label.className = 'quiz-option';
      const input = document.createElement('input'); input.type='radio'; input.name=name; input.value=String(i);
      const text = document.createElement('span'); text.textContent=choice;
      label.append(input,text); container.append(label);
    });
  }
  function renderSteps() {
    steps.forEach((step,i) => { $('step-' + step).hidden = i !== stepIndex; document.querySelector(`[data-step="${step}"]`).setAttribute('aria-pressed',String(i === stepIndex)); });
    $('step-prev').disabled = stepIndex === 0;
    $('step-next').disabled = stepIndex === steps.length - 1;
    $('step-next').textContent = ['К разбору →','Попробовать →','К проверке →','Проверка открыта'][stepIndex];
  }
  function renderLesson(focus) {
    const lesson = lessons[lessonIndex], item = lesson.cases[age];
    $('lesson-counter').textContent = `УРОК ${lessonIndex + 1} / ${lessons.length} · ${ageLabels[age]}`;
    $('lesson-title').textContent = lesson.title;
    $('task-story').textContent = item.story;
    $('lesson-text').replaceChildren();
    const rule = document.createElement('p'); rule.textContent = lesson.rule; $('lesson-text').append(rule);
    $('lesson-example').textContent = item.example;
    $('activity-question').textContent = item.question;
    addOptions($('activity-options'),'activity-answer',item.choices);
    $('quiz-question').textContent = lesson.quiz.question;
    addOptions($('quiz-options'),'quiz-answer',lesson.quiz.choices);
    ['activity-hint','activity-feedback','quiz-hint','quiz-feedback'].forEach(id => { $(id).textContent=''; $(id).removeAttribute('data-kind'); });
    $('lesson-prev').disabled = lessonIndex === 0; $('lesson-next').disabled = lessonIndex === lessons.length - 1;
    const list = $('lesson-list'); list.replaceChildren();
    lessons.forEach((entry,i) => {
      const li=document.createElement('li'), button=document.createElement('button'), number=document.createElement('span'), text=document.createElement('span'), status=document.createElement('span');
      button.type='button'; button.dataset.lesson=entry.id;
      if(i === lessonIndex) button.setAttribute('aria-current','step');
      number.className='lesson-number'; number.textContent=String(i+1).padStart(2,'0');
      text.textContent=entry.title; status.className='lesson-state'; text.append(status);
      button.append(number,text); li.append(button); list.append(li);
      button.addEventListener('click',() => {lessonIndex=i; stepIndex=0; renderLesson(true);});
    });
    renderSteps(); renderProgress();
    if (focus) $('lesson-title').focus();
  }
  function renderPlanPreview() {
    const values = plans[course].map(field => [field.label, String(level().plan[field.id] || '').trim()]).filter(([,value]) => value);
    $('plan-preview').textContent = values.length ? values.map(([label,value]) => `${label}\n${value}`).join('\n\n') : 'Твой план появится здесь после заполнения.';
  }
  function renderPlan() {
    const fields=$('plan-fields'); fields.replaceChildren();
    plans[course].forEach(field => {
      const wrap=document.createElement('div'), label=document.createElement('label'), input=document.createElement('input');
      wrap.className='field'; label.htmlFor='plan-'+field.id; label.textContent=field.label;
      input.id=label.htmlFor; input.type='text'; input.maxLength=160; input.autocomplete='off';
      input.placeholder=field.examples[ages.indexOf(age)]; input.value=String(level().plan[field.id] || '').slice(0,160);
      input.addEventListener('input',() => {level().plan[field.id]=input.value; save(); renderPlanPreview(); $('plan-status').textContent='';});
      wrap.append(label,input); fields.append(wrap);
    });
    $('plan-status').textContent=''; renderPlanPreview();
  }
  function renderAge() {
    document.querySelectorAll('[data-age]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.age === age)));
    $('age-description').textContent=ageDescriptions[age];
    $('reset-panel').hidden=true; $('reset-progress').setAttribute('aria-expanded','false');
    renderLesson(false); renderPlan(); save();
  }
  function handleAnswer(event,kind) {
    event.preventDefault();
    const lesson = lessons[lessonIndex], item = kind === 'activity' ? lesson.cases[age] : lesson.quiz;
    const picked = document.querySelector(`input[name="${kind}-answer"]:checked`);
    const feedback=$(kind+'-feedback');
    if (!picked) { feedback.dataset.kind='error'; feedback.textContent='Сначала выбери вариант ответа.'; return; }
    if (Number(picked.value) === item.answer) {
      answerState(lesson.id)[kind] = true;
      feedback.dataset.kind='success'; feedback.textContent='Верно! ' + (kind === 'activity' ? item.example : lesson.rule);
      save(); renderProgress();
    } else {
      feedback.dataset.kind='error'; feedback.textContent='Пока не получилось. Попробуй ещё раз или открой подсказку.';
    }
  }
  document.querySelectorAll('[data-age]').forEach(button => button.addEventListener('click',() => {age=button.dataset.age; lessonIndex=0; stepIndex=0; renderAge();}));
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click',() => {stepIndex=steps.indexOf(button.dataset.step); renderSteps();}));
  $('step-prev').addEventListener('click',() => {stepIndex=Math.max(0,stepIndex-1); renderSteps();});
  $('step-next').addEventListener('click',() => {stepIndex=Math.min(steps.length-1,stepIndex+1); renderSteps();});
  $('lesson-prev').addEventListener('click',() => {lessonIndex=Math.max(0,lessonIndex-1); stepIndex=0; renderLesson(true);});
  $('lesson-next').addEventListener('click',() => {lessonIndex=Math.min(lessons.length-1,lessonIndex+1); stepIndex=0; renderLesson(true);});
  $('activity-form').addEventListener('submit',event => handleAnswer(event,'activity'));
  $('quiz-form').addEventListener('submit',event => handleAnswer(event,'quiz'));
  $('activity-hint-button').addEventListener('click',() => {$('activity-hint').textContent=lessons[lessonIndex].cases[age].hint;});
  $('quiz-hint-button').addEventListener('click',() => {$('quiz-hint').textContent=lessons[lessonIndex].quiz.hint;});
  $('plan-form').addEventListener('submit',event => {
    event.preventDefault(); save(); renderPlanPreview();
    $('plan-status').textContent=storageWorks ? 'План сохранён в этом браузере. Его можно изменить.' : 'План показан на странице, но браузер не разрешил сохранение. Скачай его, чтобы сохранить.';
  });
  $('plan-download').addEventListener('click',() => {
    const text=plans[course].map(field => `${field.label}: ${String(level().plan[field.id] || '').trim()}`).join('\n');
    const blob=new Blob([`AI PATH — ${course === 'goals' ? 'Мой план к цели' : 'Мой гибкий план дня'}\nУровень: ${ageLabels[age]}\n\n${text}\n`],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob), link=document.createElement('a'); link.href=url; link.download=`ai-path-${course}-plan.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
    $('plan-status').textContent='План подготовлен для скачивания.';
  });
  $('reset-progress').addEventListener('click',() => {$('reset-panel').hidden=false; $('reset-progress').setAttribute('aria-expanded','true'); $('reset-confirm').focus();});
  $('reset-cancel').addEventListener('click',() => {$('reset-panel').hidden=true; $('reset-progress').setAttribute('aria-expanded','false'); $('reset-progress').focus();});
  $('reset-confirm').addEventListener('click',() => {levels[age]={}; lessonIndex=0; stepIndex=0; renderAge(); $('reset-progress').focus();});
  $('reset-panel').addEventListener('keydown',event => {if(event.key === 'Escape'){event.preventDefault(); $('reset-cancel').click();}});
  $('course-app').hidden=false; renderAge();
})();
