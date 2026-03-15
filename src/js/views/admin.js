/**
 * views/admin.js — Admin panel view (problem bank, contests, users, announcements, analytics).
 *
 * Only accessible to users with role === 'admin' or 'master'.
 */
'use strict';

function renderAdmin() {
  if (!isMaster()) {
    el('view-admin').innerHTML = `
      <div class="empty" style="padding:80px">
        <div style="font-size:40px;margin-bottom:12px">🔒</div>
        <div style="font-size:13px;color:var(--t3)">Access Denied — insufficient permissions.</div>
      </div>`;
    return;
  }
  renderAdminTab(S.adminSubTab);
}

function adminTab(tab, btn) {
  S.adminSubTab = tab;
  document.querySelectorAll('#view-admin .tab-btn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('#view-admin .tab-content').forEach(c => c.classList.add('hidden'));
  btn.classList.add('on');
  el(`admin-tab-${tab}`).classList.remove('hidden');
  renderAdminTab(tab);
}

function renderAdminTab(tab) {
  if (tab === 'problems')  renderAdminProblems();
  if (tab === 'contests')  renderAdminContests();
  if (tab === 'users')     renderAdminUsers();
  if (tab === 'announce')  renderAdminAnnounce();
  if (tab === 'analytics') renderAdminAnalytics();
}

/* ── Problem bank ───────────────────────────────────────── */
function renderAdminProblems() {
  const c = el('admin-tab-problems');
  c.innerHTML = `
    <div class="fx ic sb mb3">
      <div style="font-size:14px;font-weight:600;color:var(--t0)">Problem Bank (${S.problems.length})</div>
      <button class="btn btn-blue btn-sm" onclick="openProblemEditor()">+ New Problem</button>
    </div>
    <div class="card"><div class="tw"><table class="tbl">
      <thead><tr><th>Code</th><th>Title</th><th>Difficulty</th><th>Points</th><th>Tests</th><th>Category</th><th>Daily</th><th>Actions</th></tr></thead>
      <tbody>${S.problems.map(p => `
        <tr>
          <td style="font-family:var(--mono);font-size:11px;color:var(--grn)">${esc(p.code || p.id)}</td>
          <td style="font-weight:600;color:var(--t0)">${esc(p.title)}</td>
          <td><span class="${diffCls(p.difficulty)}">${p.difficulty}</span></td>
          <td style="color:var(--gold)">${p.points}</td>
          <td style="color:var(--ind)">${p.testCases.length}</td>
          <td style="color:var(--t2)">${esc(p.category)}</td>
          <td>${p.dailyDate ? `<span style="font-size:10px;color:var(--grn)">${p.dailyDate}</span>` : '<span style="color:var(--t3)">—</span>'}</td>
          <td><div class="fx gap2">
            <button class="btn btn-ghost btn-xs" onclick="openProblemEditor('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-xs" onclick="deleteProblem('${p.id}')">Del</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
}

/* ── Contest management ─────────────────────────────────── */
function renderAdminContests() {
  const c = el('admin-tab-contests');
  c.innerHTML = `
    <div class="fx ic sb mb3">
      <div style="font-size:14px;font-weight:600;color:var(--t0)">Contests (${S.contests.length})</div>
      <button class="btn btn-blue btn-sm" onclick="openContestCreator()">+ New Contest</button>
    </div>
    <div class="card"><div class="tw"><table class="tbl">
      <thead><tr><th>Title</th><th>Status</th><th>Problems</th><th>Duration</th><th>Start</th><th>Actions</th></tr></thead>
      <tbody>${S.contests.map(c2 => `
        <tr>
          <td style="font-weight:600;color:var(--t0)">${esc(c2.title)}</td>
          <td><span class="v-${c2.status === 'live' ? 'ac' : c2.status === 'upcoming' ? 'pending' : 'pe'}">${c2.status.toUpperCase()}</span></td>
          <td style="color:var(--ind)">${c2.problemIds.length}</td>
          <td style="color:var(--t2)">${fmtDur(c2.duration * 60000)}</td>
          <td style="font-size:11px;color:var(--t2)">${fmtDate(c2.startTime)}</td>
          <td><div class="fx gap2">
            <button class="btn btn-ghost btn-xs" onclick="openContestCreator('${c2.id}')">Edit</button>
            ${c2.status === 'upcoming' ? `<button class="btn btn-success btn-xs" onclick="launchContest('${c2.id}')">Launch</button>` : ''}
            ${c2.status === 'live'     ? `<button class="btn btn-danger btn-xs"  onclick="endContest('${c2.id}')">End</button>` : ''}
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
}

/* ── User management ────────────────────────────────────── */
function renderAdminUsers() {
  const allUsers = LS.values('user:').filter(u => u?.userId);
  const c = el('admin-tab-users');
  c.innerHTML = `
    <div class="card"><div class="tw"><table class="tbl">
      <thead><tr><th>Username</th><th>Role</th><th>Score</th><th>Solved</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>${allUsers.map(u => `
        <tr>
          <td style="font-weight:600;color:var(--t0)">${esc(u.username)}</td>
          <td>${roleBadge(u.role)}</td>
          <td style="color:var(--gold)">${fmtN(u.score || 0)}</td>
          <td style="color:var(--grn)">${u.solved || 0}</td>
          <td style="font-size:11px;color:var(--t2)">${new Date(u.joinedAt || Date.now()).toLocaleDateString()}</td>
          <td><div class="fx gap2">
            <select class="sel" style="width:120px;font-size:11px;padding:3px 8px"
                    onchange="changeUserRole('${u.username}',this.value)">
              ${['contestant', 'master', 'admin'].map(r =>
                `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`
              ).join('')}
            </select>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
}

function changeUserRole(username, role) {
  const u = LS.get(`user:${username}`);
  if (!u) return;
  u.role = role;
  LS.set(`user:${username}`, u);
  if (S.user && S.user.username === username) { S.user.role = role; renderTopRight(); }
  toast(`${username} is now ${role}`, 'success');
}

/* ── Announcements ─────────────────────────────────────── */
function renderAdminAnnounce() {
  const c = el('admin-tab-announce');
  c.innerHTML = `
    <div class="card">
      <div class="card-hdr"><div class="card-title">Global Announcement</div></div>
      <div class="card-body">
        <div class="fg">
          <label class="lbl">Message</label>
          <textarea class="ta" rows="4" id="ann-msg"
                    placeholder="Announcement visible to all users...">${esc(LS.get('announcement') || '')}</textarea>
        </div>
        <div class="fx gap3">
          <button class="btn btn-blue btn-md" onclick="saveAnnouncement()">Publish</button>
          <button class="btn btn-danger btn-md" onclick="clearAnnouncement()">Clear</button>
        </div>
      </div>
    </div>`;
}

function saveAnnouncement() {
  const msg = (el('ann-msg') || {}).value?.trim();
  LS.set('announcement', msg);
  if (msg) { el('announce-text').textContent = msg; show('announce-bar'); }
  else hide('announce-bar');
  toast('Announcement published', 'success');
}

function clearAnnouncement() { LS.del('announcement'); hide('announce-bar'); toast('Cleared', 'info'); }

/* ── Analytics ─────────────────────────────────────────── */
function renderAdminAnalytics() {
  const allSubs = () => LS.values('subs:').flat();
  const c = el('admin-tab-analytics');
  c.innerHTML = `
    <div class="g4 mb4">
      ${[
        ['Problems',    S.problems.length,                              'var(--ind)'],
        ['Contests',    S.contests.length,                              'var(--sky)'],
        ['Total Users', LS.keys('user:').length,                        'var(--gold)'],
        ['Live Now',    S.contests.filter(c => c.status === 'live').length, 'var(--grn)'],
      ].map(([l, v, c2]) => `<div class="stat"><div class="stat-v" style="color:${c2}">${v}</div><div class="stat-l">${l}</div></div>`).join('')}
    </div>
    <div class="g2">
      <div class="card">
        <div class="card-hdr"><div class="card-title">Acceptance Rate</div></div>
        <div class="card-body">
          ${S.problems.map(p => {
            const subs    = allSubs().filter(s => s.problemId === p.id);
            const acSubs  = subs.filter(s => s.verdict === 'AC').length;
            const rate    = subs.length ? Math.round(acSubs / subs.length * 100) : 0;
            return `
              <div style="margin-bottom:10px">
                <div class="fx ic sb mb1">
                  <span style="font-size:12px;color:var(--t1)">${esc(p.title)}</span>
                  <span style="font-size:11px;color:var(--t2)">${rate}%</span>
                </div>
                <div class="pbar"><div class="pfill" style="width:${rate}%;background:var(--grn)"></div></div>
              </div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">Difficulty Distribution</div></div>
        <div class="card-body">
          ${['Easy', 'Medium', 'Hard', 'Expert'].map(d => {
            const count = S.problems.filter(p => p.difficulty === d).length;
            const pct   = S.problems.length ? Math.round(count / S.problems.length * 100) : 0;
            const color = d === 'Easy' ? 'var(--grn)' : d === 'Medium' ? 'var(--gold)' : d === 'Hard' ? 'var(--rose)' : 'var(--violet)';
            return `
              <div style="margin-bottom:12px">
                <div class="fx ic sb mb1">
                  <span class="${diffCls(d)}">${d}</span>
                  <span style="font-size:11px;color:var(--t2)">${count}</span>
                </div>
                <div class="pbar"><div class="pfill" style="width:${pct}%;background:${color}"></div></div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* ── Problem editor modal ───────────────────────────────── */
function openProblemEditor(id) {
  if (!isMaster()) { toast('Permission denied', 'error'); return; }
  const existing = id ? S.problems.find(p => p.id === id) : null;
  S.editingProblem = existing
    ? { ...existing, _existing: true }
    : { id: genId(), title: '', difficulty: 'Easy', points: 100, timeLimit: 300, category: 'Filtering', tags: [], description: '', solution: '', testCases: [], dailyDate: null, _existing: false };
  el('prob-editor-title').textContent = id ? 'EDIT PROBLEM' : 'NEW PROBLEM';
  const p = S.editingProblem;
  el('prob-editor-body').innerHTML = `
    <div class="g2">
      <div class="fg"><label class="lbl">Title *</label><input class="inp" id="pe-title" value="${esc(p.title)}" placeholder="Problem title..."></div>
      <div class="fg"><label class="lbl">Category</label><input class="inp" id="pe-cat" value="${esc(p.category)}" placeholder="Filtering, Joins..."></div>
    </div>
    <div class="g3">
      <div class="fg"><label class="lbl">Difficulty</label>
        <select class="sel" id="pe-diff">${['Easy', 'Medium', 'Hard', 'Expert'].map(d => `<option${p.difficulty === d ? ' selected' : ''}>${d}</option>`).join('')}</select>
      </div>
      <div class="fg"><label class="lbl">Points</label><input class="inp" type="number" id="pe-pts" value="${p.points}"></div>
      <div class="fg"><label class="lbl">Time Limit (s)</label><input class="inp" type="number" id="pe-tl" value="${p.timeLimit}"></div>
    </div>
    <div class="fg">
      <label class="lbl">Tags (comma separated)</label>
      <input class="inp" id="pe-tags" value="${esc(Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''))}" placeholder="WHERE, JOIN, GROUP BY">
    </div>
    <div class="fg"><label class="lbl">Description *</label><textarea class="ta" rows="5" id="pe-desc" placeholder="Problem statement...">${esc(p.description)}</textarea></div>
    <div class="fg">
      <label class="lbl">Reference Solution * (used to auto-generate test cases)</label>
      <textarea class="ta code-ta" rows="5" id="pe-sol" placeholder="SELECT ...">${esc(p.solution)}</textarea>
      <div class="fx ic gap3 mt2">
        <button class="btn btn-ghost btn-sm" onclick="testProblemSol()">▶ Test Solution</button>
        <span id="pe-sol-res" style="font-size:11px"></span>
      </div>
      <div id="pe-sol-table" class="hidden mt2"></div>
    </div>
    <div class="fg">
      <div class="fx ic sb mb2">
        <label class="lbl" style="margin:0">Test Cases</label>
        <button class="btn btn-ghost btn-sm" onclick="addTestCase()">+ Add Test</button>
      </div>
      <div id="pe-tcs">${renderTCEditor(p.testCases)}</div>
    </div>
    <div class="fg">
      <label class="lbl">Set as Daily Problem</label>
      <input class="inp" id="pe-daily" type="date" value="${p.dailyDate || ''}" style="width:180px">
    </div>`;
  openModal('modal-problem');
  setTimeout(() => {
    const f = el('pe-title');
    if (f) f.focus();
    // Wire Enter key on single-line inputs to save the problem
    document.querySelectorAll('#prob-editor-body .inp').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); saveProblem(); }
      });
    });
  }, 100);
}

function renderTCEditor(tcs) {
  if (!tcs || !tcs.length) return '<div style="font-size:12px;color:var(--t3);padding:8px">No test cases. Add some or they will be auto-generated from the solution.</div>';
  return tcs.map((tc, i) => `
    <div style="background:var(--bg2);border:1px solid var(--line);border-radius:5px;padding:10px 12px;margin-bottom:8px">
      <div class="fx ic sb mb2">
        <span style="font-size:11px;color:var(--t2);font-weight:600">Test Case ${i + 1}</span>
        <button class="btn btn-danger btn-xs" onclick="removeTC(${i})">×</button>
      </div>
      <div class="g2">
        <div class="fg" style="margin-bottom:6px"><label class="lbl">Name</label><input class="inp" id="tc-name-${i}" value="${esc(tc.name)}" placeholder="e.g. Row Count"></div>
        <div class="fg" style="margin-bottom:6px"><label class="lbl">Description</label><input class="inp" id="tc-desc-${i}" value="${esc(tc.desc)}" placeholder="What this checks..."></div>
      </div>
    </div>`).join('');
}

function addTestCase() {
  if (!S.editingProblem) return;
  S.editingProblem.testCases = [...(S.editingProblem.testCases || []), { id: genId(), name: '', desc: '', hint: '' }];
  el('pe-tcs').innerHTML = renderTCEditor(S.editingProblem.testCases);
}

function removeTC(i) {
  if (!S.editingProblem) return;
  S.editingProblem.testCases.splice(i, 1);
  el('pe-tcs').innerHTML = renderTCEditor(S.editingProblem.testCases);
}

function testProblemSol() {
  const sol = (el('pe-sol') || {}).value?.trim();
  if (!sol) return;
  const res = runSQL(sol, DB);
  const tr  = el('pe-sol-res');
  const tt  = el('pe-sol-table');
  if (res.error) { tr.style.color = 'var(--rose)'; tr.textContent = res.error; hide(tt); return; }
  tr.style.color = 'var(--grn)'; tr.textContent = `${res.rowCount} rows`;
  if (res.rowCount > 0) {
    tt.innerHTML = `
      <div class="tw" style="max-height:140px;overflow-y:auto">
        <table class="tbl">
          <thead><tr>${res.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${res.rows.slice(0, 5).map(row => `<tr>${row.map(cell => `<td>${esc(String(cell ?? 'NULL'))}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`;
    show(tt);
  }
}

function saveProblem() {
  const title    = (el('pe-title') || {}).value?.trim();
  const solution = (el('pe-sol')   || {}).value?.trim();
  if (!title || !solution) { toast('Title and solution are required', 'warn'); return; }

  const ref     = runSQL(solution, DB);
  const refRows = ref.rowCount;
  const tags    = ((el('pe-tags') || {}).value || '').split(',').map(t => t.trim()).filter(Boolean);

  const existingTCs = S.editingProblem.testCases || [];
  const tcs = existingTCs.length > 0
    ? existingTCs.map((tc, i) => ({
        ...tc,
        name:     (el(`tc-name-${i}`) || {}).value || tc.name || `Test ${i + 1}`,
        desc:     (el(`tc-desc-${i}`) || {}).value || tc.desc || '',
        validate: r => { if (r.error || !r.rows) return false; return r.rowCount === refRows; },
      }))
    : [
        { id: genId(), name: 'Row Count',    desc: `Must return ${refRows} rows`,             validate: r => !r.error && r.rowCount === refRows },
        { id: genId(), name: 'No SQL Error', desc: 'Query must execute without errors',        validate: r => !r.error },
      ];

  const updated = {
    ...S.editingProblem, title, solution,
    difficulty:  (el('pe-diff') || {}).value  || 'Easy',
    points:      parseInt((el('pe-pts')  || {}).value) || 100,
    timeLimit:   parseInt((el('pe-tl')   || {}).value) || 300,
    category:    (el('pe-cat')  || {}).value?.trim() || 'General',
    description: (el('pe-desc') || {}).value?.trim(),
    tags, testCases: tcs,
    dailyDate:   (el('pe-daily') || {}).value || null,
  };

  if (S.editingProblem._existing) {
    const idx = S.problems.findIndex(p => p.id === updated.id);
    if (idx >= 0) S.problems[idx] = updated;
  } else {
    S.problems.push(updated);
  }

  persistProblems();
  if (CONFIG.USE_SUPABASE && supabaseClient) {
    SB.saveProblem(updated).catch(e => console.error('[BeSQL] Problem save failed:', e));
  }
  closeModal('modal-problem');
  renderAdminProblems();
  toast('Problem saved', 'success');
}

function deleteProblem(id) {
  if (!confirm('Delete this problem?')) return;
  S.problems = S.problems.filter(p => p.id !== id);
  persistProblems();
  if (CONFIG.USE_SUPABASE && supabaseClient) {
    SB.deleteProblem(id).catch(e => console.error('[BeSQL] Problem delete failed:', e));
  }
  renderAdminProblems();
  toast('Deleted', 'info');
}

/* ── Contest editor modal ───────────────────────────────── */
function openContestCreator(id) {
  if (!isMaster()) { toast('Permission denied', 'error'); return; }
  const ex = id ? S.contests.find(c => c.id === id) : null;
  S.editingContest = ex
    ? { ...ex, _existing: true }
    : {
        id: genId(), title: '', description: '', type: 'official', status: 'upcoming',
        startTime: Date.now() + 86400000, endTime: Date.now() + 86400000 + 7200000,
        duration: 120, problemIds: [], isPublic: true, maxParticipants: 500,
        announcement: '', createdBy: S.user?.userId, _existing: false,
      };
  el('contest-editor-title').textContent = id ? 'EDIT CONTEST' : 'CREATE CONTEST';
  const c        = S.editingContest;
  const startVal = new Date(c.startTime).toISOString().slice(0, 16);
  el('contest-editor-body').innerHTML = `
    <div class="fg"><label class="lbl">Title *</label><input class="inp" id="ce-title" value="${esc(c.title)}" placeholder="Contest title..."></div>
    <div class="fg"><label class="lbl">Description</label><textarea class="ta" rows="3" id="ce-desc">${esc(c.description)}</textarea></div>
    <div class="g3">
      <div class="fg"><label class="lbl">Duration (min)</label><input class="inp" type="number" id="ce-dur" value="${c.duration}"></div>
      <div class="fg"><label class="lbl">Max Participants</label><input class="inp" type="number" id="ce-max" value="${c.maxParticipants}"></div>
      <div class="fg"><label class="lbl">Type</label>
        <select class="sel" id="ce-type">
          <option value="official" ${c.type === 'official' ? 'selected' : ''}>Official</option>
          <option value="custom"   ${c.type === 'custom'   ? 'selected' : ''}>Custom</option>
        </select>
      </div>
    </div>
    <div class="fg"><label class="lbl">Start Time</label><input class="inp" type="datetime-local" id="ce-start" value="${startVal}"></div>
    <div class="fg"><label class="lbl">Announcement / Message</label><textarea class="ta" rows="2" id="ce-ann">${esc(c.announcement || '')}</textarea></div>
    <div class="fg">
      <label class="lbl">Problems</label>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;padding:8px 0">
        ${S.problems.map(p => `
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:7px 10px;border-radius:5px;background:var(--bg2);border:1px solid var(--line)">
            <input type="checkbox" class="ce-prob-check" value="${p.id}" ${c.problemIds.includes(p.id) ? 'checked' : ''}>
            <span style="flex:1;font-size:12px;color:var(--t1)">${esc(p.title)}</span>
            <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
          </label>`).join('')}
      </div>
    </div>
    <div class="fg">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--t1)">
        <input type="checkbox" id="ce-pub" ${c.isPublic ? 'checked' : ''}> Public contest (visible to all)
      </label>
    </div>`;
  openModal('modal-contest');
  setTimeout(() => {
    const f = el('ce-title');
    if (f) f.focus();
    // Wire Enter key on single-line inputs to save the contest
    document.querySelectorAll('#contest-editor-body .inp').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); saveContest(); }
      });
    });
  }, 100);
}

function saveContest() {
  const title = (el('ce-title') || {}).value?.trim();
  if (!title) { toast('Enter a title', 'warn'); return; }
  const ids = [...document.querySelectorAll('.ce-prob-check:checked')].map(c => c.value);
  if (!ids.length) { toast('Select at least one problem', 'warn'); return; }
  const dur     = parseInt((el('ce-dur')   || {}).value) || 120;
  const startTs = new Date((el('ce-start') || {}).value).getTime() || Date.now() + 86400000;
  const updated = {
    ...S.editingContest, title,
    description:     (el('ce-desc') || {}).value?.trim() || '',
    duration:        dur,
    maxParticipants: parseInt((el('ce-max') || {}).value) || 500,
    type:            (el('ce-type') || {}).value || 'official',
    startTime:       startTs,
    endTime:         startTs + dur * 60000,
    problemIds:      ids,
    isPublic:        (el('ce-pub') || {}).checked,
    announcement:    (el('ce-ann') || {}).value?.trim() || '',
  };
  if (S.editingContest._existing) {
    const i = S.contests.findIndex(c => c.id === updated.id);
    if (i >= 0) S.contests[i] = updated;
  } else {
    S.contests.push(updated);
  }
  LS.set('contests', S.contests);
  if (CONFIG.USE_SUPABASE && supabaseClient) {
    SB.saveContest(updated).catch(e => console.error('[BeSQL] Contest save failed:', e));
  }
  closeModal('modal-contest');
  renderAdminContests();
  renderContests();
  toast('Contest saved', 'success');
}

function launchContest(id) {
  const c = S.contests.find(x => x.id === id);
  if (!c) return;
  c.status    = 'live';
  c.startTime = Date.now();
  c.endTime   = Date.now() + c.duration * 60000;
  LS.set('contests', S.contests);
  if (CONFIG.USE_SUPABASE && supabaseClient) {
    SB.saveContest(c).catch(e => console.error('[BeSQL] Contest launch failed:', e));
  }
  renderAdminContests(); renderContests(); renderSidebar();
  toast(`${c.title} is now LIVE!`, 'success');
}

function endContest(id) {
  const c = S.contests.find(x => x.id === id);
  if (!c) return;
  c.status  = 'ended';
  c.endTime = Date.now();
  LS.set('contests', S.contests);
  if (CONFIG.USE_SUPABASE && supabaseClient) {
    SB.saveContest(c).catch(e => console.error('[BeSQL] Contest end failed:', e));
  }
  renderAdminContests(); renderContests(); renderSidebar();
  toast('Contest ended', 'info');
}
