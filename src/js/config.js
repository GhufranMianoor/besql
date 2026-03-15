/**
 * config.js — Application-wide constants and configuration.
 *
 * Keep environment-specific values (e.g. MongoDB URI) in environment
 * variables / a .env file and never commit secrets to source control.
 */
'use strict';

const CONFIG = Object.freeze({
  APP_NAME: 'BeSQL',
  APP_VERSION: '2.0.0',

  /**
   * MongoDB configuration.
   * Set MONGODB_URI to your connection string and MONGODB_DB to the
   * database name.  In production these should come from environment
   * variables served by your backend API.
   *
   * See mongodb/schema.js for the recommended collection structure
   * and validation rules.
   */
  MONGODB_URI: '', // e.g. 'mongodb+srv://user:pass@cluster.mongodb.net'
  MONGODB_DB:  '', // e.g. 'besql'

  /** Feature flags */
  USE_MONGODB: false, // Set to true once a backend API with MongoDB is configured

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
