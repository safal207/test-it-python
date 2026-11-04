(function () {
  'use strict';
  const section = document.getElementById('lessonDemo');
  if (!section) return;
  const trialPath = document.getElementById('mlTrialPath');
  const panel = document.getElementById('lessonDemoPanel');
  const tabs = Array.from(section.querySelectorAll('[data-lesson-demo]'));
  const root = 'https://github.com/safal207/students/blob/b89ab62d0aa4132389ea1ec1704895eab1d78b21/';
  const github = path => root + path.split('/').map(encodeURIComponent).join('/');
  const xor = (a, b) => Number(a !== b);
  const vocab = { дом: 3, сад: 5 };
  const tokenize = text => text.toLowerCase().match(/[а-яёa-z]+/g) || [];
  const encode = text => tokenize(text).map(word => vocab[word] || 1).join(', ');
  const conv = weights => [1, 2, 6, 7].reduce((sum, n, i) => sum + n * weights[i], 0);
  const lessons = {
    xor: {
      title: 'Нейросеть решает XOR', label: 'ПЕРВАЯ НЕЙРОСЕТЬ', time: '2 минуты',
      description: 'Разберись с правилом, которое потом научится находить маленькая сеть.',
      path: 'ML/reproducible_mlp_xor_numpy.ipynb',
      steps: [
        { title: 'Разные знаки', visual: '+  и  −', question: 'Знаки разные. Какой ответ даст правило?', options: ['0', '1'], correct: String(xor('+', '−')), tip: 'Если знаки разные, ответ — 1.', mira: 'Теперь понятно: разные знаки дают единицу.', mentor: 'Мы сравнили признаки, а не складывали числа.', bot: '+ и − → 1' },
        { title: 'Одинаковые знаки', visual: '+  и  +', question: 'А если оба знака одинаковые?', options: ['0', '1'], correct: String(xor('+', '+')), tip: 'Для одинаковых знаков правило возвращает 0.', mira: 'Одинаковые — значит ноль.', mentor: 'XOR отвечает на вопрос: признаки отличаются?', bot: '+ и + → 0' },
        { title: 'Проверь себя', visual: '−  и  +', question: 'Последняя пара: какой ответ?', options: ['0', '1'], correct: String(xor('−', '+')), tip: 'Посмотри на знаки: они одинаковые или разные?', mira: 'Я могу проверить новую пару сама!', mentor: 'В полном уроке сеть учится этому правилу на примерах.', bot: '− и + → 1' }
      ]
    },
    text: {
      title: 'Слова становятся числами', label: 'ТЕКСТ И НЕЙРОСЕТИ', time: '2 минуты',
      description: 'Посмотри, как из фразы получаются отдельные слова и числовые коды.',
      path: 'NLP/NLP_SafonovAlex_DenseRNN_,Conv1d,LSTM,_GRU_для_обработки_текстов".ipynb',
      steps: [
        { title: 'Раздели фразу', visual: 'дом,сад', question: 'Что получится, если запятая разделяет слова?', options: ['дом · сад', 'домсад'], correct: tokenize('дом,сад').join(' · '), tip: 'Запятая — разделитель: слова не должны склеиться.', mira: 'Даже без пробела это два слова.', mentor: 'Мы находим слова, а не просто убираем запятую.', bot: 'дом · сад' },
        { title: 'Незнакомое слово', visual: 'дом → 3    сад → 5    ? → 1', question: 'Какой код получит слово «космос», которого нет в словаре?', options: ['0', '1', '3'], correct: encode('космос'), tip: 'Код 1 оставлен для неизвестных слов.', mira: 'Новое слово не потерялось!', mentor: 'Код 1 означает «слова нет в учебном словаре».', bot: 'космос → 1' },
        { title: 'Закодируй фразу', visual: 'дом,сад космос', question: 'Какой получится порядок кодов?', options: ['3, 5, 1', '3, 1, 5', '35, 1'], correct: encode('дом,сад космос'), tip: 'Сначала найди три слова, затем замени каждое его кодом.', mira: 'Коды идут в том же порядке, что слова.', mentor: 'Такой список можно передать следующему этапу обработки.', bot: 'дом → 3 · сад → 5 · космос → 1' }
      ]
    },
    vision: {
      title: 'Как свёртка видит картинку', label: 'КОМПЬЮТЕРНОЕ ЗРЕНИЕ', time: '3 минуты',
      description: 'Приложи маленький фильтр к числам и узнай, откуда берётся результат.',
      path: 'CV/Conv2D_Arguments.ipynb',
      steps: [
        { title: 'Приложи фильтр', visual: 'Данные: 1, 2, 6, 7\nВеса:       0, 1, 2, 3', question: 'Умножь каждую пару и сложи. Что получится?', options: ['16', '35', '42'], correct: String(conv([0, 1, 2, 3])), tip: '1×0 + 2×1 + 6×2 + 7×3 = 35.', mira: 'Каждое число влияет по своему весу.', mentor: 'Складываем четыре произведения: 0 + 2 + 12 + 21.', bot: 'Результат: 35' },
        { title: 'Измени веса', visual: 'Данные: 1, 2, 6, 7\nВеса:       1, 1, 1, 1', question: 'Теперь все веса равны 1. Какой результат?', options: ['10', '16', '35'], correct: String(conv([1, 1, 1, 1])), tip: 'При весах 1 достаточно сложить четыре числа.', mira: 'Фильтр поменялся — ответ тоже.', mentor: 'Другие веса выделяют другие сочетания чисел.', bot: '1 + 2 + 6 + 7 = 16' },
        { title: 'Найди нулевой вес', visual: 'Данные: 1, 2, 6, 7\nВеса:       0, 1, 2, 3', question: 'Какое первое число не влияет на сумму из-за нулевого веса?', options: ['1', '2', '7'], correct: '1', tip: 'Первое число умножается на 0.', mira: 'Число 1 исчезает из суммы.', mentor: 'Любое число с нулевым весом даёт ноль.', bot: '1 × 0 = 0' }
      ]
    }
  };
  let current = 'xor', step = 0, answered = null;
  function render() {
    const lesson = lessons[current], item = lesson.steps[step], isCorrect = answered === item.correct;
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.lessonDemo === current)));
    const feedback = answered === null
      ? '<p class="lesson-demo-hint">Мира: «Попробую разобраться вместе с тобой».</p>'
      : isCorrect
        ? `<div class="lesson-demo-dialogue"><p><strong>Мира:</strong> ${item.mira}</p><p><strong>Данил, ментор:</strong> ${item.mentor}</p><p><strong>Пикс:</strong> ${item.bot}</p></div>`
        : `<div class="lesson-demo-dialogue"><p><strong>Мира:</strong> Давай посмотрим ещё раз.</p><p><strong>Данил, ментор:</strong> ${item.tip}</p><p><strong>Пикс:</strong> Попробуй другой ответ.</p></div>`;
    panel.innerHTML = `<div class="lesson-demo-work"><div class="lesson-demo-meta"><span>${lesson.label}</span><span>${lesson.time}</span></div>
      <h5>${lesson.title}</h5><p class="lesson-demo-intro">${lesson.description}</p>
      <div class="lesson-demo-progress" aria-label="Шаг ${step + 1} из 3"><span>ШАГ ${step + 1} / 3</span><div aria-hidden="true"><i class="${step >= 0 ? 'done' : ''}"></i><i class="${step >= 1 ? 'done' : ''}"></i><i class="${step >= 2 ? 'done' : ''}"></i></div></div>
      <h6>${item.title}</h6><div class="lesson-demo-example">${item.visual.replace('\n', '<br>')}</div><p class="lesson-demo-question">${item.question}</p>
      <div class="lesson-demo-answers" role="group" aria-label="Варианты ответа">${item.options.map(option => `<button type="button" data-demo-answer="${option}" aria-pressed="${String(answered === option)}">${option}</button>`).join('')}</div>
      <div class="lesson-demo-response" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">${feedback}</div>
      <div class="lesson-demo-actions">${step ? '<button type="button" class="lesson-demo-back" data-demo-back>← Назад</button>' : ''}${isCorrect && step < 2 ? '<button type="button" class="lesson-demo-next" data-demo-next>Следующий шаг →</button>' : ''}${isCorrect && step === 2 ? '<button type="button" class="lesson-demo-next" data-demo-restart>Пройти ещё раз ↻</button>' : ''}</div>
      <p class="lesson-demo-disclaimer">Это маленькое упражнение в браузере. Полный код и объяснения — в ноутбуке.</p>
      <a class="lesson-demo-notebook" href="${github(lesson.path)}" target="_blank" rel="noopener noreferrer">Открыть полный урок в ноутбуке ↗</a></div>
      <figure class="lesson-demo-scene"><img src="assets/lesson-demo/${answered === null ? (step ? 'think' : 'start') : (isCorrect ? (step === 2 ? 'finish' : 'check') : 'think')}.jpg" alt="Мира, ментор Данил и бот Пикс обсуждают урок" width="480" height="320" loading="lazy" decoding="async"><figcaption><strong>Учимся вместе</strong><span>Мира задаёт вопросы, Данил объясняет, Пикс помогает проверить.</span></figcaption><small>Вымышленные герои учебной истории</small></figure>`;
  }
  section.addEventListener('click', event => {
    const tab = event.target.closest('[data-lesson-demo]');
    if (tab && section.contains(tab)) { current = tab.dataset.lessonDemo; step = 0; answered = null; render(); return; }
    const answer = event.target.closest('[data-demo-answer]');
    if (answer) { answered = answer.dataset.demoAnswer; render(); panel.querySelector('.lesson-demo-response').focus({ preventScroll: true }); return; }
    if (event.target.closest('[data-demo-next]')) { step += 1; answered = null; render(); panel.querySelector('h6').setAttribute('tabindex', '-1'); panel.querySelector('h6').focus({ preventScroll: true }); }
    if (event.target.closest('[data-demo-back]')) { step -= 1; answered = null; render(); panel.querySelector('h6').setAttribute('tabindex', '-1'); panel.querySelector('h6').focus({ preventScroll: true }); }
    if (event.target.closest('[data-demo-restart]')) { step = 0; answered = null; render(); panel.querySelector('h6').setAttribute('tabindex', '-1'); panel.querySelector('h6').focus({ preventScroll: true }); }
  });
  document.addEventListener('ai-path:program-selected', event => {
    trialPath.hidden = event.detail?.program !== 'ml';
  });
  render();
})();
