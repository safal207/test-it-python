/* An explicit-save research notebook. No network requests or AI integration. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const storageKey = 'ai-path-career-research-v1';
  const contextFields = ['researchTime', 'researchLocation', 'researchExperience', 'chosenDirection', 'decisionReasons', 'next30Days'];
  const directionFields = ['direction', 'trial', 'trialResult', 'interest', 'readiness'];
  const recordFields = ['Title', 'Url', 'Date', 'Published', 'Direction', 'Salary', 'Currency', 'Period', 'Tax', 'Skills', 'Quote', 'Inference'];
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const empty = () => ({ version: 1, context: {}, directions: [1, 2, 3].map(id => ({ id: String(id) })), vacancies: [] });
  let state = empty(), editing = null;
  const status = message => { $('workspaceStatus').textContent = message; };
  const text = (value, limit = 2200) => typeof value === 'string' ? value.slice(0, limit) : '';
  function sourceUrl(value) {
    try {
      const url = new URL(value.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
      url.hash = '';
      const hhVacancy = /^\/vacancy\/(\d+)\/?$/.exec(url.pathname);
      if (hhVacancy && (url.hostname === 'hh.ru' || url.hostname.endsWith('.hh.ru'))) {
        url.protocol = 'https:'; url.hostname = 'hh.ru'; url.port = ''; url.pathname = '/vacancy/' + hhVacancy[1]; url.search = '';
      }
      [...url.searchParams.keys()].forEach(key => { if (/^utm_/i.test(key) || /^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key); });
      url.searchParams.sort();
      return url.href;
    } catch (_) { return null; }
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function recordError(record) {
    if (!record.title.trim() || !record.skills.trim() || !record.quote.trim() || !['1', '2', '3'].includes(record.direction)) return 'Заполни название, направление, требования и короткий фрагмент источника.';
    if (!sourceUrl(record.url)) return 'Нужна ссылка http:// или https:// без логина и пароля в адресе.';
    if (!validDate(record.date) || record.date > today) return 'Укажи дату проверки источника, не позднее сегодняшнего дня.';
    if (record.published && (!validDate(record.published) || record.published > record.date)) return 'Дата публикации не может быть позднее даты проверки.';
    return '';
  }
  function collectPlan() {
    contextFields.forEach(id => { state.context[id] = $(id).value.trim(); });
    state.directions.forEach(direction => directionFields.forEach(field => { direction[field] = $(field + direction.id).value.trim(); }));
  }
  function fillPlan() {
    contextFields.forEach(id => { $(id).value = state.context[id] || ''; });
    state.directions.forEach(direction => directionFields.forEach(field => { $(field + direction.id).value = direction[field] || ''; }));
  }
  function node(tag, content, className) {
    const item = document.createElement(tag);
    if (content !== undefined) item.textContent = content;
    if (className) item.className = className;
    return item;
  }
  const name = id => state.directions.find(direction => direction.id === id)?.direction || 'Направление ' + id;
  const age = value => validDate(value) ? Math.floor((Date.parse(today) - Date.parse(value)) / 86400000) : null;
  function summary() {
    const groups = state.directions.map(direction => {
      const records = state.vacancies.filter(record => record.direction === direction.id), skills = new Map();
      records.forEach(record => new Set(record.skills.toLocaleLowerCase('ru').split(/[,;\n]+/).map(skill => skill.trim()).filter(Boolean)).forEach(skill => skills.set(skill, (skills.get(skill) || 0) + 1)));
      return { id: direction.id, name: name(direction.id), count: records.length, skills: [...skills].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru')).slice(0, 7) };
    });
    const gaps = [];
    const names = state.directions.map(direction => (direction.direction || '').toLocaleLowerCase('ru')).filter(Boolean);
    if (new Set(names).size < names.length) gaps.push('Названия направлений повторяются. Уточни три разные гипотезы для сравнения.');
    if (state.vacancies.length < 15) gaps.push('До минимальной выборки из 15 уникальных вакансий осталось: ' + (15 - state.vacancies.length) + '.');
    state.directions.forEach((direction, index) => {
      if (!direction.direction) gaps.push('Дай название направлению ' + direction.id + '.');
      if (groups[index].count < 5) gaps.push(name(direction.id) + ': нужно ещё ' + (5 - groups[index].count) + ' вакансий до пяти.');
      if (!direction.trial || !direction.trialResult) gaps.push(name(direction.id) + ': запиши пробную задачу и результат.');
      if (!direction.interest || !direction.readiness) gaps.push(name(direction.id) + ': оцени интерес и готовность после пробы.');
    });
    const unknown = state.vacancies.filter(record => !record.published).length;
    const older = state.vacancies.filter(record => record.published && age(record.published) > 30).length;
    const stale = state.vacancies.filter(record => age(record.date) > 30).length;
    if (unknown) gaps.push('У ' + unknown + ' вакансий нет даты публикации: свежесть не подтверждена.');
    if (older) gaps.push('Публикаций старше 30 дней: ' + older + '. Найди более свежие или объясни ограничение.');
    if (stale) gaps.push('Проверок старше 30 дней: ' + stale + '. Открой источники повторно.');
    if (contextFields.slice(0, 3).some(field => !state.context[field])) gaps.push('Запиши доступное время, географию и текущий опыт.');
    if (!state.context.chosenDirection || !state.context.decisionReasons) gaps.push('Сформулируй предварительный выбор и аргументы; можно сначала собрать недостающие данные.');
    if (!state.context.next30Days) gaps.push('Добавь план на 30 дней с результатами по неделям.');
    return { totalUnique: state.vacancies.length, groups, gaps };
  }
  function renderSummary() {
    const result = summary();
    $('researchSummary').replaceChildren(...result.groups.map(group => {
      const card = node('div', undefined, 'summary-card');
      card.append(node('strong', group.name), node('p', 'Уникальных вакансий: ' + group.count), node('p', group.skills.length ? 'Требования в этой выборке: ' + group.skills.map(([skill, count]) => skill + ' — ' + count + '/' + group.count).join('; ') : 'Требования появятся после добавления источников.'));
      return card;
    }));
    $('researchGaps').replaceChildren(...(result.gaps.length ? result.gaps : ['Поля заполнены. Проверь качество источников, ограничения выборки и аргументы с наставником.']).map(gap => node('li', gap)));
  }
  const periods = { unknown: 'период не указан', month: 'в месяц', year: 'в год', hour: 'в час' };
  const taxes = { unknown: 'налоги не уточнены', gross: 'до налогов (gross)', net: 'после налогов (net)' };
  const salary = record => record.salary ? [record.salary, record.currency || 'валюта не указана', periods[record.period] || periods.unknown, taxes[record.tax] || taxes.unknown].join(' · ') : 'Не указана';
  function renderRecords() {
    const records = state.vacancies.filter(record => $('directionFilter').value === 'all' || record.direction === $('directionFilter').value);
    $('vacancyList').replaceChildren(...records.map(record => {
      const card = node('article', undefined, 'vacancy-record'); card.dataset.vacancyId = record.id;
      const source = node('a', record.url); source.href = record.url; source.target = '_blank'; source.rel = 'noopener noreferrer';
      card.append(node('h4', record.title), node('p', name(record.direction) + ' · проверено ' + record.date + ' · публикация: ' + (record.published || 'не указана'), 'record-meta'), source, node('p', 'Требования из источника: ' + record.skills), node('blockquote', record.quote));
      if (record.inference) card.append(node('p', 'Моя интерпретация: ' + record.inference));
      card.append(node('p', 'Зарплата в источнике: ' + salary(record)));
      const actions = node('div', undefined, 'actions');
      ['Изменить', 'Удалить'].forEach((label, index) => { const button = node('button', label, 'button'); button.type = 'button'; button.dataset[index ? 'removeVacancy' : 'editVacancy'] = record.id; button.setAttribute('aria-label', label + ' вакансию: ' + record.title); actions.append(button); });
      card.append(actions); return card;
    }));
    if (!records.length) $('vacancyList').append(node('p', state.vacancies.length ? 'В этом направлении пока нет записей.' : 'Пока нет вакансий. Добавь первый прочитанный источник в форме выше.', 'hint'));
  }
  function render() {
    collectPlan();
    ['vacancyDirection', 'directionFilter', 'chosenDirection'].forEach(id => [...$(id).options].forEach(option => { if (['1', '2', '3'].includes(option.value)) option.textContent = name(option.value); }));
    renderSummary(); renderRecords();
  }
  function resetRecordForm() {
    editing = null; $('vacancyForm').reset(); $('vacancyDate').value = today; $('vacancyError').textContent = ''; $('addVacancy').textContent = 'Добавить вакансию'; $('cancelEdit').hidden = true;
  }
  function markChanged() { status('Есть несохранённые изменения. Нажми «Сохранить на этом устройстве» или скачай отчёт.'); }
  $('vacancyDate').max = today; $('vacancyPublished').max = today;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.directions) || !Array.isArray(data.vacancies)) throw new Error('format');
      contextFields.forEach(id => { state.context[id] = text(data.context?.[id]); });
      state.directions.forEach((direction, index) => directionFields.forEach(field => { direction[field] = text(data.directions[index]?.[field]); }));
      const seen = new Set();
      for (const entry of data.vacancies.slice(0, 500)) {
        const record = { id: String(state.vacancies.length + 1) };
        recordFields.forEach(field => { const key = field.toLowerCase(); record[key] = text(entry[key]); });
        if (recordError(record)) throw new Error('record');
        record.url = sourceUrl(record.url);
        if (!seen.has(record.url)) { state.vacancies.push(record); seen.add(record.url); }
      }
      status('Сохранённая тетрадь восстановлена из этого браузера.');
    }
  } catch (_) { state = empty(); status('Сохранённую тетрадь не удалось прочитать. Можно начать заново; старые данные не перезаписаны.'); }
  fillPlan(); resetRecordForm(); render();
  $('directionForm').addEventListener('submit', event => event.preventDefault());
  $('directionForm').addEventListener('input', () => { render(); markChanged(); });
  $('directionForm').addEventListener('change', () => { render(); markChanged(); });
  $('directionFilter').addEventListener('change', renderRecords);
  $('vacancyForm').addEventListener('submit', event => {
    event.preventDefault(); collectPlan();
    const record = { id: editing || 'v' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) };
    recordFields.forEach(field => { record[field.toLowerCase()] = $('vacancy' + field).value.trim(); });
    let error = recordError(record); record.url = sourceUrl(record.url);
    if (!error && state.vacancies.some(item => item.url === record.url && item.id !== editing)) error = 'Эта ссылка уже есть в тетради. Измени существующую запись вместо дубликата.';
    if (error) { $('vacancyError').textContent = error; return; }
    if (editing) state.vacancies = state.vacancies.map(item => item.id === editing ? record : item); else state.vacancies.push(record);
    resetRecordForm(); render(); markChanged(); $('vacancyTitle').focus();
  });
  $('cancelEdit').addEventListener('click', resetRecordForm);
  $('vacancyList').addEventListener('click', event => {
    const button = event.target.closest('button[data-edit-vacancy],button[data-remove-vacancy]'); if (!button) return;
    if (button.dataset.editVacancy) {
      const record = state.vacancies.find(item => item.id === button.dataset.editVacancy); editing = record.id;
      recordFields.forEach(field => { $('vacancy' + field).value = record[field.toLowerCase()] || ''; });
      $('addVacancy').textContent = 'Сохранить изменения вакансии'; $('cancelEdit').hidden = false; $('vacancyError').textContent = ''; $('vacancyTitle').focus();
    } else {
      state.vacancies = state.vacancies.filter(item => item.id !== button.dataset.removeVacancy);
      if (editing === button.dataset.removeVacancy) resetRecordForm(); render(); markChanged(); $('directionFilter').focus();
    }
  });
  $('saveResearch').addEventListener('click', () => {
    collectPlan();
    try { localStorage.setItem(storageKey, JSON.stringify(state)); status('Тетрадь сохранена на этом устройстве. После следующих изменений сохрани снова.'); }
    catch (_) { status('Браузер не разрешил сохранение. Скачай JSON или Markdown, чтобы не потерять работу.'); }
  });
  function report() { collectPlan(); return { ...state, exportedAt: new Date().toISOString(), summary: summary(), note: 'Введённые пользователем источники. Содержимое URL автоматически не проверялось. Частоты относятся только к этой выборке; interpretation/inference не являются фактами источника.' }; }
  function download(content, type, extension) {
    const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement('a');
    link.href = url; link.download = 'ai-path-research-' + today + '.' + extension; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('Отчёт подготовлен к скачиванию. Сохранение в браузере выполняется отдельной кнопкой.');
  }
  const md = value => String(value || 'Не заполнено').replace(/[\\`*_[\]<>#|]/g, '\\$&');
  $('exportResearchJson').addEventListener('click', () => download(JSON.stringify(report(), null, 2), 'application/json;charset=utf-8', 'json'));
  $('exportResearchMarkdown').addEventListener('click', () => {
    const data = report(), lines = ['# Исследование направлений', '', 'Экспорт: ' + data.exportedAt, '', data.note, '', '## Ограничения', 'Время: ' + md(data.context.researchTime), 'География: ' + md(data.context.researchLocation), 'Опыт: ' + md(data.context.researchExperience)];
    data.directions.forEach(direction => { const group = data.summary.groups.find(item => item.id === direction.id); lines.push('', '## ' + md(name(direction.id)), 'Уникальных вакансий: ' + group.count, 'Требования в выборке: ' + md(group.skills.map(([skill, count]) => skill + ' — ' + count + '/' + group.count).join('; ')), 'Проба: ' + md(direction.trial), 'Результат: ' + md(direction.trialResult), 'Интерес: ' + md(direction.interest) + '/5; готовность: ' + md(direction.readiness) + '/5'); });
    lines.push('', '## Источники');
    data.vacancies.forEach(record => lines.push('', '### ' + md(record.title), 'Направление: ' + md(name(record.direction)), 'URL: ' + md(record.url), 'Проверено: ' + record.date + '; публикация: ' + (record.published || 'не указана'), 'Требования: ' + md(record.skills), 'Фрагмент источника: ' + md(record.quote), 'Моя интерпретация: ' + md(record.inference), 'Зарплата в источнике: ' + md(salary(record))));
    lines.push('', '## Решение и следующий месяц', 'Выбор: ' + (data.context.chosenDirection ? md(name(data.context.chosenDirection)) : 'Пока не выбран'), 'Аргументы: ' + md(data.context.decisionReasons), 'План на 30 дней: ' + md(data.context.next30Days), '', '## Что проверить', ...data.summary.gaps.map(gap => '- [ ] ' + md(gap)));
    if (!data.summary.gaps.length) lines.push('- [ ] Проверить качество источников и выводы с наставником.');
    download(lines.join('\n\n'), 'text/markdown;charset=utf-8', 'md');
  });
  $('clearResearch').addEventListener('click', () => { $('clearConfirmation').hidden = false; $('confirmClear').focus(); });
  $('cancelClear').addEventListener('click', () => { $('clearConfirmation').hidden = true; $('clearResearch').focus(); });
  $('confirmClear').addEventListener('click', () => {
    try { localStorage.removeItem(storageKey); }
    catch (_) { status('Браузер не разрешил удалить сохранённую копию. Данные на странице оставлены, чтобы ты мог скачать отчёт.'); return; }
    state = empty(); fillPlan(); resetRecordForm(); $('directionFilter').value = 'all'; render(); $('clearConfirmation').hidden = true; status('Тетрадь и сохранённая копия очищены.'); $('clearResearch').focus();
  });
  document.querySelectorAll('[data-copy-prompt]').forEach(button => button.addEventListener('click', async () => {
    const area = $(button.dataset.copyPrompt);
    try { if (!navigator.clipboard?.writeText) throw new Error('clipboard'); await navigator.clipboard.writeText(area.value); $('copyStatus').textContent = 'Запрос скопирован. Добавь свои данные и проверь ответ по источникам.'; }
    catch (_) { area.closest('details').open = true; area.focus(); area.select(); $('copyStatus').textContent = 'Автокопирование недоступно. Текст выделен: скопируй его вручную.'; }
  }));
})();
