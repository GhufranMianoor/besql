'use strict';

function openAuth(mode='login'){
  el('auth-title').textContent=mode==='login'?'Sign In':'Create Account';
  el('auth-body').innerHTML = mode==='login' ? `
    <div class="fg"><label class="lbl">Username</label><input class="inp" id="au" placeholder="your_username" autocomplete="off"></div>
    <div class="fg"><label class="lbl">Password</label><input class="inp" type="password" id="ap" placeholder="••••••••" autocomplete="current-password"></div>
    <div id="a-err" class="hidden" style="color:var(--rose);font-size:11px;margin-bottom:10px"></div>
    <div class="fx ic sb" style="margin-top:14px">
      <span style="font-size:12px;color:var(--t2)">No account?</span>
      <button class="btn btn-ghost btn-sm" onclick="openAuth('register')">Register →</button>
    </div>
    <div class="mfooter" style="padding:14px 0 0;border-top:1px solid var(--line);margin-top:14px;justify-content:flex-end;display:flex;gap:9px">
      <button class="btn btn-ghost btn-md" onclick="closeModal('modal-auth')">Cancel</button>
      <button class="btn btn-blue btn-md" onclick="doLogin()">Sign In</button>
    </div>` : `
    <div class="fg"><label class="lbl">Username</label><input class="inp" id="ru" placeholder="choose_username" autocomplete="off"></div>
    <div class="fg"><label class="lbl">Email</label><input class="inp" id="re" placeholder="you@example.com" autocomplete="email"></div>
    <div class="fg"><label class="lbl">Password</label><input class="inp" type="password" id="rp" placeholder="At least 8 chars, uppercase, lowercase, number, symbol" autocomplete="new-password"></div>
    <div class="fg"><label class="lbl">Confirm Password</label><input class="inp" type="password" id="rpc" placeholder="Repeat password" autocomplete="new-password"></div>
    <div id="r-err" class="hidden" style="color:var(--rose);font-size:11px;margin-bottom:10px"></div>
    <div class="mfooter" style="padding:14px 0 0;border-top:1px solid var(--line);margin-top:14px;justify-content:flex-end;display:flex;gap:9px">
      <button class="btn btn-ghost btn-md" onclick="openAuth('login')">← Back to Login</button>
      <button class="btn btn-blue btn-md" onclick="doRegister()">Create Account</button>
    </div>`;
  openModal('modal-auth');
  setTimeout(()=>{const f=el('au')||el('ru');if(f)f.focus();},100);
}

async function doLogin(){
  const u=(el('au')||{}).value?.trim(), p=(el('ap')||{}).value;
  if(!u||!p){showAErr('Enter username and password.');return;}
  const userErr=validateUsername(u);
  if(userErr){showAErr(userErr);return;}
  const hp=await hashPassword(p);
  let stored=LS.get(`user:${u}`);

  if(!stored){
    const dbUser=await fetchRelationalAuthUser(u);
    if(!dbUser||!dbUser.passwordHash||dbUser.passwordHash!==hp){
      showAErr('Invalid credentials.');
      return;
    }
    LS.set(`user:${u}`,dbUser);
    finishLogin(dbUser);
    return;
  }

  const ok=stored.passwordHash?stored.passwordHash===hp:stored.password===p;
  if(!ok){
    const dbUser=await fetchRelationalAuthUser(u);
    if(!dbUser||!dbUser.passwordHash||dbUser.passwordHash!==hp){
      showAErr('Invalid credentials.');
      return;
    }
    const merged={...stored,...dbUser,passwordHash:dbUser.passwordHash};
    LS.set(`user:${u}`,merged);
    finishLogin(merged);
    return;
  }

  if(!stored.passwordHash){
    stored.passwordHash=hp;
    delete stored.password;
    LS.set(`user:${u}`,stored);
  }
  finishLogin(stored);
}

async function doRegister(){
  const u=(el('ru')||{}).value?.trim(), p=(el('rp')||{}).value;
  const e=(el('re')||{}).value?.trim();
  const pc=(el('rpc')||{}).value;

  const userErr=validateUsername(u);
  if(userErr){showRErr(userErr);return;}
  const emailErr=validateEmail(e);
  if(emailErr){showRErr(emailErr);return;}
  const passErr=validatePassword(p);
  if(passErr){showRErr(passErr);return;}
  if(p!==pc){showRErr('Passwords do not match.');return;}
  if(LS.get(`user:${u}`)){showRErr('Username already taken.');return;}

  const nu={
    userId:genId(),
    username:u,
    email:e,
    passwordHash:await hashPassword(p),
    role:'contestant',
    score:0,
    solved:0,
    joinedAt:Date.now(),
  };
  LS.set(`user:${u}`,nu);
  await syncUserToRelational(nu);
  finishLogin(nu);
  closeModal('modal-auth');
  toast(`Welcome, ${u}!`,'success');
}

async function quickLogin(uname,role){
  let u=LS.get(`user:${uname}`);
  if(!u){
    u={
      userId:genId(),
      username:uname,
      email:`${uname}@besql.local`,
      passwordHash:await hashPassword('demo'),
      role,
      score:0,
      solved:0,
      joinedAt:Date.now(),
    };
    LS.set(`user:${uname}`,u);
    await syncUserToRelational(u);
  }
  finishLogin(u); closeModal('modal-auth');
}

function showAErr(m){const e=el('a-err');if(e){e.textContent=m;show(e);}}
function showRErr(m){const e=el('r-err');if(e){e.textContent=m;show(e);}}

function buildSessionRecord(user){
  if(!user?.username)return null;
  return {
    username:user.username,
    userId:user.userId||null,
    passwordHash:user.passwordHash||null,
    createdAt:Date.now(),
  };
}

function restoreSessionUser(){
  const sess=LS.get('session');
  if(!sess)return null;

  if(typeof sess==='string'){
    const u=LS.get(`user:${sess}`);
    if(u)LS.set('session',buildSessionRecord(u));
    return u||null;
  }

  if(typeof sess!=='object')return null;
  const username=String(sess.username||'').trim();
  if(!username)return null;
  const u=LS.get(`user:${username}`);
  if(!u)return null;
  if(sess.userId&&u.userId&&String(sess.userId)!==String(u.userId))return null;
  if(sess.passwordHash&&u.passwordHash&&String(sess.passwordHash)!==String(u.passwordHash))return null;
  return u;
}

function getJudgeSessionKey(ctx){
  if(!ctx?.problemId)return '';
  return `${ctx.contestId||'practice'}::${ctx.problemId}`;
}

function getJudgeSessionStorageKey(){
  const uid=String(S.user?.userId||'').trim();
  const uname=String(S.user?.username||'').trim();
  const scope=uid||uname||'guest';
  return `judgeSessions:${scope}`;
}

function hydrateJudgeSessionsForCurrentUser(){
  const key=getJudgeSessionStorageKey();
  const persisted=LS.get(key);
  S.judgeSessions=(persisted&&typeof persisted==='object')?persisted:{};
}

function getJudgeSessionState(ctx){
  const key=getJudgeSessionKey(ctx);
  if(!key)return null;
  return S.judgeSessions?.[key]||null;
}

function saveJudgeSessionState(ctx=S.judgeContext,overrides={}){
  const key=getJudgeSessionKey(ctx);
  if(!key)return;
  const editor=el('judge-editor');
  const next={
    draft:editor?editor.value:'',
    elapsed:Number(S.judgeElapsed||0),
    updatedAt:Date.now(),
    ...overrides,
  };
  S.judgeSessions={...(S.judgeSessions||{}),[key]:next};
  LS.set(getJudgeSessionStorageKey(),S.judgeSessions);
}

function saveRouteState(view,extra){
  const state={view:String(view||'home')};
  if(state.view==='contest-detail'){
    const contestId=typeof extra==='string'?extra:extra?.contestId||S.currentContest;
    if(contestId)state.contestId=contestId;
  }
  if(state.view==='judge'){
    const ctx=(extra&&typeof extra==='object')?extra:S.judgeContext;
    if(ctx?.problemId){
      state.judgeContext={
        problemId:ctx.problemId,
        contestId:ctx.contestId||null,
        backView:ctx.backView||'practice',
      };
    }
  }
  if(state.view==='scoreboards'){
    const contestId=typeof extra==='string'?extra:extra?.contestId||S.scoreboardContestFilter;
    if(contestId&&contestId!=='all')state.contestId=contestId;
  }
  LS.set('routeState',state);
}

function restoreRouteState(){
  const state=LS.get('routeState');
  if(!state||typeof state!=='object')return false;
  const view=String(state.view||'').trim();
  if(!view)return false;
  if(view==='contest-detail'&&state.contestId){
    nav('contest-detail',state.contestId);
    return true;
  }
  if(view==='judge'&&state.judgeContext?.problemId){
    nav('judge',state.judgeContext);
    return true;
  }
  if(view==='scoreboards'){
    nav('scoreboards',state.contestId?{contestId:state.contestId}:undefined);
    return true;
  }
  if(['home','contests','practice','playground','submissions','profile','admin','custom'].includes(view)){
    nav(view);
    return true;
  }
  return false;
}

function finishLogin(user){
  S.user=user;
  syncUserToRelational(user).catch(err=>console.warn('Background user sync failed:',err));
  LS.set('session',buildSessionRecord(user));
  hydrateJudgeSessionsForCurrentUser();
  S.submissions=LS.get(`subs:${user.userId}`)||[];
  closeModal('modal-auth');
  renderTopRight(); renderSidebar();
  nav('home'); toast(`Signed in as ${user.username}`,'success');
}

function doLogout(){
  S.user=null;
  S.judgeSessions={};
  S.judgeContext=null;
  LS.del('session');
  S.submissions=[];
  LS.del('routeState');
  renderTopRight();
  renderSidebar();
  nav('home');
  toast('Logged out.','info');
}
