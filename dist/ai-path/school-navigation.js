/* A native disclosure keeps every school section reachable on small screens. */
(() => {
  'use strict';
  const toggle = document.getElementById('schoolMenuToggle');
  const menu = document.getElementById('schoolMenu');
  if (!toggle || !menu) return;
  const compact = window.matchMedia('(max-width: 1100px)');
  const close = (returnFocus = false) => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  };
  const sync = () => {
    const wasInside = menu.contains(document.activeElement) || document.activeElement === toggle;
    close();
    toggle.hidden = !compact.matches;
    if (!compact.matches && wasInside) document.querySelector('.logo')?.focus();
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      close(true);
    }
  });
  menu.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    close();
    const href = link.getAttribute('href');
    if (href?.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }
  });
  document.addEventListener('click', event => {
    if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) close();
  });
  compact.addEventListener('change', sync);
  sync();
})();
