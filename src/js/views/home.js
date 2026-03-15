/**
 * views/home.js — Dashboard / landing page renderer.
 */
'use strict';

function renderHome() {
  const solved = getSolvedIds();
  const total  = S.problems.length;

  el('home-greeting').textContent = S.user ? `Welcome back, ${S.user.username}` : 'Welcome to BeSQL';
  el('home-sub').textContent = S.user
    ? `${S.user.role.toUpperCase()} · ${fmtN(S.user.score || 0)} points`
    : 'Sign in to start competing';

  // Stats row
  el('home-stats').innerHTML = [
    { l: 'Problems',      v: total,                                           icon: '📋', c: 'var(--ind)' },
    { l: 'Solved',        v: solved.size,                                     icon: '✓',  c: 'var(--grn)' },
    { l: 'Live Contests', v: S.contests.filter(c => c.status === 'live').length, icon: '🏆', c: 'var(--rose)' },
    { l: 'Your Rank',     v: getUserRank(),                                   icon: '🥇', c: 'var(--gold)' },
  ].map(s => `
    <div class="stat">
      <div style="font-size:18px;margin-bottom:6px">${s.icon}</div>
      <div class="stat-v" style="color:${s.c}">${s.v}</div>
      <div class="stat-l">${s.l}</div>
    </div>`).join('');

  // Streak widget
  el('home-streak').innerHTML = S.user ? `
    <div class="fx ic gap2">
      <span style="font-size:24px">🔥</span>
      <div>
        <div style="font-size:24px;font-weight:800;color:var(--gold);line-height:1">${S.user.streak || 0}</div>
        <div style="font-size:10px;color:var(--t3);letter-spacing:1px;margin-top:2px">DAY STREAK</div>
      </div>
    </div>` : '';

  // Active contests
  const active = S.contests.filter(c => c.status === 'live' || c.status === 'upcoming').slice(0, 4);
  el('home-contests').innerHTML = active.length
    ? active.map(c => `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 15px;border-bottom:1px solid var(--line);cursor:pointer;transition:background var(--tr)"
           onmouseenter="this.style.background='var(--bg2)'" onmouseleave="this.style.background=''"
           onclick="nav('contest-detail','${c.id}')">
        ${c.status === 'live' ? '<div class="live-dot"></div>' : '<span style="font-size:14px">📋</span>'}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:var(--t0);font-weight:500" class="trunc">${esc(c.title)}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:2px">
            ${c.status === 'live' ? 'In progress' : fmtDate(c.startTime)} · ${c.problemIds.length} problems
          </div>
        </div>
        ${c.status === 'live' ? '<span class="live-pill"><div class="live-dot" style="width:6px;height:6px"></div>LIVE</span>' : ''}
      </div>`).join('')
    : '<div class="empty"><div class="empty-ico">📋</div><div class="empty-lbl">No active contests right now</div></div>';

  // Daily problem
  const daily = S.problems.find(p => p.dailyDate === getTodayStr()) || S.problems[0];
  el('daily-badge').className = daily ? diffCls(daily.difficulty) : 'diff-easy';
  el('home-daily').innerHTML = daily ? `
    <div style="font-size:17px;font-weight:800;margin-bottom:6px;line-height:1.25">${esc(daily.title)}</div>
    <div style="font-size:12.5px;color:var(--t1);line-height:1.7;margin-bottom:14px">
      ${esc(daily.description.slice(0, 150))}${daily.description.length > 150 ? '…' : ''}
    </div>
    <div class="fx ic sb flex-wrap gap3">
      <div class="fx gap2 flex-wrap">${daily.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <button class="btn btn-blue btn-md" onclick="nav('judge',{problemId:'${daily.id}',backView:'home'})">Solve →</button>
    </div>` : '<div class="empty"><div class="empty-ico">📚</div><div class="empty-lbl">No problem today</div></div>';

  // Mini scoreboard
  const lb = buildLeaderboard().slice(0, 8);
  el('home-scoreboard').innerHTML = lb.length ? lb.map((p, i) => `
    <div class="fx ic gap2 ${S.user && p.userId === S.user.userId ? 'sb-me' : ''}"
         style="padding:9px 14px;${i < lb.length - 1 ? 'border-bottom:1px solid var(--line);' : ''}">
      <div class="rm ${i === 0 ? 'rm1' : i === 1 ? 'rm2' : i === 2 ? 'rm3' : 'rmn'}">${i + 1}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;color:${S.user && p.userId === S.user.userId ? 'var(--ind)' : 'var(--t0)'};font-weight:500" class="trunc">
          ${esc(p.username)}
        </div>
        <div style="font-size:10px;color:var(--t3)">${p.solved} solved</div>
      </div>
      <div style="font-size:13.5px;font-weight:800;color:var(--gold);font-variant-numeric:tabular-nums">${fmtN(p.score)}</div>
    </div>`).join('') : '<div class="empty"><div class="empty-ico">🏆</div><div class="empty-lbl">No scores yet</div></div>';

  // Progress card
  const pct = total ? Math.round(solved.size / total * 100) : 0;
  el('home-progress').innerHTML = `
    <div style="margin-bottom:16px">
      <div class="fx ic sb" style="font-size:11px;color:var(--t2);margin-bottom:6px">
        <span style="font-weight:600;letter-spacing:.4px;text-transform:uppercase">Overall</span>
        <span style="font-weight:700;color:var(--t1)">${solved.size}<span style="color:var(--t3)">/${total}</span></span>
      </div>
      <div class="pbar"><div class="pfill" style="width:${pct}%;background:var(--grad-ind)"></div></div>
    </div>
    ${['Easy', 'Medium', 'Hard', 'Expert'].map(d => {
      const dp   = S.problems.filter(p => p.difficulty === d);
      const ds   = dp.filter(p => solved.has(p.id)).length;
      const dp2  = Math.round(dp.length ? ds / dp.length * 100 : 0);
      const color = d === 'Easy' ? 'var(--grn)' : d === 'Medium' ? 'var(--gold)' : d === 'Hard' ? 'var(--rose)' : 'var(--violet)';
      return dp.length ? `
        <div style="margin-bottom:10px">
          <div class="fx ic sb" style="margin-bottom:5px">
            <span class="${diffCls(d)}">${d}</span>
            <span style="font-size:11px;color:var(--t3)">${ds}/${dp.length}</span>
          </div>
          <div class="pbar"><div class="pfill" style="width:${dp2}%;background:${color}"></div></div>
        </div>` : '';
    }).join('')}`;
}

function getUserRank() {
  if (!S.user) return '—';
  const lb = buildLeaderboard();
  const i  = lb.findIndex(e => e.userId === S.user.userId);
  return i >= 0 ? `#${i + 1}` : '—';
}

function buildLeaderboard() {
  return LS.values('user:')
    .filter(u => u && u.userId)
    .map(u => ({ userId: u.userId, username: u.username, score: u.score || 0, solved: u.solved || 0, role: u.role }))
    .sort((a, b) => b.score - a.score);
}

function renderTopRight() {
  const area = el('topright');
  if (S.user) {
    area.innerHTML = `
      <div class="fx ic gap3">
        ${roleBadge(S.user.role)}
        <div style="display:flex;align-items:center;gap:7px">
          <div class="user-avatar">${esc(S.user.username[0].toUpperCase())}</div>
          <div>
            <div style="font-size:12px;color:var(--t0)">${esc(S.user.username)}</div>
            <div style="font-size:11px;color:var(--gold);font-weight:700">${fmtN(S.user.score || 0)} pts</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="doLogout()">Logout</button>
      </div>`;
    const showAdmin = isMaster();
    ['nav-admin', 'sb-admin'].forEach(id => { const e = el(id); if (e) e.style.display = showAdmin ? '' : 'none'; });
    tog('btn-create-contest', showAdmin);
  } else {
    area.innerHTML = `<button class="btn btn-primary btn-sm" onclick="openAuth('login')">Sign In</button>`;
    ['nav-admin', 'sb-admin'].forEach(id => { const e = el(id); if (e) e.style.display = 'none'; });
    hide('btn-create-contest');
  }
}

function renderSidebar() {
  el('sb-online').textContent = S.onlineCount;
  const live = S.contests.filter(c => c.status === 'live').length;
  el('sb-live-count').textContent = live;
}
