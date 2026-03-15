/**
 * workspace.js — BeSQL SQL IDE workspace.
 *
 * Responsibilities:
 *  - Bootstrap Monaco Editor
 *  - Load the problem (slug from ?problem=… URL param)
 *  - Handle Run (ad-hoc execution) and Submit (graded) buttons
 *  - Render results / errors in the console pane
 *  - JWT auth state management (localStorage)
 *  - Drag-to-resize left / right and editor / console panes
 */
'use strict';

/* ── Configuration ────────────────────────────────────────────────────── */
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : '/api';

const LS_TOKEN_KEY = 'besql_access_token';
const LS_USER_KEY  = 'besql_user';

/* ── State ─────────────────────────────────────────────────────────────── */
let monacoEditor = null;
let currentProblemSlug = null;
let authMode = 'login';   // 'login' | 'register'

/* ════════════════════════════════════════════════════════════════════════
   1. BOOTSTRAP
══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initMonaco(() => {
    const slug = new URLSearchParams(window.location.search).get('problem');
    if (slug) loadProblem(slug);
    else showPlaceholderProblem();
  });
  initResizablePanes();
});

/* ════════════════════════════════════════════════════════════════════════
   2. MONACO EDITOR
══════════════════════════════════════════════════════════════════════════ */
function initMonaco(callback) {
  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs' } });
  require(['vs/editor/editor.main'], () => {
    monacoEditor = monaco.editor.create(document.getElementById('editor-container'), {
      value: '-- Write your SQL query here\n-- Ctrl+Enter to run\n',
      language: 'sql',
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      suggestOnTriggerCharacters: true,
      tabSize: 2,
      padding: { top: 12, bottom: 12 },
      automaticLayout: true,
    });

    // Ctrl+Enter → Run
    monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runQuery);

    // Ctrl+Shift+Enter → Submit
    monacoEditor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      submitQuery,
    );

    if (callback) callback();
  });
}

/* ════════════════════════════════════════════════════════════════════════
   3. PROBLEM LOADING
══════════════════════════════════════════════════════════════════════════ */
async function loadProblem(slug) {
  currentProblemSlug = slug;

  try {
    const resp = await apiFetch(`/api/problems/${slug}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const problem = await resp.json();
    renderProblem(problem);
    loadMySubmissions(slug);
  } catch (err) {
    document.getElementById('problem-description').innerHTML =
      `<p class="text-error">Failed to load problem: ${esc(err.message)}</p>`;
  }
}

function renderProblem(problem) {
  document.title = `BeSQL — ${problem.title}`;
  document.getElementById('problem-title').textContent = problem.title;

  const badge = document.getElementById('difficulty-badge');
  badge.textContent = problem.difficulty;
  badge.className = 'text-xs px-2 py-0.5 rounded-full font-semibold ' +
    { Easy: 'diff-easy', Medium: 'diff-medium', Hard: 'diff-hard' }[problem.difficulty];
  badge.classList.remove('hidden');

  // Render description — convert newlines and basic Markdown-like syntax
  const desc = document.getElementById('problem-description');
  desc.innerHTML = renderMarkdown(problem.description);

  // Schema tab
  const schemaPre = document.getElementById('schema-content');
  schemaPre.textContent = problem.schema_diagram || '-- No schema diagram provided.';
}

function showPlaceholderProblem() {
  document.getElementById('problem-title').textContent = 'No problem selected';
  document.getElementById('problem-description').innerHTML =
    '<p class="text-gray-500">Open a problem from the <a href="index.html" class="text-accent hover:underline">dashboard</a> to start coding.</p>';
}

/* ════════════════════════════════════════════════════════════════════════
   4. RUN (ad-hoc, not graded)
══════════════════════════════════════════════════════════════════════════ */
async function runQuery() {
  if (!requireAuth()) return;
  if (!currentProblemSlug) return showConsoleMessage('⚠ No problem loaded.', 'warning');

  const query = monacoEditor ? monacoEditor.getValue() : '';
  if (!query.trim()) return showConsoleMessage('⚠ Please enter a SQL query.', 'warning');

  setButtonsLoading(true);
  showConsoleMessage('⏳ Running…', 'info');

  try {
    const resp = await apiFetch('/api/submissions/execute', {
      method: 'POST',
      body: JSON.stringify({ problem_slug: currentProblemSlug, query }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      showConsoleMessage(`❌ ${data.detail || 'Server error'}`, 'error');
      return;
    }

    if (data.error) {
      showConsoleError(data.error, data.execution_ms);
    } else {
      showResultTable(data.columns, data.rows, data.execution_ms);
    }
  } catch (err) {
    showConsoleMessage(`❌ Network error: ${esc(err.message)}`, 'error');
  } finally {
    setButtonsLoading(false);
  }
}

/* ════════════════════════════════════════════════════════════════════════
   5. SUBMIT (graded)
══════════════════════════════════════════════════════════════════════════ */
async function submitQuery() {
  if (!requireAuth()) return;
  if (!currentProblemSlug) return showConsoleMessage('⚠ No problem loaded.', 'warning');

  const query = monacoEditor ? monacoEditor.getValue() : '';
  if (!query.trim()) return showConsoleMessage('⚠ Please enter a SQL query.', 'warning');

  setButtonsLoading(true);
  showConsoleMessage('⏳ Submitting…', 'info');

  try {
    const resp = await apiFetch('/api/submissions', {
      method: 'POST',
      body: JSON.stringify({ problem_slug: currentProblemSlug, query }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      showConsoleMessage(`❌ ${data.detail || 'Server error'}`, 'error');
      return;
    }

    renderVerdict(data);
    loadMySubmissions(currentProblemSlug);
  } catch (err) {
    showConsoleMessage(`❌ Network error: ${esc(err.message)}`, 'error');
  } finally {
    setButtonsLoading(false);
  }
}

/* ════════════════════════════════════════════════════════════════════════
   6. CONSOLE RENDERING
══════════════════════════════════════════════════════════════════════════ */
function clearConsole() {
  document.getElementById('console-content').innerHTML =
    '<p class="text-gray-600 select-none">— Console cleared —</p>';
  const badge = document.getElementById('verdict-badge');
  badge.classList.add('hidden');
  document.getElementById('exec-time').classList.add('hidden');
}

function showConsoleMessage(msg, type = 'info') {
  const colours = { info: 'text-gray-400', warning: 'text-warning', error: 'text-error' };
  document.getElementById('console-content').innerHTML =
    `<p class="${colours[type] || 'text-gray-400'}">${esc(msg)}</p>`;
}

function showConsoleError(pgError, execMs) {
  setExecTime(execMs);
  document.getElementById('console-content').innerHTML =
    `<pre class="text-error whitespace-pre-wrap">${esc(pgError)}</pre>`;
}

function showResultTable(columns, rows, execMs) {
  setExecTime(execMs);

  if (!columns.length) {
    document.getElementById('console-content').innerHTML =
      '<p class="text-gray-500">Query executed successfully. No rows returned.</p>';
    return;
  }

  const headerCells = columns.map(c => `<th class="px-3 py-1.5 text-left text-gray-400 font-semibold whitespace-nowrap">${esc(c)}</th>`).join('');
  const bodyRows = rows.map(row => {
    const cells = row.map(v => `<td class="px-3 py-1 text-gray-300 whitespace-nowrap border-t border-surface-border">${v === null ? '<span class="text-gray-600 italic">NULL</span>' : esc(String(v))}</td>`).join('');
    return `<tr class="hover:bg-surface/60">${cells}</tr>`;
  }).join('');

  document.getElementById('console-content').innerHTML = `
    <div class="overflow-auto max-h-full">
      <table class="min-w-full text-xs font-mono border-separate border-spacing-0">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <p class="text-gray-600 mt-2 px-1">${rows.length} row${rows.length !== 1 ? 's' : ''} returned</p>
    </div>`;
}

function renderVerdict(data) {
  const { verdict, columns, rows, error, execution_ms: execMs } = data;

  const badge = document.getElementById('verdict-badge');
  badge.classList.remove('hidden', 'badge-accepted', 'badge-wrong', 'badge-error', 'badge-pending');

  if (verdict === 'Accepted') {
    badge.textContent = '✓ Accepted';
    badge.classList.add('badge-accepted');
  } else if (verdict === 'WrongAnswer') {
    badge.textContent = '✗ Wrong Answer';
    badge.classList.add('badge-wrong');
  } else if (verdict === 'RuntimeError') {
    badge.textContent = '⚡ Runtime Error';
    badge.classList.add('badge-error');
  } else {
    badge.textContent = verdict;
    badge.classList.add('badge-pending');
  }

  if (error) {
    showConsoleError(error, execMs);
  } else {
    showResultTable(columns, rows, execMs);
  }
}

function setExecTime(ms) {
  const el = document.getElementById('exec-time');
  el.textContent = `${ms} ms`;
  el.classList.remove('hidden');
}

/* ════════════════════════════════════════════════════════════════════════
   7. MY SUBMISSIONS TAB
══════════════════════════════════════════════════════════════════════════ */
async function loadMySubmissions(slug) {
  const token = localStorage.getItem(LS_TOKEN_KEY);
  if (!token) return;

  try {
    const resp = await apiFetch('/api/submissions/history');
    if (!resp.ok) return;
    const history = await resp.json();

    const forThisProblem = history.filter(s => s.problem_slug === slug);
    const list = document.getElementById('my-submissions-list');

    if (!forThisProblem.length) {
      list.innerHTML = '<p class="text-gray-500 p-2">No submissions yet for this problem.</p>';
      return;
    }

    list.innerHTML = forThisProblem.map(s => {
      const cls = s.status === 'Accepted' ? 'text-success' : s.status === 'WrongAnswer' ? 'text-error' : 'text-warning';
      const date = new Date(s.submitted_at).toLocaleString();
      return `<div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-border/40">
        <span class="${cls} font-semibold">${esc(s.status)}</span>
        <span class="text-gray-500">${esc(date)}</span>
      </div>`;
    }).join('');
  } catch {
    // silently ignore
  }
}

/* ════════════════════════════════════════════════════════════════════════
   8. TAB SWITCHING
══════════════════════════════════════════════════════════════════════════ */
function switchTab(name, btn) {
  ['description', 'schema', 'submissions'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
  });
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active-tab', 'text-accent', 'border-b-2', 'border-accent');
    b.classList.add('text-gray-500', 'hover:text-gray-300');
  });

  document.getElementById(`tab-${name}`).classList.remove('hidden');
  btn.classList.remove('text-gray-500', 'hover:text-gray-300');
  btn.classList.add('text-accent', 'border-b-2', 'border-accent');
}

/* ════════════════════════════════════════════════════════════════════════
   9. AUTH
══════════════════════════════════════════════════════════════════════════ */
function initAuth() {
  const token = localStorage.getItem(LS_TOKEN_KEY);
  const user  = JSON.parse(localStorage.getItem(LS_USER_KEY) || 'null');
  if (token && user) {
    document.getElementById('username-display').textContent = user.username;
    document.getElementById('username-display').classList.remove('hidden');
    document.getElementById('logout-btn').classList.remove('hidden');
    document.getElementById('login-link').classList.add('hidden');
  }
}

function requireAuth() {
  const token = localStorage.getItem(LS_TOKEN_KEY);
  if (!token) {
    openAuthModal();
    return false;
  }
  return true;
}

function openAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function showAuthForm(mode) {
  authMode = mode;
  const regFields = document.getElementById('register-fields');
  const tabs = document.querySelectorAll('.auth-tab-btn');

  if (mode === 'register') {
    regFields.classList.remove('hidden');
  } else {
    regFields.classList.add('hidden');
  }

  tabs.forEach(t => {
    t.classList.remove('text-accent', 'border-b-2', 'border-accent');
    t.classList.add('text-gray-500');
  });
  event.target.classList.remove('text-gray-500');
  event.target.classList.add('text-accent', 'border-b-2', 'border-accent');
}

async function handleAuth(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const errEl = document.getElementById('auth-error');
  errEl.classList.add('hidden');

  const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

  let body;
  if (authMode === 'login') {
    // OAuth2PasswordRequestForm expects form-encoded data
    const params = new URLSearchParams();
    params.append('username', data.username);
    params.append('password', data.password);
    body = params;
  } else {
    body = JSON.stringify({ username: data.username, email: data.email, password: data.password });
  }

  try {
    const resp = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: authMode === 'login' ? {} : { 'Content-Type': 'application/json' },
      body,
    });
    const result = await resp.json();

    if (!resp.ok) {
      errEl.textContent = result.detail || 'Authentication failed';
      errEl.classList.remove('hidden');
      return;
    }

    localStorage.setItem(LS_TOKEN_KEY, result.access_token);

    // Fetch user info
    const meResp = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${result.access_token}` },
    });
    if (meResp.ok) {
      const user = await meResp.json();
      localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
      document.getElementById('username-display').textContent = user.username;
      document.getElementById('username-display').classList.remove('hidden');
      document.getElementById('logout-btn').classList.remove('hidden');
      document.getElementById('login-link').classList.add('hidden');
    }

    closeAuthModal();
  } catch (err) {
    errEl.textContent = `Network error: ${err.message}`;
    errEl.classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem(LS_TOKEN_KEY);
  localStorage.removeItem(LS_USER_KEY);
  window.location.reload();
}

/* ════════════════════════════════════════════════════════════════════════
   10. API HELPER
══════════════════════════════════════════════════════════════════════════ */
function apiFetch(path, options = {}) {
  const token = localStorage.getItem(LS_TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

/* ════════════════════════════════════════════════════════════════════════
   11. RESIZABLE PANES
══════════════════════════════════════════════════════════════════════════ */
function initResizablePanes() {
  // Horizontal (left vs right)
  const divider  = document.getElementById('pane-divider');
  const leftPane = document.getElementById('left-pane');
  const workspace = document.getElementById('workspace');

  let dragging = false;
  divider.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    const pct  = Math.min(Math.max((e.clientX - rect.left) / rect.width * 100, 20), 65);
    leftPane.style.width = `${pct}%`;
  });

  document.addEventListener('mouseup', () => { dragging = false; });

  // Vertical (editor vs console)
  const vDivider    = document.getElementById('vertical-divider');
  const editorCont  = document.getElementById('editor-container');
  const consolePan  = document.getElementById('console-pane');
  const rightPane   = editorCont.closest('section');

  let vDragging = false;
  vDivider.addEventListener('mousedown', e => { vDragging = true; e.preventDefault(); });

  document.addEventListener('mousemove', e => {
    if (!vDragging) return;
    const rect    = rightPane.getBoundingClientRect();
    const fromTop = e.clientY - rect.top;
    const total   = rect.height;
    const consoleH = Math.min(Math.max(total - fromTop, 60), total - 100);
    consolePan.style.height = `${consoleH}px`;
  });

  document.addEventListener('mouseup', () => { vDragging = false; });
}

/* ════════════════════════════════════════════════════════════════════════
   12. UTILITIES
══════════════════════════════════════════════════════════════════════════ */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Very basic Markdown→HTML for problem descriptions */
function renderMarkdown(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-gray-200 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-base font-semibold text-gray-100 mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="text-lg font-bold text-white mt-4 mb-2">$1</h1>')
    .replace(/`([^`]+)`/g,   '<code class="font-mono text-xs bg-surface px-1 py-0.5 rounded text-accent">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-100">$1</strong>')
    .replace(/\*(.+?)\*/g,   '<em>$1</em>')
    .replace(/\n/g,           '<br />');
}

function setButtonsLoading(loading) {
  const runBtn    = document.getElementById('run-btn');
  const submitBtn = document.getElementById('submit-btn');
  runBtn.disabled    = loading;
  submitBtn.disabled = loading;
  runBtn.textContent    = loading ? '⏳ Running…' : '▶ Run';
  submitBtn.textContent = loading ? '⏳ Grading…' : 'Submit';
}
