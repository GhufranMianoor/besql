/**
 * supabase-client.js — Supabase JS client singleton.
 *
 * The global `supabase` object comes from the @supabase/supabase-js CDN
 * bundle loaded before this script in index.html.
 *
 * When CONFIG.USE_SUPABASE is false (demo / offline mode) this module is
 * a no-op and SB_CLIENT is null.  All callers guard with:
 *   if (CONFIG.USE_SUPABASE && SB_CLIENT) { ... }
 */
'use strict';

const SB_CLIENT = (() => {
  if (!CONFIG.USE_SUPABASE) return null;

  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.warn(
      '[BeSQL] Supabase credentials not set. ' +
      'Set SUPABASE_URL and SUPABASE_ANON_KEY in src/js/config.js, ' +
      'then set USE_SUPABASE: true to enable Supabase mode.'
    );
    return null;
  }

  // supabase.createClient is provided by the @supabase/supabase-js CDN bundle.
  return supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
})();
