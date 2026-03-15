/**
 * views/profile.js — User profile page.
 */
'use strict';

function renderProfile() {
  if (!S.user) {
    el('profile-content').innerHTML = `
      <div class="empty" style="padding-top:80px">
        <div style="font-size:15px;color:var(--t2);margin-bottom:14px">Sign in to view your profile</div>
        <button class="btn btn-primary btn-md" onclick="openAuth()">Sign In</button>
      </div>`;
    return;
  }
  const u      = S.user;
  const solved = getSolvedIds();
  const rank   = buildLeaderboard().findIndex(e => e.userId === u.userId) + 1;

  el('profile-content').innerHTML = `
    <!-- ── Header card ── -->
    <div style="display:flex;align-items:center;gap:20px;padding:22px;background:var(--bg1);border:1px solid var(--line);border-radius:10px;margin-bottom:16px">
      <div style="width:60px;height:60px;border-radius:10px;background:var(--bg3);border:2px solid var(--ind);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:var(--grn)">
        ${esc(u.username[0].toUpperCase())}
      </div>
      <div style="flex:1">
        <div style="font-size:24px;font-weight:900;letter-spacing:2px">${esc(u.username)}</div>
        <div class="fx ic gap3 mt1">
          ${roleBadge(u.role)}
          <span style="font-size:11px;color:var(--t3)">Member since ${new Date(u.joinedAt || Date.now()).toLocaleDateString()}</span>
        </div>
      </div>
      ${rank > 0 ? `
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--gold);line-height:1;font-variant-numeric:tabular-nums">#${rank}</div>
          <div style="font-size:10px;color:var(--t3);letter-spacing:1px">GLOBAL RANK</div>
        </div>` : ''}
    </div>

    <!-- ── Stat tiles ── -->
    <div class="g4 mb4">
      ${[
        ['SCORE',       fmtN(u.score || 0), 'var(--gold)'],
        ['SOLVED',      u.solved || 0,       'var(--grn)'],
        ['SUBMISSIONS', S.submissions.length, 'var(--ind)'],
        ['STREAK',      u.streak || 0,        'var(--gold)'],
      ].map(([l, v, c]) => `
        <div class="stat">
          <div class="stat-v" style="color:${c}">${v}</div>
          <div class="stat-l">${l}</div>
        </div>`).join('')}
    </div>

    <!-- ── Two-column grid ── -->
    <div class="g2">
      <!-- Solved problems -->
      <div class="card">
        <div class="card-hdr"><div class="card-title">Solved Problems</div></div>
        <div>
          ${S.problems.filter(p => solved.has(p.id)).map(p => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)">
              <span style="color:var(--grn);font-weight:700;font-size:11px">AC</span>
              <div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--t0)">${esc(p.title)}</div></div>
              <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
              <span style="color:var(--gold);font-weight:700;font-size:13px">+${p.points}</span>
            </div>`).join('') || '<div class="empty"><div class="empty-ico">—</div></div>'}
        </div>
      </div>
      <!-- Recent submissions -->
      <div class="card">
        <div class="card-hdr"><div class="card-title">Recent Submissions</div></div>
        <div>
          ${S.submissions.slice(0, 8).map(s => {
            const p  = S.problems.find(x => x.id === s.problemId);
            const vc = s.verdict === 'AC' ? 'var(--grn)' : s.verdict === 'WA' ? 'var(--rose)' : s.verdict === 'TLE' ? 'var(--gold)' : 'var(--violet)';
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)">
                <span style="color:${vc};font-weight:700;font-size:11px;width:36px">${s.verdict}</span>
                <div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--t0)" class="trunc">${esc(p?.title || '—')}</div></div>
                <span style="font-size:10px;color:var(--t3)">${new Date(s.at).toLocaleDateString()}</span>
              </div>`;
          }).join('') || '<div class="empty"><div class="empty-ico">—</div></div>'}
        </div>
      </div>
    </div>`;
}
