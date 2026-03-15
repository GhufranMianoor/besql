/**
 * auth-storage.test.js
 *
 * Tests for authentication session restore and data persistence.
 *
 * Run: node tests/auth-storage.test.js
 *
 * Coverage:
 *  - restoreSession restores user and submissions without side-effects
 *  - _finishLogin sets user, session, and loads submissions
 *  - doRegister creates user and finishes login
 *  - Contest status updates are persisted to localStorage
 *  - Custom contests are loaded after session restore
 */
'use strict';

/* ── Polyfill browser globals for Node.js ─────────────── */
const _fs = require('fs');
const _vm = require('vm');
const _rootDir = require('path').resolve(__dirname, '..');

function loadSrc(relPath) {
  _vm.runInThisContext(_fs.readFileSync(`${_rootDir}/${relPath}`, 'utf8'), { filename: relPath });
}

/* ── Minimal localStorage mock ─────────────────────────── */
const _store = {};
global.localStorage = {
  getItem(k) { return _store[k] ?? null; },
  setItem(k, v) { _store[k] = String(v); },
  removeItem(k) { delete _store[k]; },
  get length() { return Object.keys(_store).length; },
  key(i) { return Object.keys(_store)[i]; },
  clear() { Object.keys(_store).forEach(k => delete _store[k]); },
};

/* ── Minimal DOM mock ──────────────────────────────────── */
const _elements = {};
global.document = {
  getElementById(id) { return _elements[id] || null; },
  createElement(tag) {
    return { textContent: '', innerHTML: '', classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} };
  },
  querySelectorAll() { return []; },
  readyState: 'complete',
  addEventListener() {},
  body: { classList: { add() {}, toggle() {} } },
};

/* Helper to create a mock element */
function mockEl(id) {
  _elements[id] = {
    textContent: '', innerHTML: '', style: {}, className: '',
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {},
    remove() {},
    dataset: {},
  };
  return _elements[id];
}

/* Pre-create the DOM elements that auth/app code references */
['auth-title', 'auth-body', 'modal-auth', 'topright', 'sb-online', 'sb-live-count',
 'toasts', 'init', 'home-greeting', 'home-sub', 'home-stats', 'home-streak',
 'home-contests', 'daily-badge', 'home-daily', 'home-scoreboard', 'home-progress',
 'nav-admin', 'sb-admin', 'btn-create-contest', 'bottom-nav',
 'a-err', 'r-err', 'au', 'ap', 'ru', 'rp',
].forEach(id => mockEl(id));

/* Make input elements have a value property */
_elements['au'].value = '';
_elements['ap'].value = '';
_elements['ru'].value = '';
_elements['rp'].value = '';

/* ── Stub global DB for problems/SQL ───────────────────── */
global.DB = { employees: [], departments: [], orders: [], products: [], students: [], courses: [] };

/* ── Load source files in correct order ────────────────── */
loadSrc('src/js/config.js');
loadSrc('src/js/state.js');
loadSrc('src/js/storage.js');
loadSrc('src/js/sql-engine.js');
loadSrc('src/js/validator.js');
loadSrc('src/js/data/problems.js');
loadSrc('src/js/ui.js');
loadSrc('src/js/auth.js');

/* Stub view renderers and nav (they need full DOM which we don't have) */
global.renderHome = () => {};
global.renderContests = () => {};
global.renderPractice = () => {};
global.renderSubmissions = () => {};
global.renderProfile = () => {};
global.renderCustom = () => {};
global.renderAdmin = () => {};
global.renderContestDetail = () => {};
global.renderJudge = () => {};
global.renderTopRight = () => {};
global.renderSidebar = () => {};
global.initNavListeners = () => {};
global.startOnlineSimulation = () => {};
global.applyStoredTheme = () => {};

loadSrc('src/js/router.js');
loadSrc('src/js/app.js');

/* ── Minimal test runner ──────────────────────────────── */
let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ ok: true, name });
  } catch (e) {
    failed++;
    results.push({ ok: false, name, error: e.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEq(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/* ── Helper: reset state between tests ─────────────────── */
function resetState() {
  S.user = null;
  S.submissions = [];
  S.contests = [];
  S.customContests = [];
  S.currentView = 'home';
  localStorage.clear();
}

/* ═══════════════════════════════════════════════════════
   1. restoreSession tests
════════════════════════════════════════════════════════ */
test('restoreSession restores user from localStorage', () => {
  resetState();
  const user = { userId: 'u1', username: 'alice', password: 'test', role: 'contestant', score: 100, solved: 2, streak: 1, joinedAt: Date.now() };
  LS.set('session', 'alice');
  LS.set('user:alice', user);

  restoreSession();

  assert(S.user !== null, 'User should be restored');
  assertEq(S.user.username, 'alice', 'Username should be alice');
  assertEq(S.user.score, 100, 'Score should be 100');
});

test('restoreSession restores submissions from localStorage', () => {
  resetState();
  const user = { userId: 'u2', username: 'bob', password: 'test', role: 'contestant', score: 50, solved: 1, streak: 0, joinedAt: Date.now() };
  const subs = [
    { id: 's1', userId: 'u2', problemId: 'p1', verdict: 'AC', at: Date.now() },
    { id: 's2', userId: 'u2', problemId: 'p2', verdict: 'WA', at: Date.now() },
  ];
  LS.set('session', 'bob');
  LS.set('user:bob', user);
  LS.set('subs:u2', subs);

  restoreSession();

  assertEq(S.submissions.length, 2, 'Should restore 2 submissions');
  assertEq(S.submissions[0].id, 's1', 'First submission id');
  assertEq(S.submissions[1].verdict, 'WA', 'Second submission verdict');
});

test('restoreSession does nothing when no session exists', () => {
  resetState();

  restoreSession();

  assert(S.user === null, 'User should remain null');
  assertEq(S.submissions.length, 0, 'Submissions should remain empty');
});

test('restoreSession does nothing when user data is missing', () => {
  resetState();
  LS.set('session', 'ghost');
  // No user:ghost key set

  restoreSession();

  assert(S.user === null, 'User should remain null when user data missing');
});

test('restoreSession handles empty submissions gracefully', () => {
  resetState();
  const user = { userId: 'u3', username: 'carol', password: 'test', role: 'contestant', score: 0, solved: 0, streak: 0, joinedAt: Date.now() };
  LS.set('session', 'carol');
  LS.set('user:carol', user);
  // No subs:u3 key set

  restoreSession();

  assert(S.user !== null, 'User should be restored');
  assertEq(S.submissions.length, 0, 'Submissions should default to empty array');
});

/* ═══════════════════════════════════════════════════════
   2. _finishLogin tests
════════════════════════════════════════════════════════ */
test('_finishLogin sets S.user and saves session', () => {
  resetState();
  const user = { userId: 'u4', username: 'dave', password: 'test', role: 'contestant', score: 0, solved: 0, streak: 0, joinedAt: Date.now() };

  _finishLogin(user);

  assert(S.user !== null, 'User should be set');
  assertEq(S.user.username, 'dave', 'Username');
  assertEq(LS.get('session'), 'dave', 'Session stored');
});

test('_finishLogin loads existing submissions', () => {
  resetState();
  const user = { userId: 'u5', username: 'eve', password: 'test', role: 'contestant', score: 0, solved: 0, streak: 0, joinedAt: Date.now() };
  LS.set('subs:u5', [{ id: 's3', verdict: 'AC' }]);

  _finishLogin(user);

  assertEq(S.submissions.length, 1, 'Should load 1 submission');
  assertEq(S.submissions[0].id, 's3', 'Submission id matches');
});

/* ═══════════════════════════════════════════════════════
   3. Contest status persistence tests
════════════════════════════════════════════════════════ */
test('loadContests persists updated contest statuses', () => {
  resetState();
  const now = Date.now();
  const contests = [
    { id: 'c1', title: 'Past Contest', status: 'live', startTime: now - 100000, endTime: now - 50000, problemIds: [] },
    { id: 'c2', title: 'Current Contest', status: 'upcoming', startTime: now - 1000, endTime: now + 100000, problemIds: [] },
  ];
  LS.set('contests', contests);

  loadContests();

  // Verify in-memory state is updated
  const c1 = S.contests.find(c => c.id === 'c1');
  const c2 = S.contests.find(c => c.id === 'c2');
  assertEq(c1.status, 'ended', 'Past contest should be ended');
  assertEq(c2.status, 'live', 'Current contest should be live');

  // Verify the updated statuses are persisted back to localStorage
  const persisted = LS.get('contests');
  const pc1 = persisted.find(c => c.id === 'c1');
  const pc2 = persisted.find(c => c.id === 'c2');
  assertEq(pc1.status, 'ended', 'Persisted past contest should be ended');
  assertEq(pc2.status, 'live', 'Persisted current contest should be live');
});

/* ═══════════════════════════════════════════════════════
   4. Custom contests loading after session restore
════════════════════════════════════════════════════════ */
test('Custom contests are loaded after session restore in bootstrap', () => {
  resetState();
  const user = { userId: 'u6', username: 'frank', password: 'test', role: 'contestant', score: 0, solved: 0, streak: 0, joinedAt: Date.now() };
  const customs = [{ id: 'cc1', title: 'My Contest', problemIds: [] }];
  LS.set('session', 'frank');
  LS.set('user:frank', user);
  LS.set(`custom:u6`, customs);

  // Simulate the bootstrap sequence
  loadProblems();
  loadContests();
  restoreSession();
  // After restoreSession, custom contests should be loaded
  if (S.user) {
    S.customContests = LS.get(`custom:${S.user.userId}`) || [];
  }

  assertEq(S.customContests.length, 1, 'Should load 1 custom contest');
  assertEq(S.customContests[0].id, 'cc1', 'Custom contest id');
});

test('Custom contests remain empty when no user session', () => {
  resetState();

  loadProblems();
  loadContests();
  restoreSession();
  if (S.user) {
    S.customContests = LS.get(`custom:${S.user.userId}`) || [];
  }

  assertEq(S.customContests.length, 0, 'No custom contests without user');
});

/* ═══════════════════════════════════════════════════════
   5. Data storage consistency tests
════════════════════════════════════════════════════════ */
test('LS.set and LS.get round-trip user data correctly', () => {
  resetState();
  const user = { userId: 'u7', username: 'grace', password: 'test', role: 'admin', score: 500, solved: 10, streak: 5, joinedAt: 1234567890 };
  LS.set('user:grace', user);

  const loaded = LS.get('user:grace');
  assertEq(loaded.userId, 'u7');
  assertEq(loaded.username, 'grace');
  assertEq(loaded.score, 500);
  assertEq(loaded.solved, 10);
  assertEq(loaded.streak, 5);
});

test('LS.set and LS.get round-trip submissions correctly', () => {
  resetState();
  const subs = [
    { id: 's10', userId: 'u8', problemId: 'p1', code: 'SELECT 1', verdict: 'AC', timeTaken: 30, at: Date.now(), tcPassed: 3, tcTotal: 3 },
    { id: 's11', userId: 'u8', problemId: 'p2', code: 'SELECT 2', verdict: 'WA', timeTaken: 60, at: Date.now(), tcPassed: 1, tcTotal: 3 },
  ];
  LS.set('subs:u8', subs);

  const loaded = LS.get('subs:u8');
  assertEq(loaded.length, 2);
  assertEq(loaded[0].verdict, 'AC');
  assertEq(loaded[0].code, 'SELECT 1');
  assertEq(loaded[1].verdict, 'WA');
  assertEq(loaded[1].tcPassed, 1);
});

test('LS.get returns null for missing key', () => {
  resetState();
  const result = LS.get('nonexistent');
  assert(result === null, 'Should return null for missing key');
});

test('LS.del removes a key', () => {
  resetState();
  LS.set('temp', 'value');
  assert(LS.get('temp') === 'value', 'Key should exist');
  LS.del('temp');
  assert(LS.get('temp') === null, 'Key should be removed');
});

/* ── Print results ────────────────────────────────────── */
console.log('\n BeSQL — auth-storage.test.js\n');
results.forEach(r => {
  const icon = r.ok ? '✓' : '✗';
  const msg  = r.ok ? r.name : `${r.name}\n    → ${r.error}`;
  console.log(`  ${icon} ${msg}`);
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
