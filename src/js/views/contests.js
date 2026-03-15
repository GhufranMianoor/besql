/**
 * views/contests.js — Contest list, detail, and custom contest creator.
 */
'use strict';

/* ── Contest list ───────────────────────────────────────── */
function renderContests() {
  const filter = (el('contest-filter') || {}).value || 'all';
  const list   = filter === 'all' ? S.contests : S.contests.filter(c => c.status === filter);
  el('contest-list').innerHTML = list.length
    ? list.map(c => contestCardHTML(c)).join('')
    : '<div class="empty"><div class="empty-ico">📋</div><div class="empty-lbl">No contests found</div></div>';
}

function filterContests() { renderContests(); }

function contestCardHTML(c) {
  const probs    = S.problems.filter(p => c.problemIds.includes(p.id));
  const timeLeft = c.status === 'live' ? Math.max(0, c.endTime - Date.now()) : -1;
  return `
    <div class="contest-card ${c.status} mb3" onclick="nav('contest-detail','${c.id}')">
      <div class="fx ic sb mb2">
        <div class="fx ic gap3">
          ${c.status === 'live'
            ? '<span class="live-pill"><div class="live-dot" style="width:6px;height:6px"></div>LIVE</span>'
            : c.status === 'upcoming'
              ? '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--idim);color:var(--ind);border:1px solid rgba(77,158,255,.3)">UPCOMING</span>'
              : '<span style="font-size:10px;color:var(--t3);padding:2px 8px;border-radius:10px;border:1px solid var(--line)">ENDED</span>'}
          <span style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:1px">${c.type === 'custom' ? 'Custom' : 'Official'}</span>
        </div>
        <span style="font-size:11px;color:var(--t2)">${probs.length} problems · ${fmtDur(c.duration * 60000)}</span>
      </div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;line-height:1.3">${esc(c.title)}</div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:12px;line-height:1.6">${esc(c.description)}</div>
      <div class="fx ic gap3 flex-wrap">
        ${probs.map(p => `<span class="tag">${esc(p.title)}</span>`).join('')}
        <div style="margin-left:auto;font-size:11px;color:var(--t2)">
          ${c.status === 'live'
            ? `Ends in ${fmtDur(timeLeft)}`
            : c.status === 'upcoming'
              ? `Starts ${fmtDate(c.startTime)}`
              : `Ended ${fmtDate(c.endTime)}`}
        </div>
      </div>
    </div>`;
}

/* ── Contest detail ─────────────────────────────────────── */
function renderContestDetail(contestId) {
  const cid = contestId || S.currentContest;
  S.currentContest = cid;
  const c = S.contests.find(x => x.id === cid);
  if (!c) { nav('contests'); return; }

  el('cd-title').textContent = c.title;
  const probs = S.problems.filter(p => c.problemIds.includes(p.id));

  el('cd-meta').innerHTML = `
    ${c.status === 'live' ? '<span class="live-pill"><div class="live-dot" style="width:6px;height:6px"></div>LIVE</span>' : ''}
    <span style="font-size:11px;color:var(--t2)">${probs.length} problems</span>
    <span style="font-size:11px;color:var(--t2)">${fmtDur(c.duration * 60000)}</span>
    ${c.isPublic ? '<span class="tag">Public</span>' : '<span class="tag">Private</span>'}`;

  const timerWrap = el('cd-timer-wrap');
  if (c.status === 'live') {
    const left = Math.max(0, Math.floor((c.endTime - Date.now()) / 1000));
    timerWrap.innerHTML = `
      <div style="text-align:right">
        <div style="font-size:10px;color:var(--t3);letter-spacing:1px">TIME LEFT</div>
        <div class="countdown" id="cd-countdown">${fmtT(left)}</div>
      </div>`;
    startContestCountdown(c.endTime);
  } else {
    timerWrap.innerHTML = '';
  }

  renderCDProblems(c, probs);
  renderCDScoreboard(c);
  renderCDSubs(c);
  renderCDAnnounce(c);
}

function startContestCountdown(endTime) {
  if (window._cdInterval) clearInterval(window._cdInterval);
  window._cdInterval = setInterval(() => {
    const left  = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    const elc   = el('cd-countdown');
    if (elc) { elc.textContent = fmtT(left); if (left < 300) elc.classList.add('urgent'); }
    if (left <= 0) clearInterval(window._cdInterval);
  }, 1000);
}

function renderCDProblems(c, probs) {
  const solved = getSolvedIds();
  el('cd-problems').innerHTML = `<div class="card">${probs.length
    ? probs.map((p, i) => `
      <div class="prob-row ${solved.has(p.id) ? 'solved' : ''}"
           onclick="nav('judge',{problemId:'${p.id}',contestId:'${c.id}',backView:'contest-detail'})">
        <div class="prob-num">${String.fromCharCode(65 + i)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:var(--t0)">${esc(p.title)}</div>
          <div class="fx ic gap2 mt1">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        </div>
        <div class="fx ic gap3">
          <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
          <span style="font-size:12px;color:var(--gold);font-weight:700">${p.points}pt</span>
          ${solved.has(p.id) ? '<span style="color:var(--grn);font-weight:700;font-size:12px">AC</span>' : ''}
          ${c.status !== 'ended'
            ? `<button class="btn btn-blue btn-xs" onclick="event.stopPropagation();nav('judge',{problemId:'${p.id}',contestId:'${c.id}',backView:'contest-detail'})">Solve</button>`
            : ''}
        </div>
      </div>`).join('')
    : '<div class="empty"><div class="empty-ico">—</div></div>'}
  </div>`;
}

function renderCDScoreboard(c) {
  const lb = buildLeaderboard();
  el('cd-scoreboard').innerHTML = `
    <div class="card"><div class="tw"><table class="tbl">
      <thead><tr><th>Rank</th><th>User</th><th>Score</th><th>Solved</th></tr></thead>
      <tbody>${lb.slice(0, 20).map((p, i) => `
        <tr class="${S.user && p.userId === S.user.userId ? 'sb-me' : ''}">
          <td><div class="rm ${i < 3 ? `rm${i + 1}` : 'rmn'}">${i + 1}</div></td>
          <td style="font-weight:${S.user && p.userId === S.user.userId ? 700 : 400};color:${S.user && p.userId === S.user.userId ? 'var(--ind)' : 'var(--t0)'}">${esc(p.username)}</td>
          <td style="color:var(--gold);font-weight:700">${fmtN(p.score)}</td>
          <td style="color:var(--grn)">${p.solved}</td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
}

function renderCDSubs(c) {
  const subs = S.submissions.filter(s => s.contestId === c.id);
  el('cd-my-subs').innerHTML = `<div class="card">${subs.length
    ? [...subs].reverse().map(s => {
        const p = S.problems.find(x => x.id === s.problemId);
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--line)">
            <span style="font-size:10px;color:var(--t3);width:120px;flex-shrink:0">${new Date(s.at).toLocaleTimeString()}</span>
            <span style="flex:1" class="trunc">${esc(p?.title || s.problemId)}</span>
            <span class="v-${s.verdict.toLowerCase()}">${s.verdict}</span>
            ${s.verdict === 'AC' ? `<span style="font-size:11px;color:var(--t2)">${s.timeTaken}s</span>` : ''}
          </div>`;
      }).join('')
    : '<div class="empty"><div class="empty-ico">📝</div><div class="empty-lbl">No submissions yet</div></div>'}
  </div>`;
}

function renderCDAnnounce(c) {
  el('cd-announces').innerHTML = c.announcement
    ? `<div class="card"><div class="card-body">
        <div style="font-size:11px;color:var(--t3);letter-spacing:1px;margin-bottom:6px">FROM ADMIN</div>
        <div style="font-size:13px;color:var(--t1);line-height:1.8">${esc(c.announcement)}</div>
       </div></div>`
    : '<div class="empty"><div class="empty-ico">📢</div><div class="empty-lbl">No announcements</div></div>';
}

function cdTab(tab, btn) {
  document.querySelectorAll('#view-contest-detail .tab-btn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('#view-contest-detail .tab-content').forEach(c => c.classList.add('hidden'));
  btn.classList.add('on');
  el(`cd-tab-${tab}`).classList.remove('hidden');
}

/* ── Custom contests ────────────────────────────────────── */
function renderCustom() {
  const mine = S.customContests.filter(c => c.createdBy === S.user?.userId);
  el('custom-my-list').innerHTML = mine.length
    ? mine.map(c => contestCardHTML({ ...c, type: 'custom' })).join('')
    : `<div class="empty">
        <div class="empty-ico">🏆</div>
        <div style="font-size:13px;color:var(--t2);margin-bottom:10px">No custom contests yet</div>
        <button class="btn btn-blue btn-md" onclick="openCustomCreator()">Create Your First Contest</button>
       </div>`;
  el('custom-inv-list').innerHTML = '<div class="empty"><div class="empty-ico">📨</div><div class="empty-lbl">No invitations</div></div>';
}

function openCustomCreator() {
  if (!S.user) { toast('Please sign in first', 'error'); return; }
  el('custom-creator-body').innerHTML = `
    <div class="fg"><label class="lbl">Contest Title</label><input class="inp" id="cc-title" placeholder="e.g. Study Group Round 1"></div>
    <div class="fg"><label class="lbl">Description</label><textarea class="ta" rows="3" id="cc-desc" placeholder="What is this contest about?"></textarea></div>
    <div class="g2">
      <div class="fg"><label class="lbl">Duration (minutes)</label><input class="inp" type="number" id="cc-dur" value="120"></div>
      <div class="fg"><label class="lbl">Visibility</label><select class="sel" id="cc-vis"><option value="private">Private (invite only)</option><option value="public">Public</option></select></div>
    </div>
    <div class="fg">
      <label class="lbl">Add Problem by Code</label>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input class="inp" id="cc-code-input" placeholder="e.g. BSQ-001"
               style="flex:1;font-family:var(--mono)" oninput="this.value=this.value.toUpperCase()"
               onkeydown="if(event.key==='Enter'){event.preventDefault();ccAddByCode();}">
        <button class="btn btn-ghost btn-sm" onclick="ccAddByCode()">Add</button>
      </div>
      <div id="cc-selected-problems" style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px"></div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:5px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Or pick from list</div>
      <div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto">
        ${S.problems.map(p => `
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 10px;border-radius:4px;background:var(--bg2);border:1px solid var(--line)"
                 onclick="setTimeout(ccRefreshSelected,10)">
            <input type="checkbox" class="cc-prob-check" value="${p.id}" id="cc-chk-${p.id}">
            <span style="font-size:10px;font-family:var(--mono);color:var(--grn);font-weight:700;width:64px;flex-shrink:0">${p.code || p.id.toUpperCase()}</span>
            <span style="flex:1;font-size:12px;color:var(--t1)">${esc(p.title)}</span>
            <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
            <span style="font-size:11px;color:var(--gold)">${p.points}pt</span>
          </label>`).join('')}
      </div>
    </div>
    <div class="fg">
      <label class="lbl">Invite Users (comma-separated usernames)</label>
      <input class="inp" id="cc-invite" placeholder="user1, user2, ...">
    </div>`;
  openModal('modal-custom');
  setTimeout(() => {
    const f = el('cc-title');
    if (f) f.focus();
    // Wire Enter key on single-line inputs (except cc-code-input which already has its own handler)
    document.querySelectorAll('#custom-creator-body .inp').forEach(inp => {
      if (inp.id === 'cc-code-input') return; // already handled inline
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); saveCustomContest(); }
      });
    });
  }, 100);
}

function ccAddByCode() {
  const inp = el('cc-code-input');
  if (!inp) return;
  const code = inp.value.trim().toUpperCase();
  if (!code) { toast('Enter a problem code', 'warn'); return; }
  const p = S.problems.find(x => (x.code || x.id.toUpperCase()) === code);
  if (!p) { toast(`No problem found: ${code}`, 'warn'); return; }
  const chk = document.getElementById(`cc-chk-${p.id}`);
  if (chk) chk.checked = true;
  inp.value = '';
  ccRefreshSelected();
  toast(`Added: ${p.title}`, 'success');
}

function ccRefreshSelected() {
  const checked = [...document.querySelectorAll('.cc-prob-check:checked')];
  const wrap    = el('cc-selected-problems');
  if (!wrap) return;
  wrap.innerHTML = checked.length
    ? `<div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">
        Selected (${checked.length})
       </div>` + checked.map(chk => {
        const p = S.problems.find(x => x.id === chk.value);
        if (!p) return '';
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--gdim);border:1px solid rgba(46,200,102,.2);border-radius:4px">
            <span style="font-size:10px;font-family:var(--mono);color:var(--grn);font-weight:700">${p.code || p.id.toUpperCase()}</span>
            <span style="flex:1;font-size:12px;color:var(--t0)">${esc(p.title)}</span>
            <button class="btn btn-ghost btn-xs" onclick="document.getElementById('cc-chk-${p.id}').checked=false;ccRefreshSelected()">×</button>
          </div>`;
      }).join('')
    : '';
}

function saveCustomContest() {
  const title = (el('cc-title') || {}).value?.trim();
  if (!title) { toast('Enter a title', 'warn'); return; }
  const ids = [...document.querySelectorAll('.cc-prob-check:checked')].map(c => c.value);
  if (!ids.length) { toast('Select at least one problem', 'warn'); return; }
  const c = {
    id: genId(), title,
    description: (el('cc-desc') || {}).value?.trim() || '',
    duration: parseInt((el('cc-dur') || {}).value) || 120,
    isPublic: (el('cc-vis') || {}).value === 'public',
    problemIds: ids, type: 'custom', status: 'upcoming',
    createdBy: S.user.userId,
    startTime: Date.now() + 3600000,
    endTime:   Date.now() + 3600000 + 7200000,
    announcement: '',
    invitees: ((el('cc-invite') || {}).value || '').split(',').map(u => u.trim()).filter(Boolean),
  };
  S.customContests.push(c);
  LS.set(`custom:${S.user.userId}`, S.customContests);
  closeModal('modal-custom');
  renderCustom();
  toast('Custom contest created!', 'success');
}

function customTab(tab, btn) {
  document.querySelectorAll('#view-custom .tab-btn').forEach(b => b.classList.remove('on'));
  ['my', 'invited'].forEach(t => el(`custom-tab-${t}`).classList.add('hidden'));
  btn.classList.add('on');
  el(`custom-tab-${tab}`).classList.remove('hidden');
}
