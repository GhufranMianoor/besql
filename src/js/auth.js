/**
 * auth.js — User authentication.
 *
 * When CONFIG.USE_SUPABASE is true, authentication is handled via the
 * Supabase Auth API (supabase-data.js → SB.signIn / SB.signUp / SB.signOut).
 * When false, the localStorage-based demo mode is used.
 */
'use strict';

/* ── Auth Modal ─────────────────────────────────────────── */
function openAuth(mode = 'login') {
  el('auth-title').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  el('auth-body').innerHTML = mode === 'login' ? `
    <div class="fg"><label class="lbl">Username</label><input class="inp" id="au" placeholder="your_username" autocomplete="off"></div>
    <div class="fg"><label class="lbl">Password</label><input class="inp" type="password" id="ap" placeholder="••••••••"></div>
    <div id="a-err" class="hidden" style="color:var(--rose);font-size:11px;margin-bottom:10px"></div>
    <div class="fx ic sb mt3">
      <span style="font-size:12px;color:var(--t2)">No account?</span>
      <button class="btn btn-ghost btn-sm" onclick="openAuth('register')">Register →</button>
    </div>
    <div class="mfooter" style="padding:14px 0 0;border-top:1px solid var(--line);margin-top:14px;justify-content:flex-end;display:flex;gap:9px">
      <button class="btn btn-ghost btn-md" onclick="closeModal('modal-auth')">Cancel</button>
      <button class="btn btn-blue btn-md" onclick="doLogin()">Sign In</button>
    </div>` : `
    <div class="fg"><label class="lbl">Username (min 3 chars)</label><input class="inp" id="ru" placeholder="choose_username" autocomplete="off"></div>
    <div class="fg"><label class="lbl">Password (min 4 chars)</label><input class="inp" type="password" id="rp" placeholder="••••••••"></div>
    <div id="r-err" class="hidden" style="color:var(--rose);font-size:11px;margin-bottom:10px"></div>
    <div class="mfooter" style="padding:14px 0 0;border-top:1px solid var(--line);margin-top:14px;justify-content:flex-end;display:flex;gap:9px">
      <button class="btn btn-ghost btn-md" onclick="openAuth('login')">← Back to Login</button>
      <button class="btn btn-blue btn-md" onclick="doRegister()">Create Account</button>
    </div>`;
  openModal('modal-auth');
  setTimeout(() => { const f = el('au') || el('ru'); if (f) f.focus(); }, 100);
}

async function doLogin() {
  const u = (el('au') || {}).value?.trim();
  const p = (el('ap') || {}).value;
  if (!u || !p) { _showAuthErr('a-err', 'Enter username and password.'); return; }

  if (CONFIG.USE_SUPABASE && SB_CLIENT) {
    const btn = document.querySelector('#auth-body .btn-blue');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
    try {
      const profile = await SB.signIn(u, p);
      await _finishLoginSB(profile);
    } catch (e) {
      _showAuthErr('a-err', e.message || 'Invalid credentials.');
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
    return;
  }

  const stored = LS.get(`user:${u}`);
  if (!stored || stored.password !== p) { _showAuthErr('a-err', 'Invalid credentials.'); return; }
  _finishLogin(stored);
}

async function doRegister() {
  const u = (el('ru') || {}).value?.trim();
  const p = (el('rp') || {}).value;
  if (!u || u.length < 3) { _showAuthErr('r-err', 'Username must be at least 3 characters.'); return; }
  if (!p || p.length < 4) { _showAuthErr('r-err', 'Password must be at least 4 characters.'); return; }

  if (CONFIG.USE_SUPABASE && SB_CLIENT) {
    const btn = document.querySelector('#auth-body .btn-blue');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }
    try {
      const profile = await SB.signUp(u, p);
      await _finishLoginSB(profile);
      toast(`Welcome, ${u}!`, 'success');
    } catch (e) {
      _showAuthErr('r-err', e.message || 'Registration failed. Please try again.');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    }
    return;
  }

  if (LS.get(`user:${u}`))  { _showAuthErr('r-err', 'Username already taken.'); return; }
  const newUser = {
    userId: genId(), username: u, password: p,
    role: 'contestant', score: 0, solved: 0, streak: 0, joinedAt: Date.now(),
  };
  LS.set(`user:${u}`, newUser);
  _finishLogin(newUser);
  closeModal('modal-auth');
  toast(`Welcome, ${u}!`, 'success');
}

/** One-click demo login (creates the account if it doesn't exist). Only available in localStorage mode. */
function quickLogin(uname, role) {
  if (CONFIG.USE_SUPABASE && SB_CLIENT) {
    toast('Quick-login is not available in Supabase mode.', 'warn');
    return;
  }
  let u = LS.get(`user:${uname}`);
  if (!u) {
    u = { userId: genId(), username: uname, password: 'demo', role, score: 0, solved: 0, streak: 0, joinedAt: Date.now() };
    LS.set(`user:${uname}`, u);
  }
  _finishLogin(u);
  closeModal('modal-auth');
}

async function doLogout() {
  if (CONFIG.USE_SUPABASE && SB_CLIENT) {
    SB.signOut().catch(e => console.error('[SB] signOut error', e));
  } else {
    LS.del('session');
  }
  S.user = null;
  S.submissions = [];
  renderTopRight();
  renderSidebar();
  renderHome();
  toast('Logged out.', 'info');
}

/* ── Private helpers ────────────────────────────────────── */
function _showAuthErr(id, msg) {
  const e = el(id);
  if (e) { e.textContent = msg; show(e); }
}

/** Finish login for localStorage mode */
function _finishLogin(user) {
  S.user = user;
  LS.set('session', user.username);
  S.submissions = LS.get(`subs:${user.userId}`) || [];
  closeModal('modal-auth');
  renderTopRight();
  renderSidebar();
  renderHome();
  toast(`Signed in as ${user.username}`, 'success');
}

/** Finish login for Supabase mode */
async function _finishLoginSB(profile, showToast = true) {
  S.user = profile;
  S.submissions = await SB.getSubmissions(profile.userId);
  S.customContests = [];
  closeModal('modal-auth');
  renderTopRight();
  renderSidebar();
  renderHome();
  if (showToast) toast(`Signed in as ${profile.username}`, 'success');
}

/** Restore session from localStorage on page load (localStorage mode only) */
function restoreSession() {
  const saved = LS.get('session');
  if (!saved) return;
  const user = LS.get(`user:${saved}`);
  if (user) _finishLogin(user);
}
