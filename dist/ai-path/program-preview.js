(function () {
  'use strict';
  const panel = document.getElementById('programPreview');
  const firstAction = document.getElementById('lessonTrialJump');
  const contact = document.getElementById('startJump');
  const hint = document.getElementById('offerEarlyHint');
  const defaultHint = hint.textContent;
  const title = panel.querySelector('h4');
  const lead = panel.querySelector('.program-preview-lead');
  const image = panel.querySelector('img');
  const caption = panel.querySelector('figcaption');
  const task = panel.querySelector('.program-preview-task');
  const steps = panel.querySelector('.program-preview-steps');
  const outputs = panel.querySelector('.program-preview-outcomes');
  const open = panel.querySelector('.program-preview-open');

  const previews = {
    game: {
      title: 'Поменяй правило и пройди игру снова',
      lead: 'Начни с маленькой механики в браузере. На курсе этот навык пригодится, когда будешь менять диалог или правило в «Пробуждении».',
      image: 'assets/awakening/city-day.webp', alt: 'Герой на улице города в прототипе «Пробуждение»',
      caption: 'Кадр alpha-прототипа «Пробуждение». В кнопке ниже открывается отдельная браузерная мини-игра.',
      task: 'Сравни две цели на одной карте',
      steps: ['Собери 2 звезды и посмотри число ходов.', 'На той же карте выбери 3 звезды и пройди ещё раз.', 'Сравни прохождения. Как новая цель изменила маршрут?'],
      outputs: ['Один диалог или небольшая механика в игре', 'Описание доработки в репозитории', 'Короткое видео, где видно изменение'],
      route: 'game-lab.html#workspace', action: 'Изменить правило игры ↗'
    },
    unity: {
      title: 'Спроектируй условие победы для своей 2D-игры',
      lead: 'Проверь идею на браузерном поле. В Unity Editor ты перенесёшь её в свой прототип со счётчиком и перезапуском.',
      image: 'assets/unity-games/crystal-route.webp', alt: 'Нарисованный концепт игры с персонажем и кристаллами',
      caption: 'AI-иллюстрация идеи. Практика ниже работает в браузере. Прототип на Unity собирается на курсе.',
      task: 'Реши, когда должен срабатывать экран победы',
      steps: ['Выбери цель в 3 звезды и проведи героя по полю.', 'Проверь счётчик перед последней звездой и после неё.', 'Запусти раунд снова и проверь, что счётчик обнулился.'],
      outputs: ['2D-сцена с движением, сбором и победой', 'Исходники C# и проверки перезапуска', 'Учебная сборка под согласованную настольную платформу'],
      route: 'game-lab.html#workspace', action: 'Попробовать правило победы ↗'
    },
    designlab: {
      title: 'Сравни один интерьер при разном освещении',
      lead: 'На примере AI Desk видно, как настройки меняют впечатление от сцены. На курсе свяжешь похожее действие с задачей посетителя своего сайта.',
      image: 'assets/design-lab/ai-desk-preview.png', alt: 'Кадр интерактивной 3D-сцены AI Desk со столом и лампой',
      caption: 'Кадр учебной 3D-сцены AI Desk. Настройки можно менять в открытом примере.',
      task: 'Собери дневной и вечерний варианты рабочего места',
      steps: ['Запусти сцену и подбери материал столешницы.', 'Переключи свет с дневного на вечерний.', 'Сохрани два варианта и сравни, где форма и материал читаются лучше.'],
      outputs: ['Свой сайт с 2–3 интерактивными сценариями', 'Мобильный экран и опубликованное демо', 'Репозиторий с описанием проверок и источников'],
      route: 'examples/ai-desk.html#scene-panel', action: 'Настроить свет и материал ↗'
    },
    build: {
      title: 'Проверь, как сайт помогает выбрать завтрак',
      lead: 'В учебном меню Pocitel можно собрать выбор и сразу увидеть сумму. На курсе подберёшь действие, которое помогает посетителю твоего сайта.',
      image: 'assets/pocitel/pairings.png', alt: 'Меню Pocitel с парами блюд и напитков',
      caption: 'Материал меню Pocitel для учебного примера. Демо рассчитывает выбор посетителя.',
      task: 'Собери выбор и проверь, что сумма меняется',
      steps: ['Добавь два сочетания блюд и напитков.', 'Поставь бюджет и проверь, укладывается ли в него выбор.', 'Убери одну позицию и проверь новый итог.'],
      outputs: ['Работающий сайт с полезным действием для посетителя', 'Мобильная версия и опубликованная ссылка', 'Исходники и список проверенных сценариев'],
      route: 'examples/pocitel.html#pairings', action: 'Собрать выбор в меню ↗'
    },
    vibe: {
      title: 'Проведи запрос на сайт через учебную CRM',
      lead: 'Получишь вымышленный запрос и увидишь, какие решения двигают работу вперёд. На курсе соберёшь свой MVP и продумаешь, как проверять спрос.',
      image: 'assets/program-cards-20261102/vibe-640.webp', alt: 'Иллюстрация веб-продукта и учебной доски CRM',
      caption: 'AI-иллюстрация направления. В учебной CRM используются вымышленные данные.',
      task: 'Доведи запрос от уточнения задачи до передачи макета',
      steps: ['Начни учебную сделку и прочитай запрос.', 'Пройди этапы прототипа и предложения.', 'Передай учебный макет и скачай итог кейса.'],
      outputs: ['Проверенный MVP и история изменений в GitHub', 'Учебная CRM и описание сценария сделки', 'План проверки спроса и черновик питча'],
      route: 'vibe-coding/crm-demo.html#scenarioTitle', action: 'Начать учебную сделку ↗'
    }
  };

  function setItems(list, items) {
    list.replaceChildren(...items.map(item => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
  }

  document.addEventListener('ai-path:program-selected', event => {
    const program = event.detail?.program;
    const preview = Object.hasOwn(previews, program) ? previews[program] : null;
    const isLesson = program === 'ml';
    const hasTrial = isLesson || Boolean(preview);
    firstAction.hidden = !hasTrial;
    firstAction.href = isLesson ? '#lessonDemo' : '#programPreview';
    firstAction.textContent = isLesson ? 'Попробовать урок ↓' : 'Попробовать на практике ↓';
    contact.classList.toggle('primary', !hasTrial);
    contact.classList.toggle('ghost', hasTrial);
    hint.textContent = hasTrial ? 'Сначала попробуй небольшую задачу и посмотри, что сможешь собрать на курсе.' : defaultHint;
    panel.hidden = !preview;
    if (!preview) return;

    title.textContent = preview.title;
    lead.textContent = preview.lead;
    image.src = preview.image;
    image.alt = preview.alt;
    caption.textContent = preview.caption;
    task.textContent = preview.task;
    setItems(steps, preview.steps);
    setItems(outputs, preview.outputs);
    const url = new URL(preview.route, location.href);
    url.searchParams.set('program', program);
    url.searchParams.set('level', document.getElementById('enquiryLevel').value);
    url.searchParams.set('pace', document.getElementById('enquiryPace').value);
    open.href = url.href;
    open.textContent = preview.action;
  });
})();
