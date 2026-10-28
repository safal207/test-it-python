(() => {
  'use strict';
  const content = window.AIPathFinance;
  if (!content?.groups) return;
  const groups = content.groups;
  const key = 'ai-path-finance-v1';
  const $ = id => document.getElementById(id);
  const format = n => new Intl.NumberFormat('ru-RU').format(n);
  const validAge = age => Object.hasOwn(groups, age);
  const validLesson = (age, id) => groups[age].lessons.some(lesson => lesson.id === id);
  const budgetKeys = ['income', 'needs', 'fun', 'save', 'reserve'];
  const goalKeys = ['target', 'saved', 'contribution', 'prediction'];
  let storageAvailable = true;
  let storageRecovered = false;
  const fresh = age => ({ lesson: 'choice', answers: {}, budget: Object.fromEntries(budgetKeys.map(k => [k, String(groups[age].budget[k])])), goal: { ...Object.fromEntries(['target','saved','contribution'].map(k => [k, String(groups[age].goal[k])])), prediction: '' }, budgetDone: false, goalDone: false });
  const state = { age: '10-13', levels: {} };
  function safeValue(value, fallback) {
    if (value === '') return '';
    const number = Number(value);
    return typeof value === 'string' && Number.isSafeInteger(number) && number >= 0 && number <= 1000000 ? String(number) : fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored?.version !== 1 || !stored.levels || typeof stored.levels !== 'object') throw new Error('Unsupported progress');
      if (validAge(stored.age)) state.age = stored.age;
      for (const age of Object.keys(groups)) {
        const clean = fresh(age), saved = stored.levels[age];
        if (saved && typeof saved === 'object') {
          if (validLesson(age, saved.lesson)) clean.lesson = saved.lesson;
          for (const lesson of groups[age].lessons) if (saved.answers?.[lesson.id] === lesson.answer) clean.answers[lesson.id] = lesson.answer;
          for (const name of budgetKeys) clean.budget[name] = safeValue(saved.budget?.[name], clean.budget[name]);
          for (const name of goalKeys) clean.goal[name] = safeValue(saved.goal?.[name], clean.goal[name]);
          clean.budgetDone = saved.budgetDone === true;
          clean.goalDone = saved.goalDone === true;
        }
        state.levels[age] = clean;
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError || error.message === 'Unsupported progress') storageRecovered = true;
    else storageAvailable = false;
  }
  for (const age of Object.keys(groups)) state.levels[age] ||= fresh(age);
  const group = () => groups[state.age];
  const level = () => state.levels[state.age];
  const currentLesson = () => group().lessons.find(lesson => lesson.id === level().lesson);
  function storedNumber(value, positive = false) {
    if (value === '' || !Number.isSafeInteger(Number(value))) return null;
    const n = Number(value);
    return n >= (positive ? 1 : 0) && n <= 1000000 ? n : null;
  }
  function budgetResult(age = state.age) {
    const b = state.levels[age].budget;
    const values = Object.fromEntries(budgetKeys.map(name => [name, storedNumber(b[name], name === 'income')]));
    if (Object.values(values).some(n => n === null)) return { valid: false, message: 'Заполни все поля целыми числами от 0 до 1 000 000. Поступления должны быть больше нуля.' };
    const sum = values.needs + values.fun + values.save + values.reserve;
    const balance = values.income - sum;
    const task = groups[age].budget;
    let message = '';
    if (values.income !== task.income) message = `Для проверки верни поступления из условия: ${format(task.income)}.`;
    else if (balance < 0) message = `Не хватает ${format(-balance)}. Уменьши назначения денег, не убирая условия задания.`;
    else if (values.needs < task.minNeeds) message = `В этой задаче на нужное требуется не меньше ${format(task.minNeeds)}.`;
    else if (values.save < task.minSave) message = `По условию на цель нужно назначить не меньше ${format(task.minSave)}.`;
    else if (values.reserve < task.minReserve) message = `По условию в запасе должно быть не меньше ${format(task.minReserve)}.`;
    return { valid: true, values, sum, balance, passed: !message, message };
  }
  function goalResult(age = state.age) {
    const g = state.levels[age].goal;
    const target = storedNumber(g.target, true), saved = storedNumber(g.saved), contribution = storedNumber(g.contribution);
    if ([target, saved, contribution].some(n => n === null)) return { valid: false, message: 'Укажи целые числа от 0 до 1 000 000. Цена цели должна быть больше нуля.' };
    const remaining = Math.max(0, target - saved);
    const periods = remaining === 0 ? 0 : contribution === 0 ? null : Math.ceil(remaining / contribution);
    const prediction = storedNumber(g.prediction);
    return { valid: true, target, saved, contribution, remaining, periods, prediction, passed: periods !== null && prediction === periods };
  }
  for (const age of Object.keys(groups)) {
    state.levels[age].budgetDone &&= budgetResult(age).passed === true;
    state.levels[age].goalDone &&= goalResult(age).passed === true;
  }
  function storageStatus() {
    $('storage-status').textContent = !storageAvailable ? 'Сохранение недоступно. Прогресс работает до закрытия страницы; план можно скачать.' : storageRecovered ? 'Повреждённый прогресс восстановлен с начала. Новые ответы сохраняются в этом браузере.' : 'Прогресс сохраняется только в этом браузере.';
  }
  function persist() {
    if (storageAvailable) {
      try { localStorage.setItem(key, JSON.stringify({ version: 1, ...state })); }
      catch { storageAvailable = false; }
    }
    storageStatus();
  }
  function feedback(id, text, success) {
    const element = $(id);
    element.textContent = text;
    element.dataset.kind = success ? 'success' : 'error';
  }
  function periodsText(n) {
    const forms = group().period === 'неделя' ? ['неделя','недели','недель'] : ['месяц','месяца','месяцев'];
    const mod100 = n % 100, mod10 = n % 10;
    return `${format(n)} ${mod100 >= 11 && mod100 <= 14 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2]}`;
  }
  function renderNav() {
    const list = $('lesson-list');
    list.replaceChildren();
    group().lessons.forEach((lesson, index) => {
      const item = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.dataset.lesson = lesson.id;
      if (level().lesson === lesson.id) button.setAttribute('aria-current', 'step');
      const number = document.createElement('span'); number.className = 'lesson-number'; number.textContent = String(index + 1).padStart(2,'0');
      const label = document.createElement('span'); label.textContent = lesson.title;
      const status = document.createElement('span'); status.className = 'lesson-state'; status.textContent = level().answers[lesson.id] === lesson.answer ? '✓ Проверка пройдена' : 'Проверка впереди';
      label.append(status); button.append(number,label); item.append(button); list.append(item);
    });
  }
  function progress() {
    const completed = group().lessons.filter(lesson => level().answers[lesson.id] === lesson.answer).length;
    const practices = Number(level().budgetDone) + Number(level().goalDone);
    $('course-progress').value = completed + practices;
    $('progress-label').textContent = `Пройдено ${completed + practices} из 8 проверок · ${group().label}`;
    $('completion-status').textContent = completed === 6 && practices === 2 ? `Уровень ${group().label} пройден: 6 проверок уроков и 2 практики. Теперь объясни свой бюджет, срок цели и правило безопасности.` : `Проверки уроков: ${completed} из 6. Практика: ${practices} из 2. Для завершения уровня нужны все восемь; уроки можно открывать в любом порядке.`;
    renderNav();
  }
  function renderLesson(focus = false) {
    const lesson = currentLesson(), index = group().lessons.indexOf(lesson);
    $('lesson-counter').textContent = `УРОК ${index + 1} / 6 · ${group().label}`;
    $('lesson-title').textContent = lesson.title;
    $('lesson-duration').textContent = `${lesson.duration} с практикой · можно сделать паузу`;
    $('lesson-text').replaceChildren(...lesson.paragraphs.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
    $('lesson-example').textContent = lesson.example;
    $('lesson-action').textContent = lesson.action;
    $('quiz-question').textContent = lesson.question;
    const options = $('quiz-options'); options.replaceChildren();
    lesson.options.forEach((text,index) => {
      const label = document.createElement('label'); label.className = 'quiz-option';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'lesson-answer'; input.value = String(index);
      input.checked = level().answers[lesson.id] === index;
      const span = document.createElement('span'); span.textContent = text;
      label.append(input,span); options.append(label);
    });
    $('quiz-feedback').textContent = '';
    if (level().answers[lesson.id] === lesson.answer) feedback('quiz-feedback', 'Проверка пройдена. ' + lesson.feedback, true);
    $('lesson-prev').disabled = index === 0;
    $('lesson-next').disabled = index === 5;
    progress();
    if (focus) $('lesson-title').focus();
  }
  function renderBudget() {
    const result = budgetResult();
    if (!result.valid) {
      $('budget-balance').textContent = '—'; $('budget-live').textContent = result.message;
      $('budget-chart').setAttribute('aria-label', 'Распределение не рассчитано: проверь введённые числа.');
      for (const name of budgetKeys.slice(1)) $('segment-' + name).style.width = '0%';
      return;
    }
    $('budget-balance').textContent = format(result.balance);
    $('budget-live').textContent = result.balance < 0 ? `Нехватка: ${format(-result.balance)}. Назначено больше, чем поступило.` : result.balance === 0 ? 'Все монеты распределены. Проверь также условия учебной задачи.' : `Ещё не назначено: ${format(result.balance)}. Эту часть можно оставить свободной.`;
    const denominator = Math.max(result.values.income, result.sum, 1);
    for (const name of budgetKeys.slice(1)) $('segment-' + name).style.width = `${result.values[name] / denominator * 100}%`;
    $('budget-chart').setAttribute('aria-label', `Нужное: ${format(result.values.needs)}; радости: ${format(result.values.fun)}; цель: ${format(result.values.save)}; запас: ${format(result.values.reserve)}; свободный остаток: ${format(result.balance)}.`);
  }
  function renderGoal() {
    const result = goalResult();
    if (!result.valid) { $('goal-progress').value = 0; $('goal-label').textContent = 'Проверь числа'; $('goal-live').textContent = result.message; return; }
    $('goal-progress').value = Math.min(100, result.saved / result.target * 100);
    $('goal-label').textContent = `Собрано ${format(result.saved)} из ${format(result.target)}`;
    $('goal-live').textContent = result.remaining === 0 ? 'Цель уже достигнута. Новых взносов не требуется.' : `Осталось собрать ${format(result.remaining)}. ` + (result.contribution === 0 ? 'При нулевом взносе срок достижения пока не определён.' : 'Предположи срок и проверь его ниже.');
  }
  function route() {
    const params = new URL(location.href).searchParams;
    const age = params.get('age');
    if (validAge(age)) state.age = age;
    const id = params.get('lesson');
    if (validLesson(state.age, id)) level().lesson = id;
  }
  function syncUrl() {
    const url = new URL(location.href);
    url.searchParams.set('age', state.age); url.searchParams.set('lesson', level().lesson);
    try { if (url.href !== location.href) history.pushState(null,'',url); } catch { /* file:// browsers can restrict History; lessons still work. */ }
  }
  function renderAll() {
    $('course-app').hidden = false;
    document.querySelectorAll('[data-age]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.age === state.age)));
    $('age-description').textContent = group().intro;
    $('age-outcome').textContent = 'После курса: ' + group().outcome;
    document.querySelectorAll('[data-period]').forEach(span => span.textContent = group().period === 'неделя' ? 'неделю' : 'месяц');
    document.querySelectorAll('[data-periods]').forEach(span => span.textContent = group().periods);
    const b = group().budget;
    $('budget-task').textContent = `Условия задания: ${format(b.income)} за ${group().period === 'неделя' ? 'неделю' : 'месяц'}. На нужное — не меньше ${format(b.minNeeds)}, на цель — не меньше ${format(b.minSave)}, в запас — не меньше ${format(b.minReserve)}. Не допускай нехватки.`;
    $('contribution-label').textContent = group().contributionLabel;
    for (const name of budgetKeys) $('budget-' + name).value = level().budget[name];
    for (const name of goalKeys) $('goal-' + name).value = level().goal[name];
    $('budget-feedback').textContent = ''; $('goal-feedback').textContent = '';
    if (level().budgetDone) feedback('budget-feedback', 'Практика бюджета пройдена. Все условия выполнены.', true);
    if (level().goalDone) feedback('goal-feedback', `Практика накоплений пройдена. Срок: ${periodsText(goalResult().periods)}.`, true);
    $('reset-panel').hidden = true; $('reset-progress').setAttribute('aria-expanded','false');
    renderBudget(); renderGoal(); renderLesson(); storageStatus();
  }
  document.querySelectorAll('[data-age]').forEach(button => button.addEventListener('click', () => {
    if (!validAge(button.dataset.age)) return;
    state.age = button.dataset.age; renderAll(); syncUrl(); persist();
  }));
  function navigate(id, focus = true) {
    if (!validLesson(state.age,id)) return;
    level().lesson = id; renderLesson(focus); syncUrl(); persist();
  }
  $('lesson-list').addEventListener('click', event => {
    const button = event.target.closest('[data-lesson]');
    if (button) navigate(button.dataset.lesson);
  });
  $('lesson-prev').addEventListener('click', () => navigate(group().lessons[group().lessons.indexOf(currentLesson()) - 1]?.id));
  $('lesson-next').addEventListener('click', () => navigate(group().lessons[group().lessons.indexOf(currentLesson()) + 1]?.id));
  $('quiz-form').addEventListener('change', () => { delete level().answers[currentLesson().id]; $('quiz-feedback').textContent = ''; progress(); persist(); });
  $('quiz-form').addEventListener('submit', event => {
    event.preventDefault();
    const selected = document.querySelector('input[name="lesson-answer"]:checked'), lesson = currentLesson();
    if (!selected) { feedback('quiz-feedback','Выбери один ответ, затем проверь его.',false); return; }
    const correct = Number(selected.value) === lesson.answer;
    if (correct) level().answers[lesson.id] = lesson.answer;
    else delete level().answers[lesson.id];
    feedback('quiz-feedback',(correct ? 'Верно. ' : 'Пока неверно. Разберём: ') + lesson.feedback, correct);
    progress(); persist();
  });
  for (const name of budgetKeys) $('budget-' + name).addEventListener('input', event => {
    level().budget[name] = event.target.value; level().budgetDone = false; $('budget-feedback').textContent = ''; renderBudget(); progress(); persist();
  });
  for (const name of goalKeys) $('goal-' + name).addEventListener('input', event => {
    level().goal[name] = event.target.value; level().goalDone = false; $('goal-feedback').textContent = ''; renderGoal(); progress(); persist();
  });
  $('budget-check').addEventListener('click', () => {
    const result = budgetResult(); level().budgetDone = result.passed === true;
    feedback('budget-feedback', result.passed ? `Бюджет проверен. Все условия выполнены, свободный остаток ${format(result.balance)}.` : result.message, result.passed);
    progress(); persist();
  });
  $('goal-check').addEventListener('click', () => {
    const result = goalResult(); level().goalDone = result.passed === true;
    let message = result.message;
    if (result.valid) {
      if (result.periods === null) message = 'При нулевом взносе и недостающей сумме конечного срока нет. Укажи положительный взнос, чтобы рассчитать срок.';
      else if (result.prediction === null) message = 'Впиши прогноз целым числом от 0 до 1 000 000.';
      else message = (result.passed ? 'Верно. ' : 'Пока не совпало. ') + `Срок: ${periodsText(result.periods)}. ` + (result.periods === 0 ? 'Цель уже достигнута.' : `${format(result.remaining)} / ${format(result.contribution)} с округлением вверх.`);
    }
    feedback('goal-feedback',message,result.passed); progress(); persist();
  });
  function closeReset() { $('reset-panel').hidden = true; $('reset-progress').setAttribute('aria-expanded','false'); $('reset-progress').focus(); }
  $('reset-progress').addEventListener('click', () => { const show = $('reset-panel').hidden; $('reset-panel').hidden = !show; $('reset-progress').setAttribute('aria-expanded',String(show)); if (show) $('reset-cancel').focus(); });
  $('reset-cancel').addEventListener('click',closeReset);
  $('reset-confirm').addEventListener('click', () => { state.levels[state.age] = fresh(state.age); renderAll(); syncUrl(); persist(); $('reset-progress').focus(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('reset-panel').hidden) { event.preventDefault(); closeReset(); } });
  $('export-plan').addEventListener('click', () => {
    const b = budgetResult(), g = goalResult();
    const text = [
      'AI PATH — мой учебный финансовый план', `Уровень: ${group().label}`, 'Все суммы вымышленные, в условных единицах.', `Период бюджета: ${group().period}`,
      ...budgetKeys.map(name => `${({income:'Поступления',needs:'Нужное',fun:'Радости',save:'На цель',reserve:'Запас'})[name]}: ${level().budget[name] || 'не указано'}`),
      `Остаток: ${b.valid ? format(b.balance) : 'не рассчитан: проверь поля'}`, `Практика бюджета: ${level().budgetDone ? 'пройдена' : 'не пройдена'}`,
      '', `Цена цели: ${level().goal.target || 'не указана'}`, `Накоплено: ${level().goal.saved || 'не указано'}`, `Взнос за период: ${level().goal.contribution || 'не указан'}`,
      `Срок: ${!g.valid ? 'не рассчитан: проверь поля' : g.periods === null ? 'не определён при нулевом взносе' : periodsText(g.periods)}`, `Практика накоплений: ${level().goalDone ? 'пройдена' : 'не пройдена'}`,
      '', 'Проверки уроков:', ...group().lessons.map((lesson,i) => `${i+1}. ${lesson.title}: ${level().answers[lesson.id] === lesson.answer ? 'пройдена' : 'не пройдена'}`),
      '', 'Допущения: цена и регулярные взносы не меняются, доходность и комиссии не учитываются. При изменении условий нужен пересчёт.',
      'Безопасность: не передавать пароли, коды и доступ к карте; остановиться, проверить просьбу независимо и обсудить со взрослым.',
      'Курс: https://safal207.github.io/test-it-python/ai-path/finance.html'
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = `ai-path-finance-${state.age}.txt`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    $('export-status').textContent = 'Учебный план подготовлен для скачивания. Проверь загрузки браузера.';
  });
  window.addEventListener('popstate', () => { route(); renderAll(); persist(); });
  route(); renderAll();
})();
