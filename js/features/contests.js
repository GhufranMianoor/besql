'use strict';

function filterContests(){
  renderContests();
}

function stopContestListCountdown(){
  if(window._contestListInterval){
    clearInterval(window._contestListInterval);
    window._contestListInterval=null;
  }
}

function startContestListCountdown(){
  if(window._contestListInterval)return;
  window._contestListInterval=setInterval(()=>{
    if(S.currentView!=='contests'){
      stopContestListCountdown();
      return;
    }
    renderContests();
  },1000);
}

function renderContests(){
  const filter=(el('contest-filter')||{}).value||'all';
  const allContests=getVisibleContestsForList();
  const list=filter==='all'?allContests:allContests.filter(c=>c.status===filter);
  el('contest-list').innerHTML=list.length?list.map(c=>contestCardHTML(c)).join(''):'<div class="empty"><div class="empty-ico"></div><div style="font-size:12px;color:var(--t3)">No contests found</div></div>';
  if(S.currentView==='contests')startContestListCountdown();
}

function contestCardHTML(c){
  const probs=S.problems.filter(p=>c.problemIds.includes(p.id));
  const revealProblems=canRevealContestProblems(c);
  const lockReason=getContestProblemLockReason(c);
  const nowTs=Date.now();
  const msToStart=Math.max(0,c.startTime-nowTs);
  const msToEnd=Math.max(0,c.endTime-nowTs);
  const timeText=c.status==='live'
    ? `Ends in ${fmtCountdownDHMS(msToEnd/1000)}`
    : c.status==='upcoming'
      ? `Starts in ${fmtCountdownDHMS(msToStart/1000)}`
      : `Ended ${fmtDate(c.endTime)}`;
  return `
    <div class="contest-card ${c.status} mb3" onclick="nav('contest-detail','${c.id}')">
      <div class="fx ic sb mb2">
        <div class="fx ic gap3">
          ${c.status==='live'?'<span class="live-pill"><div class="live-dot" style="width:6px;height:6px"></div>LIVE</span>':
            c.status==='upcoming'?'<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--idim);color:var(--ind);border:1px solid rgba(77,158,255,.3)">UPCOMING</span>':
            '<span style="font-size:10px;color:var(--t3);padding:2px 8px;border-radius:10px;border:1px solid var(--line)">ENDED</span>'}
          <span style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:1px">${c.type==='custom'?'Custom':'Official'}</span>
        </div>
        <span style="font-size:11px;color:var(--t2)">${revealProblems?`${probs.length} problems`:'Problems hidden'} · ${fmtDur(c.duration*60000)}</span>
      </div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;line-height:1.3">${esc(c.title)}</div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:12px;line-height:1.6">${esc(c.description)}</div>
      <div class="fx ic gap3 flex-wrap">
        ${revealProblems?probs.map(p=>`<span class="tag">${esc(p.title)}</span>`).join(''):`<span class="tag">${esc(lockReason||'Problems are currently locked')}</span>`}
        <button class="btn btn-ghost btn-xs" style="margin-left:8px" onclick="event.stopPropagation();nav('scoreboards',{contestId:'${c.id}'})">Scoreboard</button>
        <div style="margin-left:auto;font-size:11px;color:var(--t2)">
          ${timeText}
        </div>
      </div>
    </div>`;
}

function renderContestDetail(contestId){
  const cid=contestId||S.currentContest;
  S.currentContest=cid;
  const c=getContestById(cid);
  if(!c){nav('contests');return;}
  el('cd-title').textContent=c.title;
  const probs=S.problems.filter(p=>c.problemIds.includes(p.id));
  const revealProblems=canRevealContestProblems(c);
  const participant=isContestParticipant(c);
  el('cd-meta').innerHTML=`
    ${c.status==='live'?'<span class="live-pill"><div class="live-dot" style="width:6px;height:6px"></div>LIVE</span>':''}
    <span style="font-size:11px;color:var(--t2)">${revealProblems?`${probs.length} problems`:'Problems hidden'}</span>
    <span style="font-size:11px;color:var(--t2)">${fmtDur(c.duration*60000)}</span>
    ${participant?'<span class="tag">Participant</span>':'<span class="tag">Spectator</span>'}
    ${c.isPublic?'<span class="tag">Public</span>':'<span class="tag">Private</span>'}`;
  const timerWrap=el('cd-timer-wrap');
  stopContestCountdown();
  if(c.status==='live'){
    const left=Math.max(0,Math.floor((c.endTime-Date.now())/1000));
    timerWrap.innerHTML=`<div style="text-align:right"><div style="font-size:10px;color:var(--t3);letter-spacing:1px">TIME LEFT</div><div class="countdown" id="cd-countdown">${fmtCountdownDHMS(left)}</div></div>`;
    startContestCountdown(c.endTime,()=>{
      normalizeContestLifecycle(c);
      renderContestDetail(c.id);
      renderContests();
      renderSidebar();
    });
  } else if(c.status==='upcoming'&&hasContestStarted(c)===false){
    const untilStart=Math.max(0,Math.floor((c.startTime-Date.now())/1000));
    timerWrap.innerHTML=`<div style="text-align:right"><div style="font-size:10px;color:var(--t3);letter-spacing:1px">STARTS IN</div><div class="countdown" id="cd-countdown">${fmtCountdownDHMS(untilStart)}</div></div>`;
    startContestCountdown(c.startTime,()=>{
      normalizeContestLifecycle(c);
      renderContestDetail(c.id);
      renderContests();
      renderSidebar();
    });
  } else {
    timerWrap.innerHTML='';
  }
  renderCDProblems(c,probs);
  renderCDScoreboard(c);
  renderCDSubs(c);
  renderCDAnnounce(c);
}

function stopContestCountdown(){
  if(window._cdInterval){
    clearInterval(window._cdInterval);
    window._cdInterval=null;
  }
}

function startContestCountdown(targetTime,onComplete){
  if(window._cdInterval) clearInterval(window._cdInterval);
  window._cdInterval=setInterval(()=>{
    const left=Math.max(0,Math.floor((targetTime-Date.now())/1000));
    const el2=el('cd-countdown');
    if(el2){el2.textContent=fmtCountdownDHMS(left);if(left<300)el2.classList.add('urgent');}
    if(left<=0){
      stopContestCountdown();
      if(typeof onComplete==='function')onComplete();
    }
  },1000);
}

function renderCDProblems(c,probs){
  if(!canRevealContestProblems(c)){
    const participant=isContestParticipant(c);
    const canJoin=c.status!=='ended'&&!participant&&!isOwnedByCurrentUser(c.createdBy)&&!isMaster();
    const reason=getContestProblemLockReason(c)||'Problems are currently locked.';
    el('cd-problems').innerHTML=`<div class="card"><div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">🔒</div><div style="font-size:12px;color:var(--t2)">${esc(reason)}</div>${canJoin?`<button class="btn btn-blue btn-sm" style="margin-top:10px" onclick="joinContest('${c.id}')">Join As Participant</button>`:''}</div></div>`;
    return;
  }
  const solved=getSolvedIdsInContest(c.id);
  el('cd-problems').innerHTML=`<div class="card">${probs.length?probs.map((p,i)=>`
    <div class="prob-row ${solved.has(p.id)?'solved':''}" onclick="${solved.has(p.id)?"toast('Already solved in this contest. Reattempt is disabled.','info')":`openContestProblem('${c.id}','${p.id}')`}">
      <div class="prob-num">${String.fromCharCode(65+i)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--t0)">${esc(p.title)}</div>
        <div class="fx ic gap2 mt1">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
      </div>
      <div class="fx ic gap3">
        <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
        <span style="font-size:12px;color:var(--gold);font-weight:700">${p.points}pt</span>
        ${solved.has(p.id)?'<span style="color:var(--grn);font-weight:700;font-size:12px;margin-left:2px">AC</span>':''}
        ${c.status!=='ended'?(solved.has(p.id)?'<button class="btn btn-ghost btn-xs" disabled>Solved</button>':`<button class="btn btn-blue btn-xs" onclick="event.stopPropagation();openContestProblem('${c.id}','${p.id}')">Solve</button>`):`<button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();openContestProblem('${c.id}','${p.id}')">Practice</button>`}
      </div>
    </div>`).join(''):'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div></div>'}</div>`;
}

function openContestProblem(contestId,problemId){
  const contest=getContestById(contestId);
  if(!contest){toast('Contest not found','error');return;}
  normalizeContestLifecycle(contest);
  if(contest.status==='ended'){
    toast('Contest ended. Opening as practice problem.','info');
    nav('judge',{problemId,contestId:null,backView:'practice'});
    return;
  }
  nav('judge',{problemId,contestId:contest.id,backView:'contest-detail'});
}

function buildContestLeaderboard(contest){
  const userById=new Map();
  LS.keys('user:').forEach(k=>{
    const u=LS.get(k);
    if(u&&u.userId)userById.set(u.userId,u);
  });

  const allSubs=LS.keys('subs:')
    .map(k=>LS.get(k))
    .filter(Array.isArray)
    .flat()
    .filter(s=>s&&s.contestId===contest.id)
    .filter(s=>typeof isCountableSubmission==='function'?isCountableSubmission(s):Boolean(s&&s.isSubmitted===true&&String(s.code||'').trim()))
    .filter(s=>{
      const at=Number(s.at||0);
      if(!Number.isFinite(at)||at<=0)return false;
      return at>=Number(contest.startTime||0)&&at<=Number(contest.endTime||0);
    });

  const problemById=new Map((contest.problemIds||[]).map(pid=>S.problems.find(p=>p.id===pid)).filter(Boolean).map(p=>[p.id,p]));
  const byUser=new Map();
  const sortedSubs=[...allSubs].sort((a,b)=>Number(a.at||0)-Number(b.at||0));

  sortedSubs.forEach(sub=>{
    const uid=sub.userId;
    if(!uid)return;
    if(!byUser.has(uid)){
      const u=userById.get(uid);
      byUser.set(uid,{userId:uid,username:u?.username||'User',score:0,solved:0,totalTime:0,lastAt:0,solvedProblems:new Set()});
    }
    const row=byUser.get(uid);
    row.lastAt=Math.max(row.lastAt,Number(sub.at||0));
    if(sub.verdict!=='AC')return;
    if(row.solvedProblems.has(sub.problemId))return;
    const prob=problemById.get(sub.problemId);
    row.solvedProblems.add(sub.problemId);
    row.solved+=1;
    row.score+=Number(prob?.points||0);
    row.totalTime+=Math.max(0,Number(sub.timeTaken||0));
  });

  return [...byUser.values()].sort((a,b)=>{
    if(b.score!==a.score)return b.score-a.score;
    if(b.solved!==a.solved)return b.solved-a.solved;
    if(a.totalTime!==b.totalTime)return a.totalTime-b.totalTime;
    if(a.lastAt!==b.lastAt)return a.lastAt-b.lastAt;
    return String(a.username).localeCompare(String(b.username));
  });
}

function renderCDScoreboard(c){
  const lb=buildContestLeaderboard(c);
  el('cd-scoreboard').innerHTML=`<div class="card"><div class="card-hdr"><div class="card-title">Contest Scoreboard</div><button class="btn btn-ghost btn-sm" onclick="nav('scoreboards',{contestId:'${c.id}'})">Open Full View</button></div><div class="tw"><table class="tbl">
    <thead><tr><th>Rank</th><th>User</th><th>Score</th><th>Solved</th><th>Time</th></tr></thead>
    <tbody>${lb.length?lb.slice(0,20).map((p,i)=>`
      <tr class="${i===0?'sb-rank-gold':i===1?'sb-rank-silver':i===2?'sb-rank-bronze':''} ${S.user&&p.userId===S.user.userId?'sb-me':''}">
        <td><div class="rm ${i<3?`rm${i+1}`:'rmn'}">${i+1}</div></td>
        <td style="font-weight:${S.user&&p.userId===S.user.userId?700:400};color:${S.user&&p.userId===S.user.userId?'var(--ind)':'var(--t0)'}">${esc(p.username)}</td>
        <td style="color:var(--gold);font-weight:700">${fmtN(p.score)}</td>
        <td style="color:var(--grn)">${p.solved}</td>
        <td style="color:var(--t2)">${fmtT(p.totalTime)}</td>
      </tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:16px">No contest submissions yet</td></tr>'}
    </tbody></table></div></div>`;
}

function renderCDSubs(c){
  const subs=S.submissions.filter(s=>s.contestId===c.id);
  el('cd-my-subs').innerHTML=`<div class="card">${subs.length?subs.reverse().map(s=>{
    const p=S.problems.find(x=>x.id===s.problemId);
    return `<div class="sub-row">
      <span class="sub-time" style="font-size:10px;color:var(--t3);width:120px;flex-shrink:0">${new Date(s.at).toLocaleTimeString()}</span>
      <span style="flex:1" class="trunc">${esc(p?.title||s.problemId)}</span>
      <span class="v-${s.verdict.toLowerCase()}">${s.verdict}</span>
      ${s.verdict==='AC'?`<span style="font-size:11px;color:var(--t2)">${s.timeTaken}s</span>`:''}
    </div>`;}).join(''):'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div><div style="font-size:12px">No submissions yet</div></div>'}</div>`;
}

function renderCDAnnounce(c){
  el('cd-announces').innerHTML=c.announcement?`
    <div class="card"><div class="card-body">
      <div style="font-size:11px;color:var(--t3);letter-spacing:1px;margin-bottom:6px">FROM ADMIN</div>
      <div style="font-size:13px;color:var(--t1);line-height:1.8">${esc(c.announcement)}</div>
    </div></div>`:
    '<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div><div style="font-size:12px;color:var(--t3)">No announcements</div></div>';
}

function cdTab(tab,btn){
  document.querySelectorAll('#view-contest-detail .tab-btn').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('#view-contest-detail .tab-content').forEach(c=>c.classList.add('hidden'));
  btn.classList.add('on');
  el(`cd-tab-${tab}`).classList.remove('hidden');
}
