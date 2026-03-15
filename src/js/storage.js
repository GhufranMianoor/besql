/**
 * storage.js — LocalStorage helpers with namespace prefix.
 *
 * All keys are prefixed with CONFIG.LS_PREFIX to avoid collisions with
 * other applications on the same origin.
 */
'use strict';

const LS = {
  _key(k) { return CONFIG.LS_PREFIX + k; },

  /** Read and JSON-parse a value; returns null on miss or parse error */
  get(k) {
    try { return JSON.parse(localStorage.getItem(this._key(k))); }
    catch { return null; }
  },

  /** JSON-stringify and store a value */
  set(k, v) {
    try { localStorage.setItem(this._key(k), JSON.stringify(v)); }
    catch (e) { console.warn('[LS.set] quota exceeded or unavailable', e); }
  },

  /** Remove a key */
  del(k) { localStorage.removeItem(this._key(k)); },

  /**
   * Return all keys whose un-prefixed name starts with `prefix`.
   * Useful for enumerating all user accounts: LS.keys('user:')
   */
  keys(prefix = '') {
    const ns = this._key(prefix);
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
      const raw = localStorage.key(i);
      if (raw.startsWith(ns)) result.push(raw);
    }
    return result;
  },

  /**
   * Return all values whose un-prefixed key starts with `prefix`.
   */
  values(prefix = '') {
    return this.keys(prefix).map(rawKey => {
      try { return JSON.parse(localStorage.getItem(rawKey)); }
      catch { return null; }
    }).filter(Boolean);
  },
};
