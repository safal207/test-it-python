/* Run in <head> so a saved theme is applied before the first paint. */
(() => {
  'use strict';
  const key = 'ai-path-theme';
  const themes = ['light', 'dark', 'matrix'];
  const root = document.documentElement;
  const valid = value => themes.includes(value) ? value : 'light';
  const saved = () => {
    try { return valid(localStorage.getItem(key)); } catch { return 'light'; }
  };
  const apply = value => {
    const theme = valid(value);
    root.dataset.theme = theme;
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
    document.querySelectorAll('.brand-lockup, .brand-footer-logo').forEach(image => {
      const current = image.getAttribute('src');
      const next = current.replace(/ai-path-logo(?:-dark)?\.svg$/, theme === 'light' ? 'ai-path-logo.svg' : 'ai-path-logo-dark.svg');
      if (current !== next) image.setAttribute('src', next);
    });
  };
  apply(saved());
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.addEventListener('click', () => {
        const theme = valid(button.dataset.themeChoice);
        apply(theme);
        try { localStorage.setItem(key, theme); } catch { /* Still usable with storage blocked. */ }
      });
    });
  }, { once: true });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(saved());
  });
  // A page restored from the back/forward cache may hold an older theme.
  window.addEventListener('pageshow', event => { if (event.persisted) apply(saved()); });
})();
