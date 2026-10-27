/* Carry the chosen study plan between local course pages without storing it. */
(function () {
  'use strict';

  var script = document.currentScript;
  var root = new URL('.', script && script.src || window.location.href);
  var programs = ['explore', 'build', 'space', 'furniture', 'create', 'comics', 'qa', 'game', 'ml', 'hack', 'grant', 'frontier', 'books', 'designlab', 'vibe', 'ml-python', 'ml-data', 'ml-vision', 'ml-text', 'ml-audio', 'ml-series', 'ml-tuning', 'career'];
  var levels = ['zero', 'basic', 'project'];
  var paces = ['light', 'balanced', 'deep'];
  var originals = new WeakMap();

  function validated(selection) {
    if (!selection || programs.indexOf(selection.program) === -1) return null;
    return {
      program: selection.program,
      level: levels.indexOf(selection.level) === -1 ? 'zero' : selection.level,
      pace: paces.indexOf(selection.pace) === -1 ? 'balanced' : selection.pace
    };
  }

  var query = new URLSearchParams(window.location.search);
  var current = validated({ program: query.get('program'), level: query.get('level'), pace: query.get('pace') });

  function refresh(selection) {
    current = validated(selection);
    document.querySelectorAll('a[href]').forEach(function (link) {
      var original = originals.has(link) ? originals.get(link) : link.getAttribute('href');
      if (!current) {
        if (originals.has(link)) link.setAttribute('href', original);
        return;
      }
      if (!original || original.trim().charAt(0) === '#' || link.hasAttribute('download') || link.hasAttribute('data-navigation-manual')) return;
      var destination;
      try { destination = new URL(original, window.location.href); } catch (_) { return; }
      if (destination.origin !== root.origin) return;
      var inCourse = destination.pathname === root.pathname.slice(0, -1) || destination.pathname.indexOf(root.pathname) === 0;
      var page = destination.pathname.endsWith('/') || /\.html$/i.test(destination.pathname) || destination.pathname === root.pathname.slice(0, -1);
      if (!inCourse || !page) return;
      var target = destination.searchParams.get('program');
      if (target !== null && programs.indexOf(target) === -1) return;
      if (!originals.has(link)) originals.set(link, original);
      destination.searchParams.set('program', target || current.program);
      destination.searchParams.set('level', current.level);
      destination.searchParams.set('pace', current.pace);
      link.setAttribute('href', destination.pathname + destination.search + destination.hash);
    });
  }

  window.AIPathNavigation = { refresh: refresh };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { refresh(current); });
  } else {
    refresh(current);
  }
})();
