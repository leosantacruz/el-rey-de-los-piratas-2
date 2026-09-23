'use strict';

(() => {
  const s = document.createElement('script');
  s.src = NET.lib;
  s.async = true;
  s.onload = () => {
    const pusher = new Pusher(NET.key, { cluster: NET.cluster });
    pusher.subscribe(NET.channel).bind(NET.event, () => window.__game.key());
  };
  s.onerror = () => console.warn('Remote control unavailable: pusher-js failed to load');
  document.head.appendChild(s);
})();
