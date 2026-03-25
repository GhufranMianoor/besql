'use strict';

function renderAdmin(){
  if(!isMaster()){el('view-admin').innerHTML='<div class="empty" style="padding:80px"><div style="font-size:13px;color:var(--t3);margin-top:8px">Access Denied — insufficient permissions.</div></div>';return;}
  renderAdminTab(S.adminSubTab);
}

function adminTab(tab,btn){
  S.adminSubTab=tab;
  document.querySelectorAll('#view-admin .tab-btn').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('#view-admin .tab-content').forEach(c=>c.classList.add('hidden'));
  btn.classList.add('on'); el(`admin-tab-${tab}`).classList.remove('hidden');
  renderAdminTab(tab);
}

function renderAdminTab(tab){
  if(tab==='problems')renderAdminProblems();
  if(tab==='contests')renderAdminContests();
  if(tab==='users')renderAdminUsers();
  if(tab==='announce')renderAdminAnnounce();
  if(tab==='analytics')renderAdminAnalytics();
}

function renderAdminProblems(){
  const c=el('admin-tab-problems');
  c.innerHTML=`<div class="fx ic sb mb3"><div style="font-size:14px;font-weight:600;color:var(--t0)">Problem Bank (${S.problems.length})</div><button class="btn btn-blue btn-sm" onclick="openProblemEditor()">+ New Problem</button></div>
    <div class="card"><div class="tw"><table class="tbl">
      <thead><tr><th>Title</th><th>Difficulty</th><th>Points</th><th>Tests</th><th>Category</th><th>Daily</th><th>Actions</th></tr></thead>
      <tbody>${S.problems.map(p=>`
        <tr>
          <td style="font-weight:600;color:var(--t0)">${esc(p.title)}</td>
          <td><span class="${diffCls(p.difficulty)}">${p.difficulty}</span></td>
          <td style="color:var(--gold)">${p.points}</td>
          <td style="color:var(--ind)">${p.testCases.length}</td>
          <td style="color:var(--t2)">${esc(p.category)}</td>
          <td>${p.dailyDate?`<span style="font-size:10px;color:var(--grn)">${p.dailyDate}</span>`:'<span style="color:var(--t3)">—</span>'}</td>
          <td><div class="fx gap2">
            <button class="btn btn-ghost btn-xs" onclick="openProblemEditor('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-xs" onclick="deleteProblem('${p.id}')">Del</button>
          </div></td>
        </tr>`).join('')}
      </tbody></table></div></div>`;
}

function renderAdminContests(){
  const c=el('admin-tab-contests');
  c.innerHTML=`<div class="fx ic sb mb3"><div style="font-size:14px;font-weight:600;color:var(--t0)">Contests (${S.contests.length})</div><button class="btn btn-blue btn-sm" onclick="openContestCreator()">+ New Contest</button></div>
    <div class="card"><div class="tw"><table class="tbl">
      <thead><tr><th>Title</th><th>Status</th><th>Problems</th><th>Duration</th><th>Start</th><th>Actions</th></tr></thead>
      <tbody>${S.contests.map(c2=>`
        <tr>
          <td style="font-weight:600;color:var(--t0)">${esc(c2.title)}</td>
          <td><span class="v-${c2.status==='live'?'ac':c2.status==='upcoming'?'pending':'pe'}">${c2.status.toUpperCase()}</span></td>
          <td style="color:var(--ind)">${c2.problemIds.length}</td>
          <td style="color:var(--t2)">${fmtDur(c2.duration*60000)}</td>
          <td style="font-size:11px;color:var(--t2)">${fmtDate(c2.startTime)}</td>
          <td><div class="fx gap2">
            <button class="btn btn-ghost btn-xs" onclick="openContestCreator('${c2.id}')">Edit</button>
            ${c2.status==='upcoming'?`<button class="btn btn-success btn-xs" onclick="launchContest('${c2.id}')">Launch</button>`:''}
            ${c2.status==='live'?`<button class="btn btn-danger btn-xs" onclick="endContest('${c2.id}')">End</button>`:''}
            <button class="btn btn-danger btn-xs" onclick="deleteOfficialContest('${c2.id}')">Delete</button>
          </div></td>
        </tr>`).join('')}
      </tbody></table></div></div>`;
}

function renderAdminUsers(){
  const allUsers=LS.keys('user:').map(k=>LS.get(k)).filter(u=>u?.userId);
  const c=el('admin-tab-users');
  c.innerHTML=`<div class="card"><div class="tw"><table class="tbl">
    <thead><tr><th>Username</th><th>Role</th><th>Score</th><th>Solved</th><th>Joined</th><th>Actions</th></tr></thead>
    <tbody>${allUsers.map(u=>`
      <tr>
        <td style="font-weight:600;color:var(--t0)">${esc(u.username)}</td>
        <td>${roleBadge(u.role)}</td>
        <td style="color:var(--gold)">${fmtN(u.score||0)}</td>
        <td style="color:var(--grn)">${u.solved||0}</td>
        <td style="font-size:11px;color:var(--t2)">${new Date(u.joinedAt||Date.now()).toLocaleDateString()}</td>
        <td><div class="fx gap2">
          <select class="sel" style="width:120px;font-size:11px;padding:3px 8px" onchange="changeUserRole('${u.username}',this.value)">
            ${['contestant','master','admin'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div></div>`;
}

function changeUserRole(username,role){
  const u=LS.get(`user:${username}`);
  if(!u)return;
  u.role=role; LS.set(`user:${username}`,u);
  if(S.user&&S.user.username===username){S.user.role=role;renderTopRight();}
  toast(`${username} is now ${role}`,'success');
}

function renderAdminAnnounce(){
  const c=el('admin-tab-announce');
  c.innerHTML=`<div class="card"><div class="card-hdr"><div class="card-title">Global Announcement</div></div><div class="card-body">
    <div class="fg"><label class="lbl">Message</label><textarea class="ta" rows="4" id="ann-msg" placeholder="Announcement visible to all users...">${esc(LS.get('announcement')||'')}</textarea></div>
    <div class="fx gap3">
      <button class="btn btn-blue btn-md" onclick="saveAnnouncement()">Publish</button>
      <button class="btn btn-danger btn-md" onclick="clearAnnouncement()">Clear</button>
    </div>
  </div></div>`;
}

function saveAnnouncement(){
  const msg=(el('ann-msg')||{}).value?.trim();
  LS.set('announcement',msg);
  if(msg){el('announce-text').textContent=msg;show('announce-bar');}
  else hide('announce-bar');
  toast('Announcement published','success');
}

function clearAnnouncement(){LS.del('announcement');hide('announce-bar');toast('Cleared','info');}

function renderAdminAnalytics(){
  const allSubs=LS.keys('subs:').map(k=>LS.get(k)||[]).flat();
  const c=el('admin-tab-analytics');
  c.innerHTML=`<div class="g4 mb4">
    ${[['Problems',S.problems.length,'var(--ind)'],['Contests',S.contests.length,'var(--sky)'],['Total Users',LS.keys('user:').length,'var(--gold)'],['Live Now',S.contests.filter(c2=>c2.status==='live').length,'var(--grn)']].map(([l,v,c2])=>`<div class="stat"><div class="stat-v" style="color:${c2}">${v}</div><div class="stat-l">${l}</div></div>`).join('')}
  </div>
  <div class="g2">
    <div class="card"><div class="card-hdr"><div class="card-title">Acceptance Rate</div></div><div class="card-body">
      ${S.problems.map(p=>{
        const totalSubs=allSubs.filter(s=>s.problemId===p.id).length;
        const acSubs=allSubs.filter(s=>s.problemId===p.id&&s.verdict==='AC').length;
        const rate=totalSubs?Math.round(acSubs/totalSubs*100):0;
        return `<div style="margin-bottom:10px"><div class="fx ic sb mb1"><span style="font-size:12px;color:var(--t1)">${esc(p.title)}</span><span style="font-size:11px;color:var(--t2)">${rate}%</span></div><div class="pbar"><div class="pfill" style="width:${rate}%;background:var(--grn)"></div></div></div>`;
      }).join('')}
    </div></div>
    <div class="card"><div class="card-hdr"><div class="card-title">Difficulty Distribution</div></div><div class="card-body">
      ${['Easy','Medium','Hard','Expert'].map(d=>{const count=S.problems.filter(p=>p.difficulty===d).length;const pct=S.problems.length?Math.round(count/S.problems.length*100):0;const color=d==='Easy'?'var(--grn)':d==='Medium'?'var(--gold)':d==='Hard'?'var(--rose)':'var(--violet)';return `<div style="margin-bottom:12px"><div class="fx ic sb mb1"><span class="${diffCls(d)}">${d}</span><span style="font-size:11px;color:var(--t2)">${count}</span></div><div class="pbar"><div class="pfill" style="width:${pct}%;background:${color}"></div></div></div>`;}).join('')}
    </div></div>
  </div>`;
}

function openProblemEditor(id){
  const target=id?S.problems.find(p=>p.id===id):null;
  if(!canEditProblem(target)){toast('Permission denied','error');return;}
  S.editingProblem=id
    ?{...target,_existing:true}
    :{id:getNextBsqCode(),code:getNextBsqCode(),title:'',difficulty:'Easy',points:100,timeLimit:null,category:'Filtering',tags:[],description:'',solution:'',testCases:[],dailyDate:null,isCustom:!isMaster(),createdBy:S.user?.userId,_existing:false};
  el('prob-editor-title').textContent=id?'EDIT PROBLEM':'NEW PROBLEM';
  const p=S.editingProblem;
  el('prob-editor-body').innerHTML=`
    <div class="g2">
      <div class="fg"><label class="lbl">Title *</label><input class="inp" id="pe-title" value="${esc(p.title)}" placeholder="Problem title..."></div>
      <div class="fg"><label class="lbl">Category</label><input class="inp" id="pe-cat" value="${esc(p.category)}" placeholder="Filtering, Joins..."></div>
    </div>
    <div class="g3">
      <div class="fg"><label class="lbl">Difficulty</label><select class="sel" id="pe-diff">${['Easy','Medium','Hard','Expert'].map(d=>`<option${p.difficulty===d?' selected':''}>${d}</option>`).join('')}</select></div>
      <div class="fg"><label class="lbl">Points</label><input class="inp" type="number" id="pe-pts" value="${p.points}"></div>
      <div class="fg"><label class="lbl">Mode</label><input class="inp" value="No time limit" readonly></div>
    </div>
    <div class="fg"><label class="lbl">Tags (comma separated)</label><input class="inp" id="pe-tags" value="${esc(Array.isArray(p.tags)?p.tags.join(', '):(p.tags||''))}" placeholder="WHERE, JOIN, GROUP BY"></div>
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
      <input class="inp" id="pe-daily" type="date" value="${p.dailyDate||''}" style="width:180px">
    </div>`;
  openModal('modal-problem');
}

function renderTCEditor(tcs){
  if(!tcs||!tcs.length)return'<div style="font-size:12px;color:var(--t3);padding:8px">No test cases. Add some or they will be auto-generated from the solution.</div>';
  return tcs.map((tc,i)=>`
    <div style="background:var(--bg2);border:1px solid var(--line);border-radius:5px;padding:10px 12px;margin-bottom:8px">
      <div class="fx ic sb mb2">
        <span style="font-size:11px;color:var(--t2);font-weight:600">Test Case ${i+1}</span>
        <button class="btn btn-danger btn-xs" onclick="removeTC(${i})">×</button>
      </div>
      <div class="g2">
        <div class="fg" style="margin-bottom:6px"><label class="lbl">Name</label><input class="inp" id="tc-name-${i}" value="${esc(tc.name)}" placeholder="e.g. Row Count"></div>
        <div class="fg" style="margin-bottom:6px"><label class="lbl">Description</label><input class="inp" id="tc-desc-${i}" value="${esc(tc.desc)}" placeholder="What this checks..."></div>
      </div>
    </div>`).join('');
}

function addTestCase(){
  if(!S.editingProblem)return;
  S.editingProblem.testCases=[...(S.editingProblem.testCases||[]),{id:genId(),name:'',desc:'',hint:''}];
  el('pe-tcs').innerHTML=renderTCEditor(S.editingProblem.testCases);
}

function removeTC(i){
  if(!S.editingProblem)return;
  S.editingProblem.testCases.splice(i,1);
  el('pe-tcs').innerHTML=renderTCEditor(S.editingProblem.testCases);
}

function testProblemSol(){
  const sol=(el('pe-sol')||{}).value?.trim();
  if(!sol)return;
  const res=runSQL(sol,DB);
  const tr=el('pe-sol-res'),tt=el('pe-sol-table');
  if(res.error){tr.style.color='var(--rose)';tr.textContent=res.error;hide(tt);return;}
  tr.style.color='var(--grn)';tr.textContent=`${res.rowCount} rows`;
  if(res.rowCount>0){
    tt.innerHTML=`<div class="tw" style="max-height:140px;overflow-y:auto"><table class="tbl"><thead><tr>${res.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${res.rows.slice(0,5).map(row=>`<tr>${row.map(cell=>`<td>${esc(String(cell??'NULL'))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    show(tt);
  }
}

function saveProblem(){
  const title=(el('pe-title')||{}).value?.trim();
  const solution=(el('pe-sol')||{}).value?.trim();
  if(!title||!solution){toast('Title and solution are required','warn');return;}

  const ref=runSQL(solution,DB);
  const refRows=ref.rowCount;
  const tags=((el('pe-tags')||{}).value||'').split(',').map(t=>t.trim()).filter(Boolean);

  const existingTCs=S.editingProblem.testCases||[];
  const tcs=existingTCs.length>0?existingTCs.map((tc,i)=>({
    ...tc,
    name:(el(`tc-name-${i}`)||{}).value||tc.name||`Test ${i+1}`,
    desc:(el(`tc-desc-${i}`)||{}).value||tc.desc||'',
    validate:(r)=>{if(r.error||!r.rows)return false;return r.rowCount===refRows;}
  })):[
    {id:genId(),name:'Row Count',desc:`Must return ${refRows} rows`,validate:(r)=>!r.error&&r.rowCount===refRows},
    {id:genId(),name:'No SQL Error',desc:'Query must execute without errors',validate:(r)=>!r.error},
  ];

  const existingCode=normalizeBsqCode(S.editingProblem.code||S.editingProblem.id);
  const ensuredCode=existingCode||getNextBsqCode();

  const updated={
    ...S.editingProblem,title,solution,
    code:ensuredCode,
    difficulty:(el('pe-diff')||{}).value||'Easy',
    points:parseInt((el('pe-pts')||{}).value)||100,
    timeLimit:null,
    category:(el('pe-cat')||{}).value?.trim()||'General',
    description:(el('pe-desc')||{}).value?.trim(),
    tags, testCases:tcs,
    dailyDate:(el('pe-daily')||{}).value||null,
    isCustom:S.editingProblem.isCustom===true||!isMaster(),
    createdBy:S.editingProblem.createdBy||S.user?.userId||S.user?.username,
  };
  Object.assign(updated,ensureProblemCompleteness(updated));
  updated.testCases=injectHiddenStrongTestCases([updated])[0].testCases;

  if(S.editingProblem._existing){
    const idx=S.problems.findIndex(p=>p.id===updated.id);
    if(idx>=0)S.problems[idx]=updated;
  } else S.problems.push(updated);

  persistProblems();
  syncProblemToRelational(updated).catch(err=>console.warn('Background problem sync failed:',err));
  closeModal('modal-problem');
  renderAdminProblems();
  toast('Problem saved','success');
}

function deleteProblem(id){
  const p=S.problems.find(x=>x.id===id);
  if(!canEditProblem(p)){toast('Permission denied','error');return;}
  if(!confirm('Delete this problem?'))return;
  S.problems=S.problems.filter(p=>p.id!==id);
  deactivateProblemInRelational(id).catch(err=>console.warn('Background problem deactivate failed:',err));
  persistProblems(); renderAdminProblems();
  toast('Deleted','info');
}

function openContestCreator(id){
  if(!isMaster()){toast('Permission denied','error');return;}
  const ex=id?S.contests.find(c=>c.id===id):null;
  S.editingContest=ex?{...ex,_existing:true}:{id:genId(),title:'',description:'',type:'official',status:'upcoming',startTime:Date.now()+86400000,endTime:Date.now()+86400000+7200000,duration:120,problemIds:[],isPublic:true,maxParticipants:500,announcement:'',password:'',createdBy:S.user?.userId,_existing:false};
  el('contest-editor-title').textContent=id?'EDIT CONTEST':'CREATE CONTEST';
  const c=S.editingContest;
  const selectableProblems=getContestSelectableProblems(c.problemIds||[]);
  const startVal=new Date(c.startTime).toISOString().slice(0,16);
  el('contest-editor-body').innerHTML=`
    <div class="fg"><label class="lbl">Title *</label><input class="inp" id="ce-title" value="${esc(c.title)}" placeholder="Contest title..."></div>
    <div class="fg"><label class="lbl">Description</label><textarea class="ta" rows="3" id="ce-desc">${esc(c.description)}</textarea></div>
    <div class="g3">
      <div class="fg"><label class="lbl">Duration (min)</label><input class="inp" type="number" id="ce-dur" value="${c.duration}"></div>
      <div class="fg"><label class="lbl">Max Participants</label><input class="inp" type="number" id="ce-max" value="${c.maxParticipants}"></div>
      <div class="fg"><label class="lbl">Type</label><select class="sel" id="ce-type"><option value="official" ${c.type==='official'?'selected':''}>Official</option><option value="custom" ${c.type==='custom'?'selected':''}>Custom</option></select></div>
    </div>
    <div class="fg"><label class="lbl">Start Time</label><input class="inp" type="datetime-local" id="ce-start" value="${startVal}"></div>
    <div class="fg"><label class="lbl">Announcement / Message</label><textarea class="ta" rows="2" id="ce-ann">${esc(c.announcement||'')}</textarea></div>
    <div class="fg">
      <label class="lbl">Problems</label>
      ${isAdmin()?'':'<div style="font-size:10px;color:var(--t3);margin-bottom:8px">Only admins can add custom problems to contests.</div>'}
      <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;padding:8px 0">
        ${selectableProblems.map(p=>`
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:7px 10px;border-radius:5px;background:var(--bg2);border:1px solid var(--line)">
            <input type="checkbox" class="ce-prob-check" value="${p.id}" ${c.problemIds.includes(p.id)?'checked':''}>
            <span style="flex:1;font-size:12px;color:var(--t1)">${esc(p.title)}</span>
            <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
          </label>`).join('')}
      </div>
    </div>
    <div class="fg">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--t1)">
        <input type="checkbox" id="ce-pub" ${c.isPublic?'checked':''} onchange="updateContestCreatorPrivacyUI()"> Public contest (visible to all)
      </label>
    </div>
    <div class="fg" id="ce-pass-wrap">
      <label class="lbl">Contest Password</label>
      <input class="inp" id="ce-pass" type="password" value="${esc(c.password||'')}" placeholder="Required for private contests">
    </div>`;
  updateContestCreatorPrivacyUI();
  openModal('modal-contest');
}

function updateContestCreatorPrivacyUI(){
  const isPublic=(el('ce-pub')||{}).checked;
  const wrap=el('ce-pass-wrap');
  if(!wrap)return;
  wrap.style.display=isPublic?'none':'block';
}

function saveContest(){
  const title=(el('ce-title')||{}).value?.trim();
  if(!title){toast('Enter a title','warn');return;}
  const ids=[...document.querySelectorAll('.ce-prob-check:checked')].map(c=>c.value);
  if(!ids.length){toast('Select at least one problem','warn');return;}
  if(!isAdmin()){
    const existing=S.editingContest;
    const prevIds=new Set(Array.isArray(existing?.problemIds)?existing.problemIds:[]);
    const hasUnauthorizedCustom=ids.some(pid=>{
      const prob=S.problems.find(p=>p.id===pid);
      return prob?.isCustom===true&&!prevIds.has(pid);
    });
    if(hasUnauthorizedCustom){toast('Only admin can add custom problems to contests','error');return;}
  }
  const dur=parseInt((el('ce-dur')||{}).value)||120;
  const startTs=new Date((el('ce-start')||{}).value).getTime()||Date.now()+86400000;
  const isPublic=(el('ce-pub')||{}).checked;
  const pass=((el('ce-pass')||{}).value||'').trim();
  if(!isPublic&&pass.length<4){toast('Private contest password must be at least 4 characters','warn');return;}
  const updated={
    ...S.editingContest,title,
    description:(el('ce-desc')||{}).value?.trim()||'',
    duration:dur,maxParticipants:parseInt((el('ce-max')||{}).value)||500,
    type:(el('ce-type')||{}).value||'official',
    startTime:startTs, endTime:startTs+dur*60000,
    problemIds:ids, isPublic,
    password:isPublic?'':pass,
    announcement:(el('ce-ann')||{}).value?.trim()||'',
  };
  if(S.editingContest._existing){const i=S.contests.findIndex(c=>c.id===updated.id);if(i>=0)S.contests[i]=updated;}
  else S.contests.push(updated);
  LS.set('contests',S.contests.map(({announce,...r})=>r));
  syncContestToRelational(updated).catch(err=>console.warn('Background contest sync failed:',err));
  closeModal('modal-contest'); renderAdminContests(); renderContests();
  toast('Contest saved','success');
}

function launchContest(id){
  const c=S.contests.find(x=>x.id===id);
  if(!c)return;
  c.status='live'; c.startTime=Date.now(); c.endTime=Date.now()+c.duration*60000;
  LS.set('contests',S.contests); renderAdminContests(); renderContests(); renderSidebar();
  syncContestToRelational(c).catch(err=>console.warn('Background contest launch sync failed:',err));
  toast(`${c.title} is now LIVE!`,'success');
}

function endContest(id){
  const c=S.contests.find(x=>x.id===id);
  if(!c)return;
  c.status='ended'; c.endTime=Date.now();
  c.isPublic=true; c.password='';
  LS.set('contests',S.contests); renderAdminContests(); renderContests(); renderSidebar();
  syncContestToRelational(c).catch(err=>console.warn('Background contest end sync failed:',err));
  toast(`Contest ended`,'info');
}

function deleteOfficialContest(id){
  if(!isMaster()){toast('Permission denied','error');return;}
  const contest=S.contests.find(c=>c.id===id);
  if(!contest){toast('Contest not found','error');return;}
  if(!confirm('Delete this official contest? This cannot be undone.'))return;

  S.contests=S.contests.filter(c=>c.id!==id);
  if(S.currentContest===id)S.currentContest=null;
  if(S.pendingContestAccess?.contestId===id)S.pendingContestAccess=null;
  if(S.unlockedPrivateContests&&S.unlockedPrivateContests[id])delete S.unlockedPrivateContests[id];

  LS.set('contests',S.contests.map(({announce,...r})=>r));
  deleteContestFromRelational(id).catch(err=>console.warn('Background official contest delete sync failed:',err));

  if(S.currentView==='contest-detail'&&S.currentContest===null)nav('contests');
  renderAdminContests();
  renderContests();
  renderSidebar();
  toast('Official contest deleted','info');
}
