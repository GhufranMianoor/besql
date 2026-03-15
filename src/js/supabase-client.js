/**
 * supabase-client.js — Initialises the shared Supabase JS client.
 *
 * Load order (enforced by index.html):
 *   CDN supabase bundle → config.js → supabase-client.js → supabase-data.js
 *
 * Exposes:
 *   supabaseClient  — the initialised client, or null when USE_SUPABASE is
 *                     false or credentials are absent.
 */
'use strict';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let supabaseClient = null;

(function initSupabase() {
  if (!CONFIG.USE_SUPABASE) return;

  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.warn(
      '[BeSQL] Supabase credentials are not configured. ' +
      'Fill in SUPABASE_URL and SUPABASE_ANON_KEY in src/js/config.js ' +
      'and set USE_SUPABASE to true to enable cloud persistence.'
    );
    return;
  }

  supabaseClient = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY
  );
}());
