/**
 * supabase-client.js — Supabase client initialisation.
 *
 * Provides a global `supabase` client instance when USE_SUPABASE is enabled
 * and the Supabase JS SDK is loaded via CDN.
 *
 * Requires: config.js (CONFIG)
 */
'use strict';

/**
 * Initialised Supabase client (null until initSupabase() succeeds).
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
let supabase = null;

/**
 * Create the Supabase client from CONFIG values.
 * Called once during bootstrap when USE_SUPABASE is true.
 *
 * @returns {boolean} true if the client was created successfully
 */
function initSupabase() {
  if (!CONFIG.USE_SUPABASE) return false;

  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );
    return true;
  }

  console.warn('[BeSQL] Supabase SDK not loaded — falling back to localStorage.');
  return false;
}
