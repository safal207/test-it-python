/* A self-contained, local introductory activity. It does not send or store child data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const board = $('game-board');
  const stars = [[0, 2], [2, 2], [4, 0]];
  const walls = new Set(['1,3', '3,1']);
  const avatars = { robot: '🤖', cat: '🐱' };
  const labels = { robot: 'робот', cat: 'кот' };
  const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const keyboard = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  let state = { x: 0, y: 4, goal: 2, avatar: 'robot', collected: new Set(), moves: 0, finished: false, choseRule: false };
  const goalDescription = () => `${state.goal} звезды`;
  const collectedDescription = () => `${state.collected.size} из ${state.goal}`;
  function report() {
    if (!state.moves) return `Цель игры: ${goalDescription()}. Герой пока не двигался.`;
    const result = state.finished ? 'Цель достигнута.' : 'Игра ещё продолжается.';
    const rule = state.choseRule ? 'Правило выбрано участником.' : 'Использовано правило по умолчанию.';
    return `Цель игры: ${goalDescription()}. Герой: ${labels[state.avatar]}. Сделано ходов: ${state.moves}. Собрано звёзд: ${collectedDescription()}. ${result} ${rule}`;
  }
  function render() {
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
    board.setAttribute('aria-label', `Игровое поле: ${labels[state.avatar]}, строка ${state.y + 1}, столбец ${state.x + 1}. Собрано ${collectedDescription()} звёзд. Оставшиеся звёзды: ${remaining || 'нет'}. Препятствия: строка 4, столбец 2; строка 2, столбец 4. Используй стрелки клавиатуры или кнопки ниже.`);
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
    document.querySelectorAll('[data-goal]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.goal) === state.goal)));
    document.querySelectorAll('[data-avatar]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.avatar === state.avatar)));
    if (!$('copy-fallback').hidden) $('copy-fallback').value = report();
  }
  function reset({ goal = state.goal, choseRule = state.choseRule } = {}) {
    state = { x: 0, y: 4, goal, avatar: state.avatar, collected: new Set(), moves: 0, finished: false, choseRule };
    $('game-status').textContent = `Поле готово. Собери ${goalDescription()}!`;
    $('copy-status').textContent = '';
    $('copy-fallback').hidden = true; $('copy-label').hidden = true;
    render();
  }
  function move(direction) {
    if (state.finished) { $('game-status').textContent = 'Цель достигнута! Начни заново или выбери другое правило.'; return; }
    const [dx, dy] = directions[direction];
    const x = state.x + dx, y = state.y + dy;
    if (x < 0 || x > 4 || y < 0 || y > 4 || walls.has(`${x},${y}`)) {
      $('game-status').textContent = 'Здесь край поля или препятствие. Попробуй другую стрелку.'; return;
    }
    state.x = x; state.y = y; state.moves++;
    const key = `${x},${y}`;
    if (stars.some(([sx, sy]) => sx === x && sy === y) && !state.collected.has(key)) {
      state.collected.add(key);
      state.finished = state.collected.size >= state.goal;
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
  $('reset-game').addEventListener('click', () => reset());
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
  render();
})();
