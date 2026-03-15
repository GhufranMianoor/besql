/**
 * app.js — Application bootstrap and initialisation.
 *
 * Execution order (enforced by <script> tags in index.html):
 *   config.js → state.js → storage.js → supabase-client.js
 *   → supabase-data.js → sql-engine.js → validator.js
 *   → data/problems.js → ui.js → auth.js
 *   → views/*.js → router.js → app.js  ← THIS FILE (last)
 *
 * Responsibilities:
 *  1. Load persisted problems/contests or seed with defaults.
 *  2. Restore user session from localStorage or Supabase.
 *  3. Wire static [data-view] nav buttons.
 *  4. Start "online users" simulation.
 *  5. Boot into the home view and remove the loading screen.
 */
'use strict';

/* ── Data bootstrap ────────────────────────────────────── */

/**
 * Persist the current problem bank to localStorage (strips
 * non-serialisable validate() functions first).
 * In Supabase mode individual saves are handled by SB.saveProblem().
 */
function persistProblems() {
  LS.set('problems', stripValidators(S.problems));
}

/**
 * Load the problem bank from Supabase (if enabled) or localStorage,
 * then rebuild the validate() functions.
 * @returns {Promise<void>}
 */
async function loadProblems() {
  if (CONFIG.USE_SUPABASE && supabaseClient) {
    try {
      const remote = await SB.getProblems();
      S.problems = remote.length
        ? rebuildValidators(remote)
        : PROBLEMS_DEFAULT.map(p => ({ ...p, testCases: p.testCases.map(tc => ({ ...tc })) }));
      return;
    } catch (e) {
      console.error('[BeSQL] Failed to load problems from Supabase — falling back to localStorage:', e);
    }
  }
  const stored = LS.get('problems');
  S.problems = stored && stored.length
    ? rebuildValidators(stored)
    : PROBLEMS_DEFAULT.map(p => ({
        ...p,
        testCases: p.testCases.map(tc => ({ ...tc })),
      }));
}

/**
 * Load contests from Supabase (if enabled) or localStorage.
 * @returns {Promise<void>}
 */
async function loadContests() {
  if (CONFIG.USE_SUPABASE && supabaseClient) {
    try {
      S.contests = await SB.getContests();
      // Dynamically update live/upcoming/ended based on wall clock
      const now = Date.now();
      S.contests = S.contests.map(c => {
        if (c.status === 'ended') return c;
        if (c.endTime < now)   return { ...c, status: 'ended' };
        if (c.startTime < now) return { ...c, status: 'live' };
        return { ...c, status: 'upcoming' };
      });
      if (S.user) {
        S.customContests = await SB.getCustomContests(S.user.userId);
      }
      return;
    } catch (e) {
      console.error('[BeSQL] Failed to load contests from Supabase — falling back to localStorage:', e);
    }
  }

  const stored = LS.get('contests');
  S.contests = stored && stored.length ? stored : CONTESTS_DEFAULT.slice();

  // Dynamically update live/upcoming/ended based on wall clock
  const now = Date.now();
  S.contests = S.contests.map(c => {
    if (c.status === 'ended') return c;
    if (c.endTime < now)   return { ...c, status: 'ended' };
    if (c.startTime < now) return { ...c, status: 'live' };
    return { ...c, status: 'upcoming' };
  });

  // Persist the updated contest statuses
  LS.set('contests', S.contests);

  S.customContests = S.user
    ? (LS.get(`custom:${S.user.userId}`) || [])
    : [];
}

/* ── Simulated online count ────────────────────────────── */
function startOnlineSimulation() {
  const tick = () => {
    S.onlineCount = Math.floor(
      Math.random() * (CONFIG.ONLINE_MAX - CONFIG.ONLINE_MIN + 1) + CONFIG.ONLINE_MIN
    );
    const el_ = document.getElementById('sb-online');
    if (el_) el_.textContent = S.onlineCount;
  };
  tick();
  setInterval(tick, CONFIG.ONLINE_REFRESH_MS);
}

/* ── Application entry point ───────────────────────────── */
async function bootstrap() {
  // 1. Restore auth session first (needed before loadContests for customContests)
  await restoreSession();

  // 2. Load data
  await loadProblems();
  await loadContests();

  // 3. Load custom contests (needs user to be set first; localStorage path)
  if (S.user && !CONFIG.USE_SUPABASE) {
    S.customContests = LS.get(`custom:${S.user.userId}`) || [];
  }

  // 4. Wire nav listeners
  initNavListeners();

  // 5. Start simulated presence
  startOnlineSimulation();

  // 6. Apply saved theme
  applyStoredTheme();

  // 7. Render initial view
  renderTopRight();
  renderSidebar();
  nav('home');

  // 8. Remove loading screen
  const init = document.getElementById('init');
  if (init) {
    init.style.opacity = '0';
    init.style.transition = 'opacity 0.3s ease';
    setTimeout(() => init.remove(), 320);
  }
}

/* Wait for DOM ready, then boot */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

