/* A prepared teaching example: the first version contains an intentional bug. */
(function () {
  'use strict';

  function initMentorDemo() {
    var root = document.getElementById('mentorExample');
    if (!root || root.dataset.mentorDemoReady === 'true') return;

    function find(id) { return root.querySelector('#mentor-demo-' + id); }
    var ui = {
      controls: find('controls'), title: find('stage-title'), description: find('description'),
      label: find('palette-name'), actual: find('canvas-name'), artwork: find('artwork'),
      artworkTitle: find('artwork-title'), check: find('check'), reset: find('reset'),
      status: find('status'), results: find('results'), labelResult: find('label-result'),
      colorResult: find('color-result'), takeaway: find('takeaway')
    };
    if (Object.keys(ui).some(function (key) { return !ui[key]; })) return;
    var steps = Array.from(root.querySelectorAll('[data-mentor-demo-step]'));
    var options = Array.from(root.querySelectorAll('[data-mentor-demo-palette]'));
    var shapes = Array.from(root.querySelectorAll('[data-mentor-demo-paint]'));
    if (steps.length !== 3 || options.length !== 2 || !shapes.length) return;
    root.dataset.mentorDemoReady = 'true';

    var palettes = {
      sunset: { name: 'Закат', sky: '#eaad8e', sun: '#ffe3b6', mountain: '#7c627e', water: '#a67a8c', foreground: '#4f5f64' },
      mist: { name: 'Туман', sky: '#a5bdc5', sun: '#dbe7df', mountain: '#5c7d86', water: '#799da2', foreground: '#344f5b' }
    };
    var descriptions = {
      1: ['Первая версия', 'В этом учебном макете специально оставлена ошибка. Нажми «Туман»: должна поменяться и подпись, и палитра пейзажа. Затем открой шаг 2.'],
      2: ['Проверка с наставником', 'Сравним ожидание с результатом: после выбора другой палитры должны измениться подпись и цвета. Если ещё не нажимал кнопку палитры, попробуй сейчас.'],
      3: ['Исправление и повторная проверка', 'Исправление связывает выбор палитры и с подписью, и с цветами. Макет снова в режиме «Закат». Нажми «Туман», затем проверь результат сам.']
    };
    var stage = 1;
    var selected = 'sunset';
    var lastAction = null;

    function snapshot() {
      return { label: ui.label.textContent, colors: shapes.map(function (shape) { return shape.getAttribute('fill'); }) };
    }

    function paint(palette) {
      shapes.forEach(function (shape) { shape.setAttribute('fill', palettes[palette][shape.dataset.mentorDemoPaint]); });
      ui.artwork.dataset.palette = palette;
      ui.artworkTitle.textContent = 'Учебный пейзаж: палитра «' + palettes[palette].name + '»';
      ui.actual.textContent = palettes[palette].name;
    }

    function syncOptions() {
      ui.label.textContent = palettes[selected].name;
      options.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.mentorDemoPalette === selected)); });
    }

    function clearResults() {
      ui.results.hidden = true;
      ui.labelResult.textContent = '';
      ui.colorResult.textContent = '';
      delete ui.labelResult.dataset.passed;
      delete ui.colorResult.dataset.passed;
      ui.takeaway.textContent = '';
    }

    function resetCanvas() {
      selected = 'sunset';
      lastAction = null;
      syncOptions();
      paint('sunset');
      clearResults();
    }

    function setStage(next, reset) {
      if (next === stage && !reset) return;
      var previous = stage;
      stage = next;
      if (reset || next === 1 || next === 3 || previous === 3) resetCanvas();
      else clearResults();
      root.dataset.mentorDemoStage = String(stage);
      steps.forEach(function (button) { button.setAttribute('aria-pressed', String(Number(button.dataset.mentorDemoStep) === stage)); });
      ui.title.textContent = descriptions[stage][0];
      ui.description.textContent = descriptions[stage][1];
      ui.check.hidden = stage === 1;
      ui.status.textContent = stage === 3
        ? 'Исправленная версия готова. Результат ещё не проверен — выбери другую палитру.'
        : (lastAction ? 'Последнее переключение сохранено. Нажми «Проверить результат».' : 'Проверки ещё не было. Начни с кнопки «Туман».');
    }

    steps.forEach(function (button) {
      button.addEventListener('click', function () { setStage(Number(button.dataset.mentorDemoStep), false); });
    });

    options.forEach(function (button) {
      button.addEventListener('click', function () {
        var next = button.dataset.mentorDemoPalette;
        if (!Object.prototype.hasOwnProperty.call(palettes, next)) return;
        if (next === selected) {
          ui.status.textContent = 'Сейчас уже выбрана палитра «' + palettes[next].name + '». Для новой проверки выбери другую.';
          return;
        }
        var before = snapshot();
        selected = next;
        syncOptions();
        // The first two stages deliberately reproduce a label-only update.
        if (stage === 3) paint(next);
        lastAction = { before: before, after: snapshot(), requested: next };
        clearResults();
        ui.status.textContent = stage === 1
          ? 'Выбрана палитра «' + palettes[next].name + '». Сравни подпись с картинкой и открой шаг 2.'
          : 'Выбрана палитра «' + palettes[next].name + '». Теперь нажми «Проверить результат».';
      });
    });

    ui.check.addEventListener('click', function () {
      if (!lastAction) {
        clearResults();
        ui.status.textContent = 'Пока нечего проверять: сначала выбери другую палитру. Без действия мы не ставим ни успех, ни ошибку.';
        return;
      }
      var labelChanged = lastAction.before.label !== lastAction.after.label;
      var colorsChanged = lastAction.before.colors.some(function (color, index) { return color !== lastAction.after.colors[index]; });
      ui.labelResult.dataset.passed = String(labelChanged);
      ui.colorResult.dataset.passed = String(colorsChanged);
      ui.labelResult.textContent = (labelChanged ? '✓ ' : '× ') + 'Подпись: «' + lastAction.before.label + '» → «' + lastAction.after.label + '»' + (labelChanged ? ' — изменилась.' : ' — не изменилась.');
      ui.colorResult.textContent = colorsChanged ? '✓ Цвета пейзажа изменились.' : '× Цвета пейзажа остались прежними.';
      ui.takeaway.textContent = colorsChanged && labelChanged
        ? 'Повторная проверка прошла: одно действие изменило и подпись, и картинку. Так мы проверяем конкретное исправление.'
        : 'Расхождение найдено: подпись обновилась, а цвета — нет. Наставник помогает сформулировать точную задачу: обновить палитру пейзажа при переключении, затем повторить ту же проверку.';
      ui.results.hidden = false;
      ui.status.textContent = colorsChanged && labelChanged ? 'Проверка завершена: оба условия выполнены.' : 'Проверка завершена: подпись изменилась, цвета — нет. Перейди к шагу 3.';
    });

    ui.reset.addEventListener('click', function () { setStage(1, true); });
    ui.controls.hidden = false;
    setStage(1, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMentorDemo, { once: true });
  else initMentorDemo();
}());
