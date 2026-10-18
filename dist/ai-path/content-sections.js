/* Keep optional content compact while preserving public fragment links. */
(function () {
  'use strict';

  function reveal(hash, scroll) {
    var id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (_) { return; }
    var target = document.getElementById(id);
    if (!target) return;
    var details = target.closest('details');
    while (details) {
      details.open = true;
      details = details.parentElement.closest('details');
    }
    if (scroll) {
      if (target.hasAttribute('tabindex')) target.focus({preventScroll: true});
      target.scrollIntoView({block: 'start', behavior: 'instant'});
    }
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    var url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && url.hash) {
      // Open before the browser performs its native fragment navigation and focus.
      reveal(url.hash, false);
      if (url.hash === location.hash) reveal(url.hash, true);
    }
  });
  window.addEventListener('hashchange', function () { reveal(location.hash, true); });
  document.addEventListener('DOMContentLoaded', function () { reveal(location.hash, true); });
})();
