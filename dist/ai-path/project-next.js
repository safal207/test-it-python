/* Keep only validated study preferences; demo inputs never enter navigation. */
(function () {
  'use strict';
  const query = new URLSearchParams(window.location.search);
  document.querySelectorAll('[data-project-next-link]').forEach(link => {
    const destination = new URL(link.getAttribute('href'), window.location.href);
    if (['zero', 'basic', 'project'].includes(query.get('level'))) destination.searchParams.set('level', query.get('level'));
    if (['light', 'balanced', 'deep'].includes(query.get('pace'))) destination.searchParams.set('pace', query.get('pace'));
    if (query.get('program') === 'unity' && destination.searchParams.get('project') === 'game') {
      destination.searchParams.set('program','unity');
      destination.searchParams.set('mode','learn');
      link.textContent = 'Собрать план моей игры в Unity →';
    }
    link.href = destination.pathname + destination.search;
  });
})();
