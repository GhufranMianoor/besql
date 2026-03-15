/**
 * ui.js — Shared UI utilities: DOM helpers, toasts, modals,
 *          theme toggle, formatters, escaping.
 */
'use strict';

/* ── DOM shortcuts ─────────────────────────────────────── */
const el   = id  => document.getElementById(id);
const esc  = s   => { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; };
const show = id  => { const e = typeof id === 'string' ? el(id) : id; if (e) e.classList.remove('hidden'); };
const hide = id  => { const e = typeof id === 'string' ? el(id) : id; if (e) e.classList.add('hidden'); };
const tog  = (id, cond) => cond ? show(id) : hide(id);

/* ── Modal helpers ─────────────────────────────────────── */
function openModal(id)  { show(id); }
function closeModal(id) { hide(id); }

/* ── Toast notifications ───────────────────────────────── */
/**
 * @param {string} msg
 * @param {'success'|'error'|'warn'|'info'} type
 */
function toast(msg, type = 'info') {
  const t = document.createElement('div');
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warn' ? '⚠' : 'ℹ';
  const cls  = type === 'success' ? 't-ok' : type === 'error' ? 't-err' : type === 'warn' ? 't-warn' : 't-inf';
  t.className = `toast ${cls}`;
  t.innerHTML = `<span>${icon}</span><span>${esc(msg)}</span>`;
  el('toasts').appendChild(t);
  setTimeout(() => t.remove(), CONFIG.TOAST_DURATION_MS);
}

/* ── Theme ─────────────────────────────────────────────── */
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  LS.set('theme', isLight ? 'light' : 'dark');
}

function applyStoredTheme() {
  if (LS.get('theme') === 'light') document.body.classList.add('light');
}

/* ── Formatters ────────────────────────────────────────── */
const fmtN    = n  => Number(n).toLocaleString();
const fmtT    = s  => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const fmtDate = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtDur  = ms => { const m = Math.floor(ms / 60000); const h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };

/* ── Misc helpers ───────────────────────────────────────── */
const genId      = ()  => Math.random().toString(36).slice(2, 10);
const diffCls    = d   => d === 'Easy' ? 'diff-easy' : d === 'Medium' ? 'diff-med' : d === 'Hard' ? 'diff-hard' : 'diff-expert';
const roleBadge  = r   => `<span class="role-badge rb-${r}">${r}</span>`;
const canCreate  = ()  => S.user && (S.user.role === 'admin' || S.user.role === 'master');
const isAdmin    = ()  => S.user?.role === 'admin';
const isMaster   = ()  => S.user?.role === 'admin' || S.user?.role === 'master';
const getSolvedIds = () => new Set(S.submissions.filter(s => s.verdict === 'AC').map(s => s.problemId));

/* ── Result table renderer ─────────────────────────────── */
/**
 * Render a SQL result set into an HTML string.
 * @param {{ columns: string[], rows: any[][], rowCount: number, error?: string }} result
 */
function renderResultTable(result) {
  if (result.error) {
    return `<div style="padding:14px 16px;font-family:var(--mono);font-size:12px;color:var(--rose)">⚠ ${esc(result.error)}</div>`;
  }
  if (!result.columns || !result.columns.length) {
    return `<div style="padding:14px 16px;color:var(--t3);font-size:12px">Query returned 0 rows.</div>`;
  }

  const ths = result.columns.map(c => `<th>${esc(c)}</th>`).join('');
  const trs = result.rows.map(row =>
    `<tr>${row.map(cell =>
      cell == null
        ? '<td><span class="tbl-null">NULL</span></td>'
        : `<td>${esc(cell)}</td>`
    ).join('')}</tr>`
  ).join('');

  return `
    <div class="res-panel">
      <div class="res-hdr">
        <span style="color:var(--t2)">RESULT</span>
        <span style="color:var(--t3)">${result.rowCount} row${result.rowCount !== 1 ? 's' : ''}</span>
      </div>
      <div class="res-body tw">
        <table class="tbl"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
      </div>
    </div>`;
}
