'use strict';

(function setupRouteEntry(){
  const allowed = new Set(['home','contests','custom','practice','playground','submissions','profile','admin','scoreboards']);
  const params = new URLSearchParams(window.location.search);
  let view = String(params.get('view') || '').trim().toLowerCase();

  if(!view){
    const path = window.location.pathname.split('/').pop().replace(/\.html$/, '');
    if(allowed.has(path)) view = path;
  }

  if(!allowed.has(view)) return;
  window.__BESQL_ENTRY_VIEW = view;
})();

