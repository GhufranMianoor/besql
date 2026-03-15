/**
 * router.js — Client-side navigation controller.
 *
 * Provides a single `nav(view, extra)` entry point that:
 *  1. Closes the mobile sidebar if open.
 *  2. Hides all views and highlights the correct nav items.
 *  3. Shows the target view and calls its render function.
 */
'use strict';

function nav(view, extra) {
  // ── Close mobile sidebar ────────────────────────────────
  const _sb = el('sidebar'), _bd = el('sb-backdrop'), _hb = el('ham-btn');
  if (_sb) _sb.classList.remove('open');
  if (_bd) _bd.classList.remove('show');
  if (_hb) _hb.classList.remove('open');

  // ── Bottom nav highlight ────────────────────────────────
  document.querySelectorAll('#bottom-nav .bnav').forEach(b =>
    b.classList.toggle('on', b.dataset.bnav === view)
  );

  // ── Hide all views + clear all active nav markers ───────
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.tnav, .slink').forEach(b => b.classList.remove('on'));

  // ── Show target view ────────────────────────────────────
  const v = el(`view-${view}`);
  if (v) v.classList.remove('hidden');

  // ── Highlight nav items that match the current view ─────
  document.querySelectorAll(`[data-view="${view}"]`).forEach(b => b.classList.add('on'));

  S.currentView = view;

  // ── Delegate to view renderers ──────────────────────────
  if (view === 'home')           renderHome();
  if (view === 'contests')       renderContests();
  if (view === 'practice')       renderPractice();
  if (view === 'submissions')    renderSubmissions();
  if (view === 'profile')        renderProfile();
  if (view === 'custom')         renderCustom();
  if (view === 'admin') {
    if (!isMaster()) { nav('home'); toast('Access denied', 'error'); return; }
    renderAdmin();
  }
  if (view === 'contest-detail') renderContestDetail(extra);
  if (view === 'judge')          renderJudge(extra);
}

/** Toggle the mobile sidebar open/closed. */
function toggleSidebar() {
  const sb  = el('sidebar');
  const bd  = el('sb-backdrop');
  const hb  = el('ham-btn');
  const open = sb.classList.toggle('open');
  if (bd) bd.classList.toggle('show', open);
  if (hb) hb.classList.toggle('open', open);
}

/** Wire all static [data-view] buttons to the nav function. */
function initNavListeners() {
  document.querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', () => nav(b.dataset.view))
  );
}
