'use strict';

const NET = (() => {
  const raw = (new URLSearchParams(location.search).get('sala') || '').toLowerCase();
  const room = /^[a-z0-9-]{1,32}$/.test(raw) ? raw : 'principal';
  return {
    key: '860c508875e6978caa63',
    cluster: 'us2',
    room,
    channel: 'rey-piratas-' + room,
    event: 'press',
    lib: 'https://cdn.jsdelivr.net/npm/pusher-js@8.4.0/dist/web/pusher.min.js',
  };
})();
