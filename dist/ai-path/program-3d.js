(function () {
  'use strict';
  var panel = document.getElementById('program3d');
  if (!panel) return;
  var selected = document.getElementById('selected');
  var stage = document.getElementById('program3dStage');
  var poster = document.getElementById('program3dPoster');
  var mount = document.getElementById('program3dFrame');
  var play = document.getElementById('program3dPlay');
  var stop = document.getElementById('program3dStop');
  var status = document.getElementById('program3dStatus');
  var stageLabel = document.getElementById('program3dStageLabel');
  var open = document.getElementById('program3dOpen');
  var origin = 'https://safal207.github.io';
  var scenes = {
    room: {
      url: origin + '/room-control-studio/',
      poster: 'assets/design-lab/room-3d-preview.png',
      title: 'Room Control — интерактивная 3D-комната',
      alt: 'Room Control: кадр работающей 3D-сцены с диваном, столом и светильниками',
      instructions: 'Потяни модель, чтобы повернуть камеру. Сравни «3D-модель» и «План сверху», затем поменяй свет.'
    },
    temple: {
      url: origin + '/quiet-hours-sanctuary/',
      poster: 'assets/design-lab/temple-3d-preview.png',
      title: 'Quiet Hours — интерактивная 3D-сцена храма',
      alt: 'Quiet Hours: кадр работающей 3D-сцены храма, сада и красной луны',
      instructions: 'Сравни общий план и вид у храма. Поменяй свет и посмотри, как он выделяет форму крыши и дорожку.'
    }
  };
  var milestones = {
    light: {scene: 'temple', week: 4, title: 'Найди форму с помощью света', text: 'Запусти храм и сравни освещение с двух ракурсов. На четвёртой неделе разберём, почему свет должен помогать видеть форму, а тени — оставлять детали читаемыми.'},
    interaction: {scene: 'room', week: 5, title: 'Проверь, как меняется освещение', text: 'Запусти комнату, поверни камеру и измени яркость. На пятой неделе свяжем настройки с тем, что человек видит на экране.'},
    publish: {scene: 'room', week: 6, title: 'Преврати сцену в понятный кейс', text: 'Сравни объём и план сверху. На шестой неделе проверим свет, управление и телефон, выберем удачный кадр для карточки и опубликуем свой проект с описанием проверок.'}
  };
  var activeScene = 'room';
  var activeProgram = null;
  var frame = null;
  var timer = null;
  var loading = false;
  var lastVisible = null;
  var posterFailed = false;

  function dispose() {
    window.clearTimeout(timer);
    timer = null;
    loading = false;
    if (frame) frame.remove();
    frame = null;
    lastVisible = null;
    mount.classList.remove('is-ready');
    stage.setAttribute('aria-busy', 'false');
    poster.hidden = posterFailed;
    stageLabel.hidden = false;
    play.hidden = false;
    play.disabled = false;
    play.textContent = 'Покрутить 3D';
    stop.hidden = true;
  }
  function idle() {
    if (posterFailed) {
      stageLabel.textContent = 'Кадр недоступен · попробуй открыть 3D';
      status.textContent = 'Изображение не загрузилось. Можно запустить 3D или открыть полный проект; учебные шаги доступны рядом.';
      return;
    }
    stageLabel.textContent = 'Кадр 3D-сцены · запусти и рассмотри';
    status.textContent = 'Сейчас показан кадр модели. Нажми «Покрутить 3D», чтобы запустить сцену.';
  }
  function fail() {
    dispose();
    stageLabel.textContent = 'Кадр сцены · 3D пока недоступно';
    play.textContent = 'Повторить запуск 3D';
    status.textContent = '3D не запустилось. Кадр модели и учебный план доступны. Можно повторить запуск или открыть полный проект с облегчённым режимом.';
  }
  function visible() {
    if (activeProgram !== 'designlab' || document.hidden || panel.hidden) return false;
    var rect = stage.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  }
  function sendVisibility() {
    if (!frame) return;
    var active = visible();
    if (lastVisible === active) return;
    lastVisible = active;
    frame.contentWindow.postMessage({type: 'designlab:visibility', active: active}, origin);
  }
  function showScene(id) {
    if (!Object.prototype.hasOwnProperty.call(scenes, id)) return;
    if (activeScene !== id) {
      dispose();
      activeScene = id;
      posterFailed = false;
      poster.hidden = false;
      poster.src = scenes[id].poster;
      poster.alt = scenes[id].alt;
      open.href = scenes[id].url;
      idle();
    }
    panel.querySelectorAll('[data-program-scene]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.programScene === activeScene));
    });
    panel.dataset.scene = activeScene;
  }
  function showMilestone(id) {
    var item = milestones[id];
    if (!item) return;
    showScene(item.scene);
    panel.querySelectorAll('[data-program-milestone]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.programMilestone === id));
    });
    document.getElementById('program3dTaskTitle').textContent = item.title;
    document.getElementById('program3dTask').textContent = item.text;
    var week = document.getElementById('program3dWeek');
    week.href = '#designlab-week-' + item.week;
    week.textContent = 'Что делаем на неделе ' + item.week + ' ↓';
  }
  function start() {
    if (activeProgram !== 'designlab' || frame) return;
    frame = document.createElement('iframe');
    frame.title = scenes[activeScene].title;
    // These are our own module-based demos. An opaque sandbox origin would block
    // their same-origin ES modules; no forms, popups or top navigation are allowed.
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.setAttribute('referrerpolicy', 'strict-origin');
    frame.src = scenes[activeScene].url + 'preview.html?v=program-3d-1';
    var thisFrame = frame;
    frame.addEventListener('error', function () { if (frame === thisFrame) fail(); });
    frame.addEventListener('load', function () {
      if (frame !== thisFrame) return;
      lastVisible = null;
      sendVisibility();
    });
    loading = true;
    play.disabled = true;
    play.textContent = 'Запускаем 3D…';
    stop.hidden = false;
    stop.textContent = 'Отменить запуск';
    stage.setAttribute('aria-busy', 'true');
    status.textContent = 'Загружаем модель в облегчённом режиме. Пока можно рассмотреть кадр и учебные шаги.';
    mount.appendChild(frame);
    timer = window.setTimeout(function () { if (frame === thisFrame && loading) fail(); }, 20000);
  }
  play.addEventListener('click', start);
  stop.addEventListener('click', function () { dispose(); idle(); play.focus({preventScroll: true}); });
  panel.querySelectorAll('[data-program-scene]').forEach(function (button) {
    button.addEventListener('click', function () {
      showMilestone(button.dataset.programScene === 'temple' ? 'light' : 'interaction');
    });
  });
  panel.querySelectorAll('[data-program-milestone]').forEach(function (button) {
    button.addEventListener('click', function () { showMilestone(button.dataset.programMilestone); });
  });
  poster.addEventListener('load', function () {
    posterFailed = false;
    poster.hidden = mount.classList.contains('is-ready');
  });
  poster.addEventListener('error', function () {
    posterFailed = true;
    poster.hidden = true;
    stageLabel.textContent = 'Кадр недоступен · попробуй открыть 3D';
    if (!frame) status.textContent = 'Изображение не загрузилось. Можно запустить 3D или открыть полный проект; учебные шаги доступны рядом.';
  });
  window.addEventListener('message', function (event) {
    if (event.origin !== origin || !frame || event.source !== frame.contentWindow) return;
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'designlab:preview-error') { fail(); return; }
    if (event.data.type !== 'designlab:preview-ready' || !loading) return;
    window.clearTimeout(timer);
    timer = null;
    loading = false;
    mount.classList.add('is-ready');
    poster.hidden = true;
    stageLabel.hidden = true;
    stage.setAttribute('aria-busy', 'false');
    play.hidden = true;
    play.disabled = false;
    stop.textContent = 'Вернуться к кадру';
    status.textContent = scenes[activeScene].instructions;
    lastVisible = null;
    sendVisibility();
  });
  document.addEventListener('ai-path:program-selected', function (event) {
    var next = event.detail && event.detail.program;
    if (next !== activeProgram) { dispose(); idle(); }
    activeProgram = next;
    panel.hidden = next !== 'designlab';
    selected.classList.toggle('has-program-3d', next === 'designlab');
    if (next === 'designlab') showScene(activeScene);
    sendVisibility();
  });
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(sendVisibility, {threshold: [0, 0.01]});
    observer.observe(stage);
  } else {
    window.addEventListener('scroll', sendVisibility, {passive: true});
    window.addEventListener('resize', sendVisibility, {passive: true});
  }
  document.addEventListener('visibilitychange', sendVisibility);
  window.addEventListener('pagehide', function () { dispose(); idle(); });
  showScene(activeScene);
})();
