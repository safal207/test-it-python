/* A self-contained, local introductory activity. It does not send or store child data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const board = $('game-board');
  const maps = {
    garden: { name: 'Звёздный сад', stars: [[0, 2], [2, 2], [4, 0]], walls: new Set(['1,3', '3,1']) },
    detour: { name: 'Тайный проход', stars: [[4, 4], [0, 0], [4, 0]], walls: new Set(['1,4', '1,3', '1,2', '3,0', '3,1', '3,2']) }
  };
  const avatars = { robot: '🤖', cat: '🐱' };
  const labels = { robot: 'робот', cat: 'кот' };
  const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const keyboard = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  const parameters = new URLSearchParams(location.search);
  const initialMap = Object.hasOwn(maps, parameters.get('board')) ? parameters.get('board') : 'garden';
  const initialGoal = parameters.get('stars') === '3' ? 3 : 2;
  const initialAvatar = parameters.get('hero') === 'cat' ? 'cat' : 'robot';
  let state = { x: 0, y: 4, map: initialMap, goal: initialGoal, avatar: initialAvatar, collected: new Set(), moves: 0, blocked: 0, history: [], finished: false, choseRule: false };
  const bestRuns = new Map();
  const currentMap = () => maps[state.map];
  const configurationKey = () => `${state.map}:${state.goal}`;
  // Breadth-first search checks the actual grid and collected-star state. No guessed target score.
  function shortestRoute(map, goal) {
    const pending = [{ x: 0, y: 4, mask: 0, distance: 0 }], seen = new Set(['0,4,0']);
    for (let head = 0; head < pending.length; head++) {
      const point = pending[head];
      if (point.mask.toString(2).replaceAll('0', '').length >= goal) return point.distance;
      for (const [dx, dy] of Object.values(directions)) {
        const x = point.x + dx, y = point.y + dy;
        if (x < 0 || x > 4 || y < 0 || y > 4 || map.walls.has(`${x},${y}`)) continue;
        const star = map.stars.findIndex(([sx, sy]) => sx === x && sy === y);
        const mask = star < 0 ? point.mask : point.mask | (1 << star);
        const key = `${x},${y},${mask}`;
        if (seen.has(key)) continue;
        seen.add(key); pending.push({ x, y, mask, distance: point.distance + 1 });
      }
    }
    return null;
  }
  const optimum = () => shortestRoute(currentMap(), state.goal);
  const extraReport = () => `Карта: ${currentMap().name}. Неудачных попыток пройти край или блок: ${state.blocked}. Кратчайший путь для этой цели: ${optimum()} ходов.`;
  const goalDescription = () => `${state.goal} звезды`;
  const collectedDescription = () => `${state.collected.size} из ${state.goal}`;
  function report() {
    if (!state.moves) return `Цель игры: ${goalDescription()}. Герой пока не двигался. ${extraReport()}`;
    const result = state.finished ? 'Цель достигнута.' : 'Игра ещё продолжается.';
    const rule = state.choseRule ? 'Правило выбрано участником.' : 'Использовано правило по умолчанию.';
    return `Цель игры: ${goalDescription()}. Герой: ${labels[state.avatar]}. Сделано ходов: ${state.moves}. Собрано звёзд: ${collectedDescription()}. ${result} ${rule} ${extraReport()}`;
  }
  function render() {
    const { stars, walls } = currentMap();
    const fragment = document.createDocumentFragment();
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const key = `${x},${y}`;
      const cell = document.createElement('span');
      cell.className = 'game-cell';
      cell.setAttribute('aria-hidden', 'true');
      if (walls.has(key)) cell.classList.add('wall');
      if (stars.some(([sx, sy]) => sx === x && sy === y) && !state.collected.has(key)) {
        cell.classList.add('star'); cell.textContent = '✦';
      }
      if (state.x === x && state.y === y) { cell.classList.add('hero'); cell.textContent = avatars[state.avatar]; }
      fragment.append(cell);
    }
    board.replaceChildren(fragment);
    const remaining = stars.filter(([sx, sy]) => !state.collected.has(`${sx},${sy}`)).map(([sx, sy]) => `строка ${sy + 1}, столбец ${sx + 1}`).join('; ');
    const obstacles = [...walls].map(key => { const [x, y] = key.split(',').map(Number); return `строка ${y + 1}, столбец ${x + 1}`; }).join('; ');
    board.setAttribute('aria-label', `Игровое поле: ${labels[state.avatar]}, строка ${state.y + 1}, столбец ${state.x + 1}. Собрано ${collectedDescription()} звёзд. Оставшиеся звёзды: ${remaining || 'нет'}. Препятствия: ${obstacles}. Используй стрелки клавиатуры или кнопки ниже.`);
    $('counter').textContent = `${state.collected.size} / ${state.goal} ✦`;
    $('goal-text').textContent = goalDescription();
    $('step-rule').dataset.complete = String(state.choseRule);
    $('step-move').dataset.complete = String(state.moves > 0);
    $('step-win').dataset.complete = String(state.finished);
    $('step-rule-status').textContent = state.choseRule ? ' — выбрана' : ' — по умолчанию';
    $('step-move-status').textContent = state.moves ? ' — выполнено' : ' — ещё не выполнено';
    $('step-win-status').textContent = state.finished ? ' — выполнено' : ' — ещё не выполнено';
    $('skill-rule').textContent = state.choseRule ? 'Выбрано' : 'Ещё не выбрано';
    $('skill-move').textContent = state.moves ? 'Попробовал' : 'Ещё не пробовал';
    $('skill-win').textContent = state.finished ? 'Цель достигнута' : 'Впереди';
    $('summary-text').textContent = report();
    $('move-count').textContent = String(state.moves);
    $('blocked-count').textContent = String(state.blocked);
    $('optimal-count').textContent = String(optimum());
    $('best-count').textContent = bestRuns.has(configurationKey()) ? String(bestRuns.get(configurationKey())) : 'Ещё нет';
    $('challenge-result').textContent = state.finished
      ? (state.moves === optimum() ? 'Ты нашёл кратчайший маршрут! Можно попробовать другую карту или цель.' : `Цель достигнута. Можно сократить путь на ${state.moves - optimum()} ходов — попробуй ещё раз.`)
      : 'Сначала собери звёзды. Затем попробуй добраться до них за меньшее число ходов.';
    $('export-run').disabled = state.history.length === 0;
    document.querySelectorAll('[data-board]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.board === state.map)));
    document.querySelectorAll('[data-goal]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.goal) === state.goal)));
    document.querySelectorAll('[data-avatar]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.avatar === state.avatar)));
    if (!$('copy-fallback').hidden) $('copy-fallback').value = report();
  }
  function reset({ goal = state.goal, map = state.map, choseRule = state.choseRule } = {}) {
    state = { x: 0, y: 4, map, goal, avatar: state.avatar, collected: new Set(), moves: 0, blocked: 0, history: [], finished: false, choseRule };
    $('game-status').textContent = `Поле готово. Собери ${goalDescription()}!`;
    $('copy-status').textContent = '';
    $('export-status').textContent = '';
    $('copy-fallback').hidden = true; $('copy-label').hidden = true;
    render();
  }
  function move(direction) {
    if (state.finished) { $('game-status').textContent = 'Цель достигнута! Начни заново или выбери другое правило.'; return; }
    const [dx, dy] = directions[direction];
    const { stars, walls } = currentMap();
    const x = state.x + dx, y = state.y + dy;
    if (x < 0 || x > 4 || y < 0 || y > 4 || walls.has(`${x},${y}`)) {
      state.blocked++;
      state.history.push({ direction, moved: false });
      $('game-status').textContent = 'Здесь край поля или препятствие. Попробуй другую стрелку.';
      render(); return;
    }
    state.history.push({ direction, moved: true });
    state.x = x; state.y = y; state.moves++;
    const key = `${x},${y}`;
    if (stars.some(([sx, sy]) => sx === x && sy === y) && !state.collected.has(key)) {
      state.collected.add(key);
      state.finished = state.collected.size >= state.goal;
      if (state.finished) bestRuns.set(configurationKey(), Math.min(bestRuns.get(configurationKey()) ?? Infinity, state.moves));
      $('game-status').textContent = state.finished
        ? `Получилось! Собрано ${goalDescription()}. Ты проверил правило игры.`
        : `Звезда найдена! Собрано ${collectedDescription()}.`;
    } else $('game-status').textContent = `Шаг ${state.moves}. Собрано ${collectedDescription()} звёзд.`;
    render();
  }
  document.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => move(button.dataset.move)));
  board.addEventListener('keydown', event => {
    const direction = keyboard[event.key];
    if (!direction) return;
    event.preventDefault(); move(direction);
  });
  document.querySelectorAll('[data-goal]').forEach(button => button.addEventListener('click', () => {
    const goal = Number(button.dataset.goal);
    if (goal !== state.goal) reset({ goal, choseRule: true });
    else { state.choseRule = true; $('game-status').textContent = `Правило выбрано: собери ${goalDescription()}.`; render(); }
  }));
  document.querySelectorAll('[data-avatar]').forEach(button => button.addEventListener('click', () => {
    state.avatar = button.dataset.avatar;
    $('game-status').textContent = `Теперь герой — ${labels[state.avatar]}.`;
    render();
  }));
  document.querySelectorAll('[data-board]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.board !== state.map) reset({ map: button.dataset.board, choseRule: true });
  }));
  $('reset-game').addEventListener('click', () => reset());
  $('export-run').addEventListener('click', () => {
    if (!state.history.length) return;
    const names = { up: 'вверх', down: 'вниз', left: 'влево', right: 'вправо' };
    const url = new URL(location.href);
    url.searchParams.set('board', state.map); url.searchParams.set('stars', String(state.goal)); url.searchParams.set('hero', state.avatar);
    url.hash = 'workspace';
    const text = ['AI PATH — мой игровой эксперимент', report(), '', 'Повторить карту с теми же правилами (прохождение начнётся заново):', url.href, '', 'Последовательность действий:', ...state.history.map((item, index) => `${index + 1}. ${names[item.direction]} — ${item.moved ? 'ход выполнен' : 'блок или край поля'}`), '', 'Локальный учебный результат; не оценка навыков наставником.'].join('\n');
    const downloadUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = downloadUrl; link.download = 'ai-path-game-experiment.txt';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    $('export-status').textContent = `Отчёт подготовлен: ${state.moves} ходов, ${state.blocked} неудачных попыток. В файле — последовательность действий и ссылка на эту карту.`;
  });
  $('copy-summary').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(report());
      $('copy-status').textContent = 'Скопировано. Можно показать родителю.';
      $('copy-fallback').hidden = true; $('copy-label').hidden = true;
    } catch {
      $('copy-fallback').value = report();
      $('copy-fallback').hidden = false; $('copy-label').hidden = false;
      $('copy-status').textContent = 'Выдели текст ниже и скопируй его.';
      $('copy-fallback').focus(); $('copy-fallback').select();
    }
  });
  $('game-status').textContent = `Герой готов. Собери ${goalDescription()}!`;
  render();
})();
