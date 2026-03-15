/**
 * config.js — Application-wide constants and configuration.
 *
 * Keep environment-specific values (e.g. Supabase keys) in environment
 * variables / a .env file and never commit secrets to source control.
 */
'use strict';

const CONFIG = Object.freeze({
  APP_NAME: 'BeSQL',
  APP_VERSION: '2.0.0',

  /**
   * Supabase configuration.
   * Replace with your project URL and anon key from
   * https://wygmzlutbayohnodtexy.supabase.co/settings/api
   *
   * These values are safe to expose in browser code because Supabase
   * uses Row-Level Security (RLS) to protect data — the anon key only
   * grants access to what RLS policies allow.
   */
  SUPABASE_URL:      'https://wygmzlutbayohnodtexy.supabase.co', // e.g. 'https://wygmzlutbayohnodtexy.supabase.co'
  SUPABASE_ANON_KEY: 'sb_publishable_2T1ZvoLssJKHQVTVyMxIDQ_Phv-t0wg', // e.g. 'sb_publishable_2T1ZvoLssJKHQVTVyMxIDQ_Phv-t0wg'

  /** Feature flags */
  USE_SUPABASE: true, // Set to true once Supabase credentials are configured

  /** Local storage namespace prefix */
  LS_PREFIX: 'besql_',

  /** Simulated online-users range (demo mode) */
  ONLINE_MIN: 12,
  ONLINE_MAX: 48,

  /** How often to refresh the simulated online count (ms) */
  ONLINE_REFRESH_MS: 8000,

  /** Toast auto-dismiss duration (ms) */
  TOAST_DURATION_MS: 4000,

  /** Default SQL editor placeholder */
  EDITOR_PLACEHOLDER: '-- Write your SQL query here\n-- Ctrl+Enter to run, Tab to indent\n',
});

/** Returns today as 'YYYY-M-D', used to tag the daily practice problem. */
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
