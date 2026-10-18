(() => {
  const lesson = document.querySelector('#transformation-lab');
  if (!lesson) return;
  let step = 0, palette = 'mist', foreground = true;
  const descriptions = [
    'Исходник: пять подготовленных SVG-слоёв собраны в одну картинку. Пока ничего не изменено.',
    'Разбор: раздвинули те же пять слоёв. Небо, солнце, горы, вода и растения теперь видны отдельно.',
    'Результат: собрали слои обратно и изменили палитру. Сравните с исходником слева; на телефоне он выше.'
  ];
  function render() {
    lesson.dataset.step = String(step);
    lesson.querySelectorAll('[data-lesson-step]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.lessonStep) === step)));
    lesson.querySelectorAll('[data-lesson-palette]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lessonPalette === palette)));
    lesson.querySelectorAll('[data-lesson-layer]').forEach((image, i) => {
      image.src = `assets/design-lab/${step === 2 ? palette : 'sunset'}-${i}.svg`;
      image.hidden = step === 2 && i === 4 && !foreground;
    });
    lesson.querySelector('#lesson-status').textContent = step === 2 && palette === 'sunset'
      ? (foreground ? 'Результат совпадает с исходником: вы вернули палитру «Закат» и все пять слоёв. Выберите «Туман» или скройте растения, чтобы увидеть изменение.' : 'Результат: палитра исходника сохранена, а растения убраны. Сравните передний план двух изображений.')
      : descriptions[step];
    lesson.querySelector('#lesson-result-label').textContent = ['01 / Та же композиция', '02 / Устройство изображения', '03 / Ваша новая версия'][step];
    lesson.querySelector('#lesson-settings').hidden = step !== 2;
    lesson.querySelector('#lesson-foreground').setAttribute('aria-pressed', String(foreground));
    lesson.querySelector('#lesson-foreground').textContent = foreground ? 'Растения: видны' : 'Растения: скрыты';
    lesson.querySelector('#lesson-summary').textContent = step === 2
      ? `${foreground ? 5 : 4} из 5 слоёв · палитра «${palette === 'mist' ? 'Туман' : 'Закат'}» · ${foreground ? 'передний план сохранён' : 'передний план убран'}`
      : `5 из 5 слоёв · палитра «Закат» · ${step === 1 ? 'слои раздвинуты' : 'исходное изображение'}`;
  }
  lesson.querySelectorAll('[data-lesson-step]').forEach(b => b.addEventListener('click', () => { step = Number(b.dataset.lessonStep); render(); }));
  lesson.querySelectorAll('[data-lesson-palette]').forEach(b => b.addEventListener('click', () => { palette = b.dataset.lessonPalette; render(); }));
  lesson.querySelector('#lesson-foreground').addEventListener('click', () => { foreground = !foreground; render(); });
  lesson.querySelector('#lesson-reset').addEventListener('click', () => { step = 0; palette = 'mist'; foreground = true; render(); });
  render();
})();
