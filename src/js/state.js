/**
 * state.js — Singleton application state.
 *
 * All mutable runtime state lives here so every module reads from and
 * writes to a single source of truth.  Never import this circularly.
 */
'use strict';

const S = {
  /** Currently signed-in user object (null = guest) */
  user: null,

  /** Loaded problem bank (array) */
  problems: [],

  /** Loaded contest list (array) */
  contests: [],

  /** Current user's submission history (array) */
  submissions: [],

  /** Simulated online count shown in sidebar */
  onlineCount: 0,

  /** Currently visible view key (e.g. 'home', 'practice') */
  currentView: 'home',

  /** ID of the contest currently being viewed */
  currentContest: null,

  /** Practice list filter key ('all' | 'Easy' | 'Medium' | 'Hard' | 'Expert') */
  practiceFilter: 'all',

  /** Active judge session context (problem + back navigation target) */
  judgeCtx: null,

  /** Interval handle for the contest countdown timer */
  contestTimer: null,

  /** Interval handle for the judge view timer */
  judgeTimer: null,

  /** Elapsed seconds in the current judge session */
  judgeElapsed: 0,

  /**
   * All user profiles (populated from Supabase in Supabase mode).
   * Used for leaderboard and admin user-management views.
   * In localStorage mode this stays empty; LS.values('user:') is used instead.
   */
  users: [],

  /**
   * Current global platform announcement text (populated on bootstrap).
   * In localStorage mode, read directly from LS.get('announcement').
   */
  announcement: '',

  /**
   * All submissions across all users (lazy-loaded for admin analytics).
   * null means not yet loaded; [] means loaded but empty.
   * Only populated in Supabase mode when an admin opens the analytics tab.
   */
  allSubmissions: null,
};
