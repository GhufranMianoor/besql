/**
 * auth.js — User authentication.
 *
 * When CONFIG.USE_SUPABASE is true, authentication is delegated to
 * Supabase Auth (SB.signUp / SB.signIn / SB.signOut / SB.getSession).
 * Otherwise the localStorage-based demo mode is used.
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
  setTimeout(() => {
    const f = el('au') || el('ru');
    if (f) f.focus();
    // Wire Enter key to submit the auth form
    document.querySelectorAll('#auth-body .inp').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (mode === 'login') doLogin(); else doRegister();
        }
      });
    });
  }, 100);
}

async function doLogin() {
  const u = (el('au') || {}).value?.trim();
  const p = (el('ap') || {}).value;
  if (!u || !p) { _showAuthErr('a-err', 'Enter username and password.'); return; }

  if (CONFIG.USE_SUPABASE && supabaseClient) {
    try {
      const user = await SB.signIn(u, p);
      S.submissions = await SB.getSubmissions(user.userId);
      _finishLogin(user);
    } catch (err) {
      _showAuthErr('a-err', err.message || 'Invalid credentials.');
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

  if (CONFIG.USE_SUPABASE && supabaseClient) {
    try {
      const user = await SB.signUp(u, p);
      _finishLogin(user, `Welcome, ${u}!`);
    } catch (err) {
      _showAuthErr('r-err', err.message || 'Registration failed.');
    }
    return;
  }

  if (LS.get(`user:${u}`))  { _showAuthErr('r-err', 'Username already taken.'); return; }
  const newUser = {
    userId: genId(), username: u, password: p,
    role: 'contestant', score: 0, solved: 0, streak: 0, joinedAt: Date.now(),
  };
  LS.set(`user:${u}`, newUser);
  _finishLogin(newUser, `Welcome, ${u}!`);
}

/** One-click demo login (creates the account if it doesn't exist) */
function quickLogin(uname, role) {
  let u = LS.get(`user:${uname}`);
  if (!u) {
    u = { userId: genId(), username: uname, password: 'demo', role, score: 0, solved: 0, streak: 0, joinedAt: Date.now() };
    LS.set(`user:${uname}`, u);
  }
  _finishLogin(u);
  closeModal('modal-auth');
}

async function doLogout() {
  if (CONFIG.USE_SUPABASE && supabaseClient) {
    try { await SB.signOut(); } catch (e) { console.warn('[BeSQL] Sign-out error:', e); }
  }
  S.user = null;
  LS.del('session');
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

function _finishLogin(user, toastMsg) {
  S.user = user;
  if (!CONFIG.USE_SUPABASE) {
    LS.set('session', user.username);
    S.submissions = LS.get(`subs:${user.userId}`) || [];
  }
  closeModal('modal-auth');
  renderTopRight();
  renderSidebar();
  // Re-render the current view so the signed-in state is reflected
  nav(S.currentView);
  toast(toastMsg || `Signed in as ${user.username}`, 'success');
}

/** Restore session from Supabase token or localStorage on page load. */
async function restoreSession() {
  if (CONFIG.USE_SUPABASE && supabaseClient) {
    try {
      const profile = await SB.getSession();
      if (!profile) return;
      S.user = profile;
      S.submissions = await SB.getSubmissions(profile.userId);
    } catch (e) {
      console.warn('[BeSQL] Session restore error:', e);
    }
    return;
  }
  const saved = LS.get('session');
  if (!saved) return;
  const user = LS.get(`user:${saved}`);
  if (!user) return;
  S.user = user;
  S.submissions = LS.get(`subs:${user.userId}`) || [];
}
