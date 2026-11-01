import { journeys, getProjectPlan, programNames } from './project-journeys.js';

const byId = id => document.getElementById(id);
const form = byId('project-wizard');
const query = new URLSearchParams(location.search);
let requestedProgram = query.get('program') === 'unity' ? 'unity' : '';
const initial = getProjectPlan(query.get('project'), query.get('journey'), requestedProgram, query.get('gameIdea'));
let gameIdeaId = initial.concept?.id || '';
let projectId = initial.example?.id || '';
let journeyId = initial.id;
let step = 1;
let currentPlan = initial;
const make = (tag, text) => { const element = document.createElement(tag); if (text) element.textContent = text; return element; };
const allowed = (value, values, fallback) => values.includes(value) ? value : fallback;
const levels = { zero:'Начинаю с нуля', basic:'Уже пробовал', project:'Есть свой проект' };
const paces = { light:'2–3 часа в неделю', balanced:'4–6 часов в неделю', deep:'7+ часов в неделю' };

for (const journey of journeys) {
  const existing = form.querySelector(`input[name="journey"][value="${journey.id}"]`);
  if (existing) { existing.checked = journey.id === journeyId; continue; }
  const label = make('label'); label.className = 'choice';
  const input = make('input'); input.type = 'radio'; input.name = 'journey'; input.value = journey.id; input.checked = journey.id === journeyId;
  const text = make('span'); text.append(make('strong',journey.label),make('small',journey.description));
  label.append(input,text); byId('journey-choices').append(label);
}
form.elements.mode.value = allowed(query.get('mode'),['learn','build'],'learn');
byId('project-level').value = allowed(query.get('level'),Object.keys(levels),'zero');
byId('project-pace').value = allowed(query.get('pace'),Object.keys(paces),'balanced');

function syncURL() {
  const next = new URLSearchParams();
  if (projectId) next.set('project',projectId);
  if (currentPlan.program === 'unity') next.set('program','unity');
  if (currentPlan.concept) next.set('gameIdea',currentPlan.concept.id);
  next.set('journey',journeyId); next.set('mode',form.elements.mode.value);
  next.set('level',byId('project-level').value); next.set('pace',byId('project-pace').value);
  // Only fixed choices are addressable. Free text is never persisted or put in a URL.
  history.replaceState(null,'',location.pathname+'?'+next.toString());
}
function syncPlan() {
  currentPlan = getProjectPlan(projectId,journeyId,requestedProgram,gameIdeaId);
  const business = form.querySelector('input[name="mode"][value="build"]');
  business.disabled = Boolean(currentPlan.learnOnly);
  if (business.disabled) form.elements.mode.value = 'learn';
  byId('mode-note').textContent = currentPlan.learnOnly ? 'Здесь доступен учебный разбор с наставником. План можно забрать и использовать самостоятельно.' : form.elements.mode.value === 'build' ? 'Это запрос на обсуждение возможности разработки. Объём, сроки и стоимость определим после разбора задачи; выбор формата не оформляет заказ.' : 'В плане будет связанный учебный маршрут. Уровень и нагрузку можно уточнить на первом обсуждении.';
  byId('preview-title').textContent = currentPlan.title;
  byId('preview-description').textContent = currentPlan.proposal;
  byId('example-preview').hidden = !currentPlan.example;
  byId('selected-example').hidden = !currentPlan.example;
  if (currentPlan.example) {
    byId('selected-example').textContent = currentPlan.example.name+' ↗';
    byId('selected-example').href = withCourseContext(currentPlan.example.url);
    byId('example-transfer').textContent = currentPlan.transfer;
    byId('example-note').textContent = currentPlan.example.note;
  }
  const previous = byId('project-action').value;
  byId('project-action').replaceChildren(...currentPlan.actions.map(action => { const option = make('option',action); option.value = action; return option; }));
  if (currentPlan.actions.includes(previous)) byId('project-action').value = previous;
  byId('browse-examples').href = withCourseContext('demos.html');
  syncURL();
}
function withCourseContext(path) {
  const target = new URL(path,location.href);
  if (target.origin !== location.origin) return path;
  target.searchParams.set('program',currentPlan.program);
  target.searchParams.set('level',byId('project-level').value);
  target.searchParams.set('pace',byId('project-pace').value);
  return target.pathname+target.search+target.hash;
}
function showStep(number, focus = true) {
  step = number; form.hidden = false; byId('plan-result').hidden = true;
  form.querySelectorAll('fieldset[data-step]').forEach(field => { field.hidden = Number(field.dataset.step) !== step; });
  form.querySelectorAll('[data-progress]').forEach(item => { if (Number(item.dataset.progress) === step) item.setAttribute('aria-current','step'); else item.removeAttribute('aria-current'); });
  byId('step-status').textContent = `Шаг ${step} из 3`;
  byId('previous-step').hidden = step === 1;
  byId('next-step').hidden = step === 3;
  byId('make-plan').hidden = step !== 3;
  byId('next-step').textContent = step === 1 ? 'Выбрать формат →' : 'Добавить свою идею →';
  if (focus) form.querySelector(`fieldset[data-step="${step}"] legend`).focus();
}
form.addEventListener('change',event => {
  if (event.target.name === 'journey') {
    journeyId = event.target.value;
    if (journeyId !== 'story') { requestedProgram = ''; gameIdeaId = ''; }
    if (!journeys.find(journey => journey.id === journeyId).projectIds.includes(projectId)) projectId = '';
  }
  syncPlan();
});
byId('next-step').addEventListener('click',() => showStep(Math.min(3,step+1)));
byId('previous-step').addEventListener('click',() => showStep(Math.max(1,step-1)));

function buildPlan() {
  const plan = currentPlan;
  const mode = form.elements.mode.value;
  const idea = byId('project-idea').value.trim().slice(0,240);
  const audience = byId('project-audience').value.trim().slice(0,100);
  const action = byId('project-action').value;
  const course = new URL('./','https://safal207.github.io/test-it-python/ai-path/');
  course.search = new URLSearchParams({ program:plan.program,level:byId('project-level').value,pace:byId('project-pace').value }).toString(); course.hash = 'selected';
  const nextTitle = mode === 'build' ? 'Обсудить первую рабочую версию' : 'Разобрать план с наставником';
  const nextDescription = mode === 'build' ? 'Сначала уточним пользователя, основное действие и ограничения. После этого согласуем состав первой версии и критерии её проверки.' : 'Уточним посильный объём, стартовую задачу и учебный маршрут. Выбранный пример поможет объяснить, что именно тебе хочется сделать.';
  const text = [
    'AI PATH — план первой версии','',
    `Направление: ${plan.label}`,
    `Формат: ${mode === 'build' ? 'Обсудить разработку' : 'Создать с наставником'}`,
    ...(plan.concept ? [`Учебная идея: ${plan.concept.title}`,`Целевая платформа: ${plan.concept.platform}`,`Жанр: ${plan.concept.genre}`,`Управление: ${plan.concept.controls}`] : []),
    ...(plan.example ? [`Пример: ${plan.example.name}`,`Ссылка на пример: ${new URL(plan.example.url,'https://safal207.github.io/test-it-python/ai-path/').href}`,`Что перенести в свою задачу: ${plan.transfer}`,`Границы примера: ${plan.example.note}`] : []),
    '',`Для кого: ${audience || 'Уточним на разборе'}`,`Моя идея: ${idea || plan.proposal}`,`Главное действие: ${action}`,
    '', 'Первая версия:', ...plan.deliverables.map((item,index) => `${index+1}. ${item}`),
    '', 'Проверка готовности:', ...plan.checks.map((item,index) => `${index+1}. ${item}`),
    '', `Границы: ${plan.boundary}`,
    ...(mode === 'learn' ? ['',`Учебный маршрут: ${programNames[plan.program] || plan.program}`,`Опыт: ${levels[byId('project-level').value]}`,`Практика: ${paces[byId('project-pace').value]}`,`Программа: ${course.href}`] : []),
    '',`Следующий шаг: ${nextTitle}. ${nextDescription}`,
    'Стоимость, сроки, состав работы и возможные расходы на сервисы согласуем до начала.',
    '', 'Здравствуйте! Хочу обсудить этот план и уточнить подходящий первый шаг.',
    'Это черновик по моим ответам, а не согласованное техническое задание или оформленный заказ.'
  ].join('\n');
  byId('result-summary').textContent = idea || plan.proposal;
  byId('result-focus').textContent = `Для кого: ${audience || 'уточним вместе'}. Главное действие: ${action.toLocaleLowerCase('ru')}.`;
  byId('plan-deliverables').replaceChildren(...plan.deliverables.map(item => make('li',item)));
  byId('plan-checks').replaceChildren(...plan.checks.map(item => make('li',item)));
  byId('plan-boundary').textContent = plan.boundary;
  byId('next-title').textContent = nextTitle; byId('next-description').textContent = nextDescription;
  byId('plan-text').value = text;
  byId('plan-email').href = 'mailto:safal0645@gmail.com?subject='+encodeURIComponent('AI PATH — '+plan.label)+'&body='+encodeURIComponent(text);
  byId('plan-course').href = './'+course.search+course.hash;
  byId('plan-course').textContent = `Учебный маршрут: ${programNames[plan.program] || plan.program} ↗`;
  byId('course-note').textContent = 'План можно скачать перед переходом: свободные ответы не передаются на другие страницы.';
  byId('course-row').hidden = mode !== 'learn';
  byId('copy-status').textContent = '';
  form.hidden = true; byId('plan-result').hidden = false; byId('plan-title').focus();
}
form.addEventListener('submit',event => { event.preventDefault(); if (step < 3) showStep(step+1); else buildPlan(); });
byId('download-plan').addEventListener('click',() => {
  const url = URL.createObjectURL(new Blob([byId('plan-text').value],{type:'text/plain;charset=utf-8'}));
  const link = make('a'); link.href = url; link.download = `ai-path-${currentPlan.concept?.id || projectId || journeyId}-plan.txt`; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
});
byId('copy-plan').addEventListener('click',async () => {
  try { await navigator.clipboard.writeText(byId('plan-text').value); byId('copy-status').textContent = 'Текст скопирован. Вставь его в письмо или сохрани у себя.'; }
  catch { byId('plan-text').focus(); byId('plan-text').select(); byId('copy-status').textContent = 'Браузер не разрешил копирование. Текст выделен: скопируй его вручную или скачай план.'; }
});
byId('edit-plan').addEventListener('click',() => showStep(3));
byId('new-plan').addEventListener('click',() => {
  byId('project-audience').value = ''; byId('project-idea').value = ''; byId('plan-text').value = ''; byId('plan-email').href = 'mailto:safal0645@gmail.com';
  projectId = ''; requestedProgram = ''; gameIdeaId = ''; journeyId = journeys[0].id; form.elements.journey.value = journeyId; form.elements.mode.value = 'learn';
  byId('project-level').value = 'zero'; byId('project-pace').value = 'balanced'; syncPlan(); showStep(1);
});
syncPlan(); showStep(1,false); byId('next-step').disabled = false;
