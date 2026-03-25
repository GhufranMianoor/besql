'use strict';

(function setupRouteEntry(){
  const allowed = new Set(['home','contests','custom','practice','playground','submissions','profile','admin','scoreboards']);
  const params = new URLSearchParams(window.location.search);
  const view = String(params.get('view') || '').trim().toLowerCase();
  if(!allowed.has(view)) return;
  window.__BESQL_ENTRY_VIEW = view;
})();
