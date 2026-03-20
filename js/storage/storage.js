/**
 * Storage Module
 * Handles cloud synchronization with Supabase and local caching
 * Features: Rate limiting, timeout protection, health checking
 */

let SB = null;
let STORAGE_MODE = 'memory';
let STORAGE_DIAGNOSTIC = '';
let STORAGE_INITIALIZED = false;
let STORAGE_HEALTH = { lastCheck: null, status: 'unknown', nextCheck: null };
const STORAGE_CONFIG = { initTimeoutMs: 45000, healthCheckIntervalMs: 30000 };
const storageCache = new Map();
const pendingUpserts = new Map();
const pendingDeletes = new Set();
let flushTimer = null;
let flushInFlight = false;
let flushRetryDelay = 500;
const CLIENT_ONLY_KEYS = new Set(['session', 'theme', 'practiceLab', 'practiceLabTaskDone']);

const STORAGE_SUPABASE_CONFIG = {
  url: window.SUPABASE_URL || 'https://yaqukpmixbhiyxdkgmwl.supabase.co',
  anonKey: window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhcXVrcG1peGJoaXl4ZGtnbXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzI1NDksImV4cCI6MjA4OTUwODU0OX0.8mckbWLNNjVMNjxH4BCRnXh1-GaAN1xgWlbEPopG_Co',
  kvTable: 'besql_kv',
};

function cloneVal(v) {
  if (v == null) return v;
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return v;
  }
}

function canUseSessionStorage() {
  try {
    return typeof window.sessionStorage !== 'undefined';
  } catch {
    return false;
  }
}

function getClientOnlyValue(k) {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(`besql:${k}`);
    if (raw == null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setClientOnlyValue(k, v) {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(`besql:${k}`, JSON.stringify(cloneVal(v)));
  } catch { }
}

function delClientOnlyValue(k) {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(`besql:${k}`);
  } catch { }
}

function isFatalSupabaseError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    (msg.includes('relation') && msg.includes('does not exist'))
    || msg.includes('row-level security')
    || msg.includes('permission denied')
    || msg.includes('not allowed')
    || msg.includes('invalid api key')
    || msg.includes('jwt')
  );
}

function explainSupabaseError(error, phase) {
  const msg = String(error?.message || error || 'Unknown error');
  const lower = msg.toLowerCase();
  if (lower.includes('relation') && lower.includes('does not exist')) {
    return `Supabase ${phase} failed: table '${STORAGE_SUPABASE_CONFIG.kvTable}' does not exist. Run sql/supabase-schema.sql in Supabase SQL editor.`;
  }
  if (lower.includes('row-level security') || lower.includes('permission denied') || lower.includes('not allowed')) {
    return `Supabase ${phase} failed: RLS/permissions are blocking writes on '${STORAGE_SUPABASE_CONFIG.kvTable}'. Enable a policy for anon/authenticated users.`;
  }
  if (lower.includes('invalid api key') || lower.includes('jwt')) {
    return `Supabase ${phase} failed: invalid anon key. Check SUPABASE_ANON_KEY.`;
  }
  return `Supabase ${phase} failed: ${msg}`;
}

function setStorageFallback(reason) {
  STORAGE_MODE = 'memory';
  STORAGE_DIAGNOSTIC = reason;
}

function scheduleCloudFlush(delay = 0) {
  if (STORAGE_MODE !== 'supabase' || !SB) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushCloudWrites().catch(err => console.error('Cloud flush failed:', err));
  }, delay);
}

async function flushAndWait(timeout = 5000) {
  if (STORAGE_MODE !== 'supabase' || !SB || !flushTimer) return true;
  return new Promise((resolve) => {
    const checkTimer = setInterval(() => {
      if (!flushInFlight && !pendingUpserts.size && !pendingDeletes.size) {
        clearInterval(checkTimer);
        resolve(true);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(checkTimer);
      resolve(!flushInFlight && !pendingUpserts.size && !pendingDeletes.size);
    }, timeout);
  });
}

async function flushCloudWrites() {
  if (STORAGE_MODE !== 'supabase' || !SB) return;
  if (flushInFlight) return;
  if (!pendingUpserts.size && !pendingDeletes.size) return;
  flushInFlight = true;
  try {
    if (pendingUpserts.size) {
      const rows = [...pendingUpserts.entries()].map(([k, v]) => ({ k, v }));
      const { error } = await globalRateLimiter.execute(
        () => SB.from(STORAGE_SUPABASE_CONFIG.kvTable).upsert(rows, { onConflict: 'k' }),
        { priority: 'high', timeout: 15000 }
      );
      if (error) {
        if (isFatalSupabaseError(error)) {
          const reason = explainSupabaseError(error, 'write');
          console.error('Supabase batch upsert failed:', reason);
          setStorageFallback(reason);
          return;
        }
        console.warn('Transient Supabase upsert error. Retrying...', error?.message || error);
        scheduleCloudFlush(flushRetryDelay);
        flushRetryDelay = Math.min(flushRetryDelay * 2, 8000);
        return;
      }
      pendingUpserts.clear();
    }

    if (pendingDeletes.size) {
      const keys = [...pendingDeletes];
      const { error } = await globalRateLimiter.execute(
        () => SB.from(STORAGE_SUPABASE_CONFIG.kvTable).delete().in('k', keys),
        { priority: 'high', timeout: 15000 }
      );
      if (error) {
        if (isFatalSupabaseError(error)) {
          const reason = explainSupabaseError(error, 'delete');
          console.error('Supabase batch delete failed:', reason);
          setStorageFallback(reason);
          return;
        }
        console.warn('Transient Supabase delete error. Retrying...', error?.message || error);
        scheduleCloudFlush(flushRetryDelay);
        flushRetryDelay = Math.min(flushRetryDelay * 2, 8000);
        return;
      }
      pendingDeletes.clear();
    }

    flushRetryDelay = 500;
  } finally {
    flushInFlight = false;
    if (STORAGE_MODE === 'supabase' && (pendingUpserts.size || pendingDeletes.size)) {
      scheduleCloudFlush(flushRetryDelay);
    }
  }
}

/**
 * Health check: Quick test of Supabase connectivity
 */
async function checkSupabaseHealth() {
  if (!SB) return false;
  try {
    const { error } = await SB.from(STORAGE_SUPABASE_CONFIG.kvTable).select('1').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Scheduled health checker - runs periodically to detect connection issues
 */
let healthCheckTimer = null;
function scheduleHealthCheck() {
  if (healthCheckTimer) return;
  
  healthCheckTimer = setInterval(async () => {
    if (STORAGE_MODE !== 'supabase') return;
    
    const isHealthy = await checkSupabaseHealth();
    STORAGE_HEALTH.lastCheck = Date.now();
    STORAGE_HEALTH.status = isHealthy ? 'healthy' : 'unhealthy';
    
    if (!isHealthy) {
      console.warn('[Storage] Health check failed - Supabase may be experiencing issues');
      // Don't immediately fallback, but log the issue
      STORAGE_DIAGNOSTIC = 'Connection issue detected at ' + new Date().toISOString();
    }
  }, STORAGE_CONFIG.healthCheckIntervalMs);
}

/**
 * Execute initStorage with timeout protection
 * If initialization takes too long, falls back to memory mode
 */
async function initStorageWithTimeout() {
  const timeoutMs = STORAGE_CONFIG.initTimeoutMs;
  
  return Promise.race([
    initStorage(),
    new Promise((_, reject) => 
      setTimeout(
        () => reject(new Error(`Storage initialization timeout (${timeoutMs}ms). Supabase may be unavailable.`)),
        timeoutMs
      )
    )
  ]).catch(err => {
    const reason = `Storage init failed: ${err.message || err}`;
    console.error(reason);
    if (STORAGE_MODE !== 'supabase') {
      // Already in fallback
      return { success: false, mode: 'memory', reason };
    }
    setStorageFallback(reason);
    return { success: false, mode: 'memory', reason, timedOut: true };
  });
}

async function initStorage() {
  storageCache.clear();
  const canUseSupabase = typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function';
  if (!canUseSupabase || !STORAGE_SUPABASE_CONFIG.url || !STORAGE_SUPABASE_CONFIG.anonKey) {
    const reason = 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.';
    console.warn(reason);
    setStorageFallback(reason);
    return { success: false, mode: 'memory', reason };
  }
  try {
    SB = window.supabase.createClient(STORAGE_SUPABASE_CONFIG.url, STORAGE_SUPABASE_CONFIG.anonKey);

    // Test read access
    const { data, error } = await SB.from(STORAGE_SUPABASE_CONFIG.kvTable).select('k,v').limit(1);
    if (error) {
      const reason = explainSupabaseError(error, 'read');
      console.error(reason);
      setStorageFallback(reason);
      return { success: false, mode: 'memory', reason };
    }

    // Test write access
    const probeKey = `__besql_probe__${Date.now()}`;
    const probePayload = { at: Date.now(), ok: true };
    const { error: probeErr } = await SB.from(STORAGE_SUPABASE_CONFIG.kvTable).upsert({ k: probeKey, v: probePayload }, { onConflict: 'k' });
    if (probeErr) {
      const reason = explainSupabaseError(probeErr, 'write');
      console.error(reason);
      setStorageFallback(reason);
      return { success: false, mode: 'memory', reason };
    }

    // Clean up probe
    await SB.from(STORAGE_SUPABASE_CONFIG.kvTable).delete().eq('k', probeKey);

    // Load existing data
    const { data: allData, error: loadErr } = await SB.from(STORAGE_SUPABASE_CONFIG.kvTable).select('k,v');
    if (loadErr) {
      console.warn('Failed to load existing data:', loadErr.message || loadErr);
    } else {
      (allData || []).forEach(row => storageCache.set(row.k, cloneVal(row.v)));
    }

    STORAGE_MODE = 'supabase';
    STORAGE_DIAGNOSTIC = '';
    STORAGE_INITIALIZED = true;
    scheduleHealthCheck();  // Start health monitoring
    console.log('[Storage] Supabase initialized successfully, health checks enabled');
    return { success: true, mode: 'supabase', itemsLoaded: storageCache.size };
  } catch (err) {
    const reason = `Supabase initialization exception: ${err?.message || err}`;
    console.error(reason);
    setStorageFallback(reason);
    return { success: false, mode: 'memory', reason };
  }
}

async function cloudUpsert(k, v) {
  if (!SB || STORAGE_MODE !== 'supabase') return Promise.resolve();
  pendingDeletes.delete(k);
  pendingUpserts.set(k, cloneVal(v));
  scheduleCloudFlush(50);
  return flushAndWait();
}

async function cloudDelete(k) {
  if (!SB || STORAGE_MODE !== 'supabase') return Promise.resolve();
  pendingUpserts.delete(k);
  pendingDeletes.add(k);
  scheduleCloudFlush(50);
  return flushAndWait();
}

const LS = {
  get(k) {
    if (CLIENT_ONLY_KEYS.has(k)) return cloneVal(getClientOnlyValue(k));
    return storageCache.has(k) ? cloneVal(storageCache.get(k)) : null;
  },
  async set(k, v) {
    if (CLIENT_ONLY_KEYS.has(k)) {
      setClientOnlyValue(k, v);
      return Promise.resolve();
    }
    storageCache.set(k, cloneVal(v));
    return cloudUpsert(k, cloneVal(v));
  },
  async del(k) {
    if (CLIENT_ONLY_KEYS.has(k)) {
      delClientOnlyValue(k);
      return Promise.resolve();
    }
    storageCache.delete(k);
    return cloudDelete(k);
  },
  keys(p = '') { return [...storageCache.keys()].filter(k => k.startsWith(p)); },
};

// Async storage wrapper for critical operations
const LSAsync = {
  async save(k, v) { return LS.set(k, v); },
  async remove(k) { return LS.del(k); },
  async waitForSync() { return flushAndWait(); },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initStorage,
    LS,
    LSAsync,
    flushAndWait,
    cloudUpsert,
    cloudDelete,
    STORAGE_MODE: () => STORAGE_MODE,
    STORAGE_DIAGNOSTIC: () => STORAGE_DIAGNOSTIC,
  };
}
