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
 *  1. Load persisted problems/contests (Supabase or localStorage).
 *  2. Restore user session.
 *  3. Wire static [data-view] nav buttons.
 *  4. Start "online users" simulation.
 *  5. Boot into the home view and remove the loading screen.
 */
'use strict';

/* ── Data bootstrap ────────────────────────────────────── */

/**
 * Persist the current problem bank to localStorage (strips
 * non-serialisable validate() functions first).
 * No-op in Supabase mode; problems are persisted per-save via
 * SB.upsertProblem() in admin.js.
 */
function persistProblems() {
  if (CONFIG.USE_SUPABASE && SB_CLIENT) return;
  LS.set('problems', stripValidators(S.problems));
}

/**
 * Normalise contest statuses based on the current wall-clock time.
 * @param {Array} contests
 * @returns {Array}
 */
function _normaliseContestStatuses(contests) {
  const now = Date.now();
  return contests.map(c => {
    if (c.status === 'ended') return c;
    if (c.endTime   < now)   return { ...c, status: 'ended' };
    if (c.startTime < now)   return { ...c, status: 'live' };
    return { ...c, status: 'upcoming' };
  });
}

/**
 * Load the problem bank from localStorage (or seed with defaults),
 * then rebuild the validate() functions.
 * Only used in localStorage mode; Supabase mode loads inside bootstrap().
 */
function loadProblems() {
  const stored = LS.get('problems');
  S.problems = stored && stored.length
    ? rebuildValidators(stored)
    : PROBLEMS_DEFAULT.map(p => ({
        ...p,
        testCases: p.testCases.map(tc => ({ ...tc })),
      }));
}

/**
 * Load contests from localStorage (or seed with defaults).
 * Only used in localStorage mode; Supabase mode loads inside bootstrap().
 */
function loadContests() {
  const stored = LS.get('contests');
  const raw    = stored && stored.length ? stored : CONTESTS_DEFAULT.slice();
  S.contests   = _normaliseContestStatuses(raw);

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
  // 1. Load data
  if (CONFIG.USE_SUPABASE && SB_CLIENT) {
    // Load problems, contests, all user profiles, and the global
    // announcement in parallel from Supabase.
    const [probs, contests, profiles, ann] = await Promise.all([
      SB.getProblems(),
      SB.getContests(),
      SB.getProfiles(),
      SB.getAnnouncement(),
    ]);

    S.problems     = rebuildValidators(probs);
    S.contests     = _normaliseContestStatuses(contests);
    S.users        = profiles;
    S.announcement = ann || '';

    // 2. Restore Supabase auth session (must follow data load)
    const profile = await SB.getSession();
    if (profile) {
      await _finishLoginSB(profile, false);
    }

    // Show announcement bar if a message is set
    if (S.announcement) {
      const announceTxt = el('announce-text');
      if (announceTxt) announceTxt.textContent = S.announcement;
      show('announce-bar');
    }
  } else {
    // localStorage mode
    loadProblems();
    loadContests();
    restoreSession();

    // Restore announcement bar from localStorage
    const ann = LS.get('announcement');
    if (ann) {
      const announceTxt = el('announce-text');
      if (announceTxt) announceTxt.textContent = ann;
      show('announce-bar');
    }
  }

  // 3. Wire nav listeners
  initNavListeners();

  // 4. Start simulated presence
  startOnlineSimulation();

  // 5. Apply saved theme
  applyStoredTheme();

  // 6. Render initial view
  renderTopRight();
  renderSidebar();
  nav('home');

  // 7. Remove loading screen
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
