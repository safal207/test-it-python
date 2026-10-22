const materialNames = { oak: 'Светлый дуб', walnut: 'Тёмный орех', white: 'Матовый белый' };
const params = new URLSearchParams(location.search);
let material = Object.hasOwn(materialNames, params.get('material')) ? params.get('material') : 'oak';
let lighting = params.get('light') === 'evening' ? 'evening' : 'day';
let scene = null;
let launching = false;
let launchAttempts = 0;
const panel = document.querySelector('#scene-panel');
const canvas = document.querySelector('#desk-canvas');
const poster = document.querySelector('#scene-poster');
const launch = document.querySelector('#launch');
const start = document.querySelector('#start-scene');
const launchLabel = document.querySelector('#launch-label');
const launchNote = document.querySelector('#launch-note');
const status = document.querySelector('#scene-status');
const reset = document.querySelector('#reset-view');
const materialButtons = [...document.querySelectorAll('[data-material]')];
const lightButtons = [...document.querySelectorAll('button[data-lighting]')];

function updateControls() {
  for (const button of materialButtons) button.setAttribute('aria-pressed', String(button.dataset.material === material));
  for (const button of lightButtons) button.setAttribute('aria-pressed', String(button.dataset.lighting === lighting));
  panel.dataset.material = material;
  panel.dataset.lighting = lighting;
  const name = document.querySelector('#selection-name');
  name.replaceChildren(document.createTextNode(materialNames[material] + ' '));
  const suffix = document.createElement('span');
  suffix.textContent = lighting === 'day' ? '+ дневной свет' : '+ вечерний свет';
  name.append(suffix);
  document.querySelector('#light-note').textContent = lighting === 'day' ? 'Мягкий дневной свет. Новый чистый лист.' : 'Тёплый свет лампы. Время сосредоточиться.';
}
function updateUrl() {
  const url = new URL(location.href);
  url.searchParams.set('material', material);
  url.searchParams.set('light', lighting);
  history.replaceState(null, '', url);
  document.querySelector('#share-url').value = url.href;
}
function selectedStatus() {
  status.textContent = scene ? `${materialNames[material]}, ${lighting === 'day' ? 'дневной' : 'вечерний'} свет.` : 'Вариант выбран. Запусти 3D, чтобы увидеть изменения.';
}
for (const button of materialButtons) button.addEventListener('click', () => {
  material = button.dataset.material;
  scene?.setMaterial(material);
  updateControls(); updateUrl(); selectedStatus();
});
for (const button of lightButtons) button.addEventListener('click', () => {
  lighting = button.dataset.lighting;
  scene?.setLighting(lighting);
  updateControls(); updateUrl(); selectedStatus();
});
function showFailure() {
  const focused = document.activeElement;
  const hidFocusedControl = focused === canvas || focused === reset;
  scene?.dispose(); scene = null;
  canvas.hidden = true; poster.hidden = false; launch.hidden = false; reset.hidden = true;
  panel.dataset.state = 'error';
  document.querySelector('#scene-badge').textContent = 'ПРЕВЬЮ';
  launchLabel.textContent = 'Попробовать ещё раз';
  launchNote.textContent = '3D не запустилось. Попробуй ещё раз или обнови страницу. Для сцены нужен WebGL.';
  status.textContent = '3D сейчас недоступно. Выбор материала и света можно сохранить в ссылке.';
  if (hidFocusedControl && !start.disabled) start.focus({ preventScroll: true });
}
start.addEventListener('click', async () => {
  if (launching || scene) return;
  launching = true; start.disabled = true; panel.dataset.state = 'loading';
  launchLabel.textContent = 'Собираем пространство…';
  status.textContent = 'Загружаем 3D-сцену.';
  try {
    const sceneModule = new URL('./ai-desk-scene.js', import.meta.url);
    if (launchAttempts > 0) sceneModule.searchParams.set('retry', String(launchAttempts));
    launchAttempts += 1;
    const { createDeskScene } = await import(sceneModule.href);
    canvas.hidden = false;
    scene = createDeskScene(canvas, { material, lighting, onContextLost: showFailure, onError: showFailure });
    scene.resize();
    poster.hidden = true; launch.hidden = true; reset.hidden = false;
    panel.dataset.state = 'ready';
    document.querySelector('#scene-badge').textContent = 'ЖИВОЕ 3D';
    document.querySelector('#scene-help').textContent = 'Перетаскивай для поворота · + / − масштаб';
    status.textContent = '3D готово. Меняй материал и свет. На сцене также работают стрелки клавиатуры.';
    canvas.focus({ preventScroll: true });
  } catch { showFailure(); }
  finally {
    launching = false; start.disabled = false;
    const focused = document.activeElement;
    // Disabling launch can leave focus on the body; preserve any control used while loading.
    if (panel.dataset.state === 'error' && [document.body, start, canvas, reset].includes(focused)) {
      start.focus({ preventScroll: true });
    }
  }
});
reset.addEventListener('click', () => { scene?.resetView(); status.textContent = 'Исходный ракурс восстановлен. Материал и свет сохранены.'; });
document.querySelector('#copy-link').addEventListener('click', async () => {
  updateUrl();
  const url = document.querySelector('#share-url');
  try {
    await navigator.clipboard.writeText(url.value);
    status.textContent = 'Ссылка скопирована. Она откроет выбранные материал и свет.';
  } catch {
    url.hidden = false; url.focus(); url.select();
    status.textContent = 'Ссылка выделена. Скопируй её через меню браузера.';
  }
});
window.addEventListener('pagehide', () => { scene?.dispose(); scene = null; });
// Back-forward cache returns the DOM too; restore the launch state rather than a disposed canvas.
window.addEventListener('pageshow', event => { if (event.persisted && !scene && panel.dataset.state === 'ready') showFailure(); });
updateControls();
