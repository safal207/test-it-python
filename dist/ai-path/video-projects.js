/* Load one privacy-enhanced YouTube player only after an explicit play action. */
(() => {
  'use strict';
  const players = [...document.querySelectorAll('[data-video-player]')];

  function stop(player, returnFocus = false) {
    player.querySelector('iframe')?.remove();
    player.querySelector('.video-project-poster').hidden = false;
    player.querySelector('[data-video-stop]').hidden = true;
    if (returnFocus) player.querySelector('[data-video-play]').focus();
  }

  players.forEach(player => {
    const play = player.querySelector('[data-video-play]');
    const close = player.querySelector('[data-video-stop]');
    const id = player.dataset.videoId;
    if (!play || !close || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    play.hidden = false;
    play.addEventListener('click', () => {
      players.forEach(other => stop(other));
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.title = player.dataset.videoTitle;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allowFullscreen = true;
      player.querySelector('.video-project-poster').hidden = true;
      close.hidden = false;
      player.append(frame);
      close.focus({ preventScroll: true });
    });
    close.addEventListener('click', () => stop(player, true));
    player.addEventListener('keydown', event => {
      if (event.key === 'Escape' && player.querySelector('iframe')) {
        event.preventDefault();
        stop(player, true);
      }
    });
  });
  window.addEventListener('pagehide', () => players.forEach(player => stop(player)));
})();
