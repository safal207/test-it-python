(() => {
  'use strict';
  const root = document.getElementById('cosmos-mission');
  if (!root) return;
  const $ = id => document.getElementById(id);
  // The clues use only the facts already present in the atlas, with the same sources.
  const signals = [
    { planet: 'mars', name: 'Марс', clue: 'Я — каменистый мир красноватого цвета. Со мной путешествуют Фобос и Деймос.', explanation: 'Марс — каменистая планета; Фобос и Деймос — его два спутника.', source: 'https://science.nasa.gov/mars/facts/' },
    { planet: 'jupiter', name: 'Юпитер', clue: 'Я — самая большая планета Солнечной системы. Моё Большое красное пятно — гигантский шторм.', explanation: 'Большое красное пятно находится в атмосфере Юпитера, самой большой планеты Солнечной системы.', source: 'https://science.nasa.gov/jupiter/jupiter-facts/' },
    { planet: 'neptune', name: 'Нептун', clue: 'Я — восьмая планета от Солнца. Один мой год длится примерно 165 земных лет.', explanation: 'Нептун — восьмая планета; один оборот вокруг Солнца занимает около 165 земных лет.', source: 'https://science.nasa.gov/neptune/neptune-facts/' },
    { planet: 'saturn', name: 'Сатурн', clue: 'Мои кольца состоят из льда и камня. Один мой год длится примерно 29,4 земного года.', explanation: 'Кольца Сатурна состоят из частиц льда и камня; год длится около 29,4 земного года.', source: 'https://science.nasa.gov/saturn/facts/' }
  ];
  let index = 0, answer = null, attempts = 0;
  const discoveries = [];
  const answers = [...root.querySelectorAll('[data-mission-answer]')];
  function solved() { return discoveries.length > index; }
  function choose(planet) {
    if (solved()) return;
    answer = planet;
    answers.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.missionAnswer === answer)));
    $('mission-check').disabled = false;
    $('mission-feedback').textContent = 'Планета выбрана. Проверь, подходит ли она к подсказке.';
  }
  function renderTask() {
    answer = null; attempts = 0;
    $('mission-number').textContent = `Сигнал ${index + 1} из ${signals.length}`;
    $('mission-clue').textContent = signals[index].clue;
    answers.forEach(button => { button.disabled = false; button.setAttribute('aria-pressed', 'false'); });
    $('mission-check').disabled = true;
    $('mission-check').hidden = false;
    $('mission-next').hidden = true;
    $('mission-feedback').textContent = 'Сначала выбери планету. Атласом выше можно пользоваться.';
  }
  function renderJournal() {
    $('mission-progress').value = discoveries.length;
    $('mission-progress').textContent = `${discoveries.length} из ${signals.length}`;
    $('mission-progress-label').textContent = `Разгадано ${discoveries.length} из ${signals.length} сигналов`;
    $('journal-empty').hidden = discoveries.length > 0;
    $('mission-export').disabled = discoveries.length === 0;
    $('mission-log').replaceChildren(...discoveries.map(entry => {
      const item = document.createElement('li');
      const title = document.createElement('strong'); title.textContent = entry.name;
      const detail = document.createElement('p'); detail.textContent = `${entry.explanation} Проверок ответа: ${entry.attempts}.`;
      const source = document.createElement('a'); source.href = entry.source; source.textContent = 'Проверить факт в NASA Science ↗';
      item.append(title, detail, source); return item;
    }));
  }
  answers.forEach(button => button.addEventListener('click', () => {
    if (solved()) return;
    document.querySelector(`#planet-picker [data-planet="${button.dataset.missionAnswer}"]`).click();
  }));
  document.querySelectorAll('#planet-picker [data-planet]').forEach(button => button.addEventListener('click', () => choose(button.dataset.planet)));
  $('mission-check').addEventListener('click', () => {
    if (!answer || solved()) return;
    attempts += 1;
    const signal = signals[index];
    if (answer !== signal.planet) {
      $('mission-feedback').textContent = 'Пока не совпало. Сравни описание выбранной планеты в атласе с подсказкой и попробуй другой вариант.';
      return;
    }
    discoveries.push({ ...signal, attempts });
    renderJournal();
    answers.forEach(button => { button.disabled = true; });
    $('mission-check').hidden = true;
    const complete = discoveries.length === signals.length;
    $('mission-next').hidden = complete;
    $('mission-feedback').textContent = `${signal.name} — верно! ${signal.explanation}${complete ? ' Все четыре сигнала разгаданы. Твой журнал готов к скачиванию.' : ' Открытие записано в журнал.'}`;
    // The check control disappears; keep keyboard focus on a usable next action.
    $(complete ? 'mission-export' : 'mission-next').focus({ preventScroll: true });
  });
  $('mission-next').addEventListener('click', () => {
    if (!solved() || index >= signals.length - 1) return;
    index += 1; renderTask(); answers[0].focus({ preventScroll: true });
  });
  $('mission-reset').addEventListener('click', () => {
    index = 0; discoveries.length = 0; renderTask(); renderJournal();
    answers[0].focus({ preventScroll: true });
  });
  $('mission-export').addEventListener('click', () => {
    if (!discoveries.length) return;
    const report = ['Мой Космос — журнал экспедиции AI PATH', `Разгадано ${discoveries.length} из ${signals.length} сигналов.`, 'Учебный журнал ответов этой попытки.', '', ...discoveries.flatMap((entry, number) => [
      `${number + 1}. ${entry.name}`, `Подсказка: ${entry.clue}`, entry.explanation, `Проверок ответа: ${entry.attempts}`, `Источник: ${entry.source}`, ''
    ])].join('\n');
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'my-cosmos-expedition.txt';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('mission-feedback').textContent = `Подготовлен журнал: ${discoveries.length} из ${signals.length} сигналов. Файл содержит ответы и ссылки на источники.`;
  });
  renderTask(); renderJournal(); root.hidden = false;
})();
