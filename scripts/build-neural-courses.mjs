import { readFile, writeFile, mkdir } from 'node:fs/promises';
import vm from 'node:vm';

// The chooser and this static, no-JavaScript-required guide use one curriculum.
const root = new URL('../dist/ai-path/', import.meta.url);
const context = { window: {} };
vm.runInNewContext(await readFile(new URL('neural-courses-data.js', root), 'utf8'), context);
const courses = context.window.AIPathNeuralCourses;
const manifest = JSON.parse(await readFile(new URL('data/neural-notebooks.json', root), 'utf8'));
const ids = courses.map(c => c.id);
const notebooks = manifest.notebooks;
const app = await readFile(new URL('app.js', root), 'utf8');
const originalCollection = JSON.parse(app.match(/var notebooks=(\[.*?\]);/)[1]);
if (ids.length !== 8 || new Set(ids).size !== 8 || notebooks.length !== 66 || new Set(notebooks.map(n => n.path)).size !== 66) throw Error('Expected eight courses and 66 unique notebook paths');
for (const n of notebooks) {
  if (!ids.includes(n.course) || !n.path.endsWith('.ipynb') || !['starter', 'archive'].includes(n.status)) throw Error('Invalid notebook assignment: ' + n.path);
}
for (const n of originalCollection) if (!notebooks.some(item => item.path === n.path)) throw Error('Lost original notebook: ' + n.path);
if (notebooks.filter(n => n.status === 'starter').map(n => n.path).join() !== 'ML/reproducible_mlp_xor_numpy.ipynb') throw Error('Only the controlled NumPy notebook is the starter');
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const plan = id => './?program=' + id + '&level=' + (id === 'ml-python' ? 'zero' : 'basic') + '&pace=balanced#selected';
const source = n => 'https://github.com/' + manifest.repository + '/blob/' + manifest.ref + '/' + n.path.split('/').map(encodeURIComponent).join('/');
const byId = id => courses.find(c => c.id === id);
const chips = course => course.prerequisites.length ? course.prerequisites.map(id => `<a href="#${id}">${esc(byId(id).name)}</a>`).join(course.id === 'ml-series' ? ' или ' : ', ') : 'Можно начать без опыта';
const cards = courses.map((c, i) => {
  const materials = notebooks.filter(n => n.course === c.id);
  return `<article class="nc-card" id="${c.id}" data-neural-course="${c.id}" aria-labelledby="title-${c.id}">
  <div class="nc-art"><img src="assets/neural-courses/${c.id}.svg" width="960" height="640" loading="lazy" decoding="async" alt="${esc('Учебная схема: ' + c.diagram.join(' → '))}"><span>${esc(c.stage)}</span></div>
  <div class="nc-copy"><p class="nc-meta">${c.weeks} ${c.weeks === 4 ? 'недели' : 'недель'} · ${c.meetings} ${c.meetings === 4 ? 'встречи' : 'встреч'} · ${materials.length} ${materials.length === 21 ? 'материал' : [2,3,4].includes(materials.length) ? 'материала' : 'материалов'}</p>
  <h2 id="title-${c.id}">${esc(c.name)}</h2><p>${esc(c.short)}</p>
  <p class="nc-level"><strong>Для старта:</strong> ${esc(c.level)}.</p>
  <div class="nc-result"><h3>Что получится</h3><p>${esc(c.outcome)}</p></div>
  <a class="nc-button" data-course-plan="${c.id}" href="${esc(plan(c.id))}">Выбрать курс и открыть план <span aria-hidden="true">↗</span></a>
  <details class="nc-details"><summary>Темы и материалы · ${materials.length}</summary>
    <h3>Что изучим</h3><ul>${c.topics.map(t => '<li>' + esc(t) + '</li>').join('')}</ul>
    <h3>План по этапам</h3><ol>${c.steps.map(t => '<li>' + esc(t) + '</li>').join('')}</ol>
    <p><strong>Подготовка:</strong> ${chips(c)}.</p>
    <p class="nc-scope">${esc(c.extra)}</p>
    ${c.guide ? `<p><a href="neural-networks.html?task=${c.guide}">Разобрать схему модели →</a></p>` : ''}
    <h3>Исходные ноутбуки</h3><p class="nc-caption">Материалы для выбора упражнений, не число обязательных уроков. Архивные файлы могут требовать обновления зависимостей и доступа к данным.</p>
    <ul class="nc-materials">${materials.map(n => `<li><a data-course-notebook="${c.id}" data-notebook-status="${n.status}" href="${esc(source(n))}" target="_blank" rel="noopener noreferrer">${esc(n.title)} ↗</a><small>${n.status === 'starter' ? 'Стартовый NumPy-пример · выполняется в CI источника' : 'Исторический архив · запуск проверяется перед занятием'}</small></li>`).join('')}</ul>
  </details></div>
</article>`;
}).join('\n');
const practice = `<section class="nc-practice" id="kaggle-practice" aria-labelledby="practice-title">
<p class="nc-eyebrow">От учебного эксперимента к первой отправке</p><h2 id="practice-title">Обучение, дообучение и Kaggle</h2>
<p>Выбери, что хочешь попробовать. Это варианты практики в существующих курсах: подготовку, один итоговый проект и объём участия согласуем с наставником.</p>
<div class="nc-practice-grid">
<article data-practice-path="train"><h3>Обучить свою модель</h3><div class="nc-practice-flow" aria-label="Путь обучения с нуля"><span>Данные</span><span>Обучение</span><span>Свои веса</span></div><p>Соберём небольшую MLP, посмотрим, как меняются веса, и проверим результат на новых примерах.</p><p class="nc-caption">Результат: ноутбук с обучением, метрикой и разбором ошибок.</p><a class="nc-practice-link" data-practice-plan="ml" href="${esc(plan('ml'))}">Курс «Первая модель» →</a></article>
<article data-practice-path="finetune"><h3>Дообучить готовую сеть</h3><div class="nc-practice-flow" aria-label="Путь адаптации готовой модели"><span>Готовые веса</span><span>Свои данные</span><span>Новые веса</span></div><p>На задаче с изображениями обучим новый выходной слой, затем сравним дообучение части сети на той же проверочной выборке.</p><p class="nc-caption">Результат: сравнение модели с замороженной основой и модели после дообучения. Задача и проверочные данные одинаковы.</p><a class="nc-practice-link" data-practice-plan="ml-vision" href="${esc(plan('ml-vision'))}">Курс компьютерного зрения →</a></article>
<article data-practice-path="kaggle"><h3>Подготовить решение Kaggle</h3><div class="nc-practice-flow" aria-label="Путь к участию в соревновании"><span>Задача</span><span>Проверка</span><span>Файл прогнозов</span></div><p>После основ выберем задачу Getting Started, построим простое решение для сравнения и подготовим файл прогнозов по её требованиям.</p><p class="nc-caption">Результат: воспроизводимый ноутбук, submission-файл и журнал экспериментов. Для таблиц нейросеть необязательна.</p><a class="nc-practice-link" data-practice-plan="ml-data" href="${esc(plan('ml-data'))}">Начать с табличного ML →</a></article>
</div>
<details class="nc-details" id="kaggle-steps"><summary>Как дойдём до первой отправки</summary><ol>
<li>Прочитаем задачу, метрику, формат ответа и правила соревнования; проверим допуск, внешние данные, готовые веса и применение ИИ.</li>
<li>Отделим проверочную выборку и запустим простую модель — исходный результат для сравнения.</li>
<li>Изменим один подход, сравним на проверочной части, разберём ошибки и сохраним код. Дообучение выбираем там, где оно подходит задаче и разрешено правилами.</li>
<li>Проверим submission-файл. Ты принимаешь правила и отправляешь решение из своего аккаунта; после приёма сохраним результат и оформим кейс.</li>
</ol></details>
<p class="nc-practice-examples">Примеры для выбора: <a data-kaggle-example href="https://www.kaggle.com/competitions/house-prices-advanced-regression-techniques" target="_blank" rel="noopener noreferrer">House Prices · регрессия по таблицам ↗</a> <a data-kaggle-example href="https://www.kaggle.com/competitions/digit-recognizer" target="_blank" rel="noopener noreferrer">Digit Recognizer · изображения цифр ↗</a></p>
<p class="nc-caption">Getting Started — учебные соревнования для знакомства с платформой. Условия и доступность проверяем перед стартом; место и призы не входят в обещанный результат. Подход к дообучению: <a href="https://www.tensorflow.org/tutorials/images/transfer_learning" target="_blank" rel="noopener noreferrer">официальный пример TensorFlow ↗</a>.</p>
</section>`;
const html = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#35443a">
<title>Нейросети — 8 отдельных курсов с практикой | AI PATH</title>
<meta name="description" content="Python, первая нейросеть, табличный ML, компьютерное зрение, NLP, звук, временные ряды и подбор архитектуры. Программы курсов и все 66 учебных ноутбуков.">
<link rel="canonical" href="https://safal207.github.io/test-it-python/ai-path/neural-courses.html">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="stylesheet" href="neural-courses.css"><script src="course-navigation.js?v=2" defer></script></head>
<body><a class="nc-skip" href="#courses">К курсам</a>
<header class="nc-header"><a class="nc-brand" href="./">AI <b>PATH</b></a><nav aria-label="Меню курсов"><a href="./#programs" data-course-back>Все программы школы</a><a href="neural-networks.html">Как устроены сети</a></nav></header>
<main class="nc-main"><section class="nc-intro" aria-labelledby="page-title"><p class="nc-eyebrow">Обучение с наставником · 8 курсов</p><h1 id="page-title">Нейросети.<br><em>Выбери свою задачу.</em></h1>
<p class="nc-lead">От первого Python-кода до моделей для изображений, текстов и звука. У каждого курса — своя программа, требования к подготовке и один понятный итоговый проект.</p>
<div class="nc-actions"><a class="nc-button" href="#ml-python">Начинаю с нуля ↓</a><a class="nc-secondary" href="#ml">Python уже знаю ↓</a><a class="nc-secondary" href="#kaggle-practice">Хочу попробовать Kaggle ↓</a></div>
<p class="nc-caption">Сроки — базовый план для одного проекта. Темп, набор данных, инструменты и стоимость согласуем до старта.</p></section>
<section class="nc-route" aria-labelledby="route-title"><h2 id="route-title">Как выбрать последовательность</h2><ol><li><strong>Подготовка</strong><span>Python, массивы, таблицы и графики.</span></li><li><strong>Первая модель</strong><span>Как сеть учится и как проверить ответ.</span></li><li><strong>Одна специализация</strong><span>Таблицы, изображения, тексты, звук или ряды.</span></li><li><strong>Улучшение модели</strong><span>Подбор архитектуры после первого эксперимента.</span></li></ol><p>Проходить все восемь подряд не обязательно. Табличный ML доступен после Python; специализацию выбираем по твоей задаче.</p></section>
<nav class="nc-jumps" aria-label="Быстрый выбор курса">${courses.map((c,i) => `<a href="#${c.id}">${String(i+1).padStart(2,'0')} · ${esc(c.name)}</a>`).join('')}</nav>
<div class="nc-grid" id="courses">${cards}</div>
${practice}
<section class="nc-archive" id="archive" aria-labelledby="archive-title"><p class="nc-eyebrow">Все материалы на месте</p><h2 id="archive-title">66 ноутбуков распределены по курсам</h2><p>В каталог вошли все 24 работы прежней подборки и остальные 42 ноутбука: подготовка, статистика, временные ряды, перенос обучения и дополнительные задания. Каждый файл закреплён за одним курсом.</p>
<p>Один стартовый NumPy-пример выполняется в CI исходного репозитория. Остальные 65 — исторический архив. Сохранённые выводы и точность в названиях файлов не подтверждают текущую воспроизводимость. Перед практикой проверим окружение и данные.</p>
<a href="https://github.com/${manifest.repository}/tree/${manifest.ref}" target="_blank" rel="noopener noreferrer">Открыть полный архив источника ↗</a> · <a href="./#research">Прежняя подборка 24 работ →</a></section>
</main><footer class="nc-footer"><a href="./#programs">К другим программам школы →</a><span>AI PATH · Алексей Сафонов</span></footer></body></html>
`;

// Small explanatory diagrams, not generated images or claims of model execution.
const glyphs = {
  'ml-python': '<path d="M342 210h276v155H342zM342 252h276M342 297h276M405 210v155M490 210v155M554 210v155"/>',
  ml: '<path d="M360 220L480 190 600 270 480 350 360 320 480 190M360 220L480 350M360 320L600 270"/><circle cx="360" cy="220" r="18"/><circle cx="360" cy="320" r="18"/><circle cx="480" cy="190" r="18"/><circle cx="480" cy="350" r="18"/><circle cx="600" cy="270" r="18"/>',
  'ml-data': '<path d="M335 190v180h300M365 320L420 295 465 310 520 250 600 215"/><circle cx="385" cy="300" r="9"/><circle cx="450" cy="270" r="9"/><circle cx="510" cy="280" r="9"/><circle cx="555" cy="215" r="9"/>',
  'ml-vision': '<rect x="345" y="190" width="245" height="180" rx="14"/><path d="M365 340l65-75 48 49 40-29 52 55"/><circle cx="537" cy="228" r="16"/><rect x="395" y="247" width="110" height="104" rx="7"/>',
  'ml-text': '<rect x="335" y="185" width="290" height="175" rx="24"/><path d="M380 360v34l50-34M377 230h205M377 270h145M377 310h175"/>',
  'ml-audio': '<path d="M330 280h30l15-40 25 100 30-150 30 170 25-130 25 80 25-120 25 155 20-65h50"/>',
  'ml-series': '<path d="M330 190v180h300M350 335l55-45 40 25 50-70"/><path d="M495 245l40 30 35-55 55-20" stroke-dasharray="12 10"/><path d="M495 185v185" stroke-dasharray="6 10"/>',
  'ml-tuning': '<path d="M350 220h260M350 280h260M350 340h260"/><circle cx="420" cy="220" r="20"/><circle cx="550" cy="280" r="20"/><circle cx="465" cy="340" r="20"/>'
};
const outputs = [['neural-courses.html', html.replace(/[ \t]+$/gm, '')], ...courses.map(c => ['assets/neural-courses/' + c.id + '.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" width="960" height="640"><rect width="960" height="640" fill="#edf0e8"/><circle cx="480" cy="285" r="210" fill="#e1e7da"/><g fill="#edf0e8" stroke="#354f40" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">${glyphs[c.id]}</g><g font-family="system-ui,sans-serif" text-anchor="middle" fill="#253f31" font-size="26">${c.diagram.map((label,i) => `<rect x="${70+i*290}" y="474" width="240" height="70" rx="16" fill="#fffdf6"/><text x="${190+i*290}" y="518">${esc(label)}</text>${i<2 ? `<path d="M${320+i*290} 510h28m-8-8 8 8-8 8" fill="none" stroke="#354f40" stroke-width="4"/>` : ''}`).join('')}</g></svg>\n`])];
const check = process.argv.includes('--check');
for (const [path, content] of outputs) {
  const destination = new URL(path, root);
  if (check) {
    if (await readFile(destination, 'utf8') !== content) throw Error('Generated course file is stale: ' + path);
  } else {
    await mkdir(new URL('.', destination), { recursive: true });
    await writeFile(destination, content);
  }
}
console.log(`${check ? 'Verified' : 'Built'} 8 courses; all 66 notebook assignments and the original 24 links preserved.`);
