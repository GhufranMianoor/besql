/**
 * auth.js — User authentication.
 *
 * When CONFIG.USE_SUPABASE is true the module delegates to Supabase Auth
 * (email/password).  Otherwise the localStorage-based demo auth is used.
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
    ${CONFIG.USE_SUPABASE ? '<div class="fg"><label class="lbl">Email</label><input class="inp" type="email" id="re" placeholder="you@example.com" autocomplete="off"></div>' : ''}
    <div class="fg"><label class="lbl">Password (min 4 chars)</label><input class="inp" type="password" id="rp" placeholder="••••••••"></div>
    <div id="r-err" class="hidden" style="color:var(--rose);font-size:11px;margin-bottom:10px"></div>
    <div class="mfooter" style="padding:14px 0 0;border-top:1px solid var(--line);margin-top:14px;justify-content:flex-end;display:flex;gap:9px">
      <button class="btn btn-ghost btn-md" onclick="openAuth('login')">← Back to Login</button>
      <button class="btn btn-blue btn-md" onclick="doRegister()">Create Account</button>
    </div>`;
  openModal('modal-auth');
  setTimeout(() => { const f = el('au') || el('ru'); if (f) f.focus(); }, 100);
}

function doLogin() {
  const u = (el('au') || {}).value?.trim();
  const p = (el('ap') || {}).value;
  if (!u || !p) { _showAuthErr('a-err', 'Enter username and password.'); return; }

  if (CONFIG.USE_SUPABASE && supabase) {
    // Supabase Auth: treat username as email
    SB.signIn(u, p).then(({ user, error }) => {
      if (error || !user) { _showAuthErr('a-err', error || 'Invalid credentials.'); return; }
      _finishLogin(user);
    });
    return;
  }

  const stored = LS.get(`user:${u}`);
  if (!stored || stored.password !== p) { _showAuthErr('a-err', 'Invalid credentials.'); return; }
  _finishLogin(stored);
}

function doRegister() {
  const u = (el('ru') || {}).value?.trim();
  const p = (el('rp') || {}).value;
  if (!u || u.length < 3) { _showAuthErr('r-err', 'Username must be at least 3 characters.'); return; }
  if (!p || p.length < 4) { _showAuthErr('r-err', 'Password must be at least 4 characters.'); return; }

  if (CONFIG.USE_SUPABASE && supabase) {
    const email = (el('re') || {}).value?.trim();
    if (!email) { _showAuthErr('r-err', 'Email is required.'); return; }
    SB.signUp(email, p, u).then(({ user, error }) => {
      if (error || !user) { _showAuthErr('r-err', error || 'Registration failed.'); return; }
      _finishLogin(user);
      closeModal('modal-auth');
      toast(`Welcome, ${u}!`, 'success');
    });
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

function doLogout() {
  if (CONFIG.USE_SUPABASE && supabase) SB.signOut();
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

function _finishLogin(user) {
  S.user = user;
  LS.set('session', user.username);

  if (CONFIG.USE_SUPABASE && supabase) {
    SB.fetchSubmissions(user.userId).then(subs => {
      S.submissions = subs || LS.get(`subs:${user.userId}`) || [];
    });
  } else {
    S.submissions = LS.get(`subs:${user.userId}`) || [];
  }

  closeModal('modal-auth');
  renderTopRight();
  renderSidebar();
  renderHome();
  toast(`Signed in as ${user.username}`, 'success');
}

/** Restore session from localStorage on page load */
function restoreSession() {
  const saved = LS.get('session');
  if (!saved) return;
  const user = LS.get(`user:${saved}`);
  if (user) _finishLogin(user);
}
