'use strict';

const SCOREBOARD_REFRESH_MS = 15000;

function stopScoreboardAutoRefresh(){
  if(window._scoreboardRefreshTimer){
    clearInterval(window._scoreboardRefreshTimer);
    window._scoreboardRefreshTimer=null;
  }
}

function startScoreboardAutoRefresh(){
  if(window._scoreboardRefreshTimer)return;
  window._scoreboardRefreshTimer=setInterval(()=>{
    if(S.currentView!=='scoreboards'){
      stopScoreboardAutoRefresh();
      return;
    }
    // Local-state refresh only; no network/database calls.
    renderContestScoreboards();
  },SCOREBOARD_REFRESH_MS);
}

function goBackFromScoreboard(){
  if(S.scoreboardSourceContestId){
    nav('contest-detail',S.scoreboardSourceContestId);
  }else{
    nav('contests');
  }
}

function filterContestScoreboards(){
  const selected=((el('contest-scoreboard-filter')||{}).value||'all').trim();
  S.scoreboardContestFilter=selected||'all';
  renderContestScoreboards();
}

function renderContestScoreboards(extra){
  startScoreboardAutoRefresh();
  const all=getVisibleContestsForList().slice().sort((a,b)=>Number(b.startTime||0)-Number(a.startTime||0));
  const select=el('contest-scoreboard-filter');
  const requestedContestId=(typeof extra==='string'?extra:extra?.contestId)||getEntryContestId();
  let selected=S.scoreboardContestFilter||'all';
  if(requestedContestId)selected=requestedContestId;

  // Store source contest ID for back button
  S.scoreboardSourceContestId=requestedContestId||null;
  
  // Show/hide back button
  const backBtn=el('scoreboard-back-btn');
  if(backBtn){
    if(requestedContestId){
      backBtn.classList.remove('hidden');
    }else{
      backBtn.classList.add('hidden');
    }
  }

  if(select){
    select.innerHTML=['<option value="all">All Contests</option>',...all.map(c=>`<option value="${esc(c.id)}">${esc(c.title)}</option>`)].join('');
    if(selected!=='all'&&!all.some(c=>c.id===selected))selected='all';
    select.value=selected;
  }
  S.scoreboardContestFilter=selected;

  const list=selected==='all'?all:all.filter(c=>c.id===selected);
  const wrap=el('contest-scoreboard-list');
  if(!wrap)return;
  wrap.innerHTML=list.length?list.map(c=>{
    const lb=buildContestLeaderboard(c);
    return `<div class="card mb3">
      <div class="card-hdr">
        <div>
          <div class="card-title">${esc(c.title)}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${c.status.toUpperCase()} · ${fmtDate(c.startTime)}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="nav('contest-detail','${c.id}')">Open Contest</button>
      </div>
      <div class="tw"><table class="tbl">
        <thead><tr><th>Rank</th><th>User</th><th>Score</th><th>Solved</th><th>Time</th></tr></thead>
        <tbody>${lb.length?lb.slice(0,20).map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.username)}</td><td style="color:var(--gold);font-weight:700">${fmtN(p.score)}</td><td style="color:var(--grn)">${p.solved}</td><td style="color:var(--t2)">${fmtT(p.totalTime)}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:14px">No scored submissions yet</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  }).join(''):'<div class="empty"><div class="empty-ico"></div><div style="font-size:12px;color:var(--t3)">No contests available</div></div>';
}
