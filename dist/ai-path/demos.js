import { demos } from './demo-catalog.js';
import { journeys, findJourney } from './project-journeys.js';
const grid = document.getElementById('demo-grid');
const search = document.getElementById('demo-search');
let filter = 'local';
let journeyId = '';
const context = new URLSearchParams(location.search);
function planHref(project, journey) {
  const params = new URLSearchParams();
  if (project) params.set('project', project);
  if (journey) params.set('journey', journey);
  params.set('mode', 'learn');
  if (['zero', 'basic', 'project'].includes(context.get('level'))) params.set('level', context.get('level'));
  if (['light', 'balanced', 'deep'].includes(context.get('pace'))) params.set('pace', context.get('pace'));
  return `project-start.html?${params}`;
}
function refreshNavigation() {
  window.AIPathNavigation?.refresh({ program: context.get('program'), level: context.get('level'), pace: context.get('pace') });
}
const make = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; };
function render() {
  const query = search.value.trim().toLocaleLowerCase('ru');
  const visible = demos.filter(item => (!journeyId || findJourney(item.id)?.id === journeyId) && (filter === 'all' || filter === item.group) && [item.name, item.task, item.result, item.kind].join(' ').toLocaleLowerCase('ru').includes(query));
  const fragment = document.createDocumentFragment();
  for (const item of visible) {
    const card = make('article', 'demo-card'); card.dataset.demo = item.id;
    if (item.image) { const image = make('img', 'demo-cover'); image.src = item.image; image.alt = item.alt; image.width = 640; image.height = 360; image.loading = 'lazy'; card.append(image); }
    else { const symbol = make('div', 'demo-symbol', item.symbol || '↗'); symbol.setAttribute('aria-hidden', 'true'); symbol.append(make('span', '', item.kind)); card.append(symbol); }
    const body = make('div', 'demo-body'); body.append(make('span', 'demo-kind', item.kind), make('h3', '', item.name), make('p', 'demo-task', item.task));
    const result = make('p', 'demo-result'); result.append(make('strong', '', 'Что получишь'), document.createTextNode(item.result));
    const link = make('a', 'demo-open', item.cta || 'Попробовать ↗'); link.href = item.url; link.setAttribute('aria-label', `${item.cta || 'Попробовать'}: ${item.name}`);
    const plan = make('a', 'demo-plan', 'Для моего проекта →'); plan.href = planHref(item.id); plan.setAttribute('aria-label', `Для моего проекта: ${item.name}`); plan.setAttribute('data-navigation-manual', '');
    const details = make('details'); details.append(make('summary', '', 'Об этом примере'), make('p', '', item.note));
    if (item.source) { const source = make('a', '', 'Исходники и авторство ↗'); source.href = item.source; details.append(source); }
    body.append(result, link, plan, details); card.append(body); fragment.append(card);
  }
  grid.replaceChildren(fragment);
  document.getElementById('demo-count').textContent = `Показано ${visible.length} из ${demos.length}. ${filter === 'artifact' ? 'Исходники и готовые работы: формат запуска указан на карточке.' : filter === 'external' ? 'Эти проекты открываются на отдельных сайтах.' : 'Выбери интересную задачу и начни с неё.'}`;
  document.getElementById('demo-empty').hidden = visible.length > 0;
  refreshNavigation();
}
const choices = document.getElementById('journey-choices');
// Keep the selector in the initial HTML so loading modules cannot push the catalog down.
for (const button of choices.querySelectorAll('[data-journey-choice]')) {
  const journey = [{ id: '', label: 'Пока выбираю' }, ...journeys].find(item => item.id === button.dataset.journeyChoice);
  if (!journey) continue;
  button.disabled = false;
  button.addEventListener('click', () => {
    journeyId = journey.id;
    document.querySelectorAll('[data-journey-choice]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    filter = journeyId ? 'all' : 'local';
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.filter === filter)));
    const summary = document.getElementById('journey-summary'); summary.hidden = !journeyId;
    if (journeyId) {
      document.getElementById('journey-description').textContent = journey.description;
      const featured = demos.find(item => item.id === journey.featuredId);
      const previousProof = document.getElementById('journey-proof');
      const proof = previousProof.cloneNode(false); proof.href = featured.url; proof.textContent = `${featured.group === 'artifact' ? 'Разобрать пример' : 'Попробовать пример'}: ${featured.name} ↗`; previousProof.replaceWith(proof);
      document.getElementById('journey-plan').href = planHref('', journeyId);
    }
    render();
  });
}
document.querySelectorAll('[data-project-plan]').forEach(link => { link.href = planHref(); });
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); render(); }));
search.addEventListener('input', render);
document.getElementById('demo-reset').addEventListener('click', () => {
  search.value = '';
  choices.querySelector('[data-journey-choice=""]').click();
  search.focus();
});
render();
