/**
 * Relational Sync Module
 * Handles synchronization with Supabase relational database tables
 */
function isSupabaseReady(){return typeof SB!=='undefined'&&SB!==null&&STORAGE_MODE==='supabase';}
async function getRelationalUserId(username){
  if(!isSupabaseReady()||!username)return null;
  const {data,error}=await SB.from('users').select('id').eq('username',username).maybeSingle();
  if(error){console.warn('Failed to get relational user ID:',error.message||error);return null;}
  return data?.id??null;
}

async function getRoleFromRelationalUserId(userId){
  if(!isSupabaseReady()||!userId)return 'contestant';
  const {data,error}=await SB.from('user_roles').select('role_id').eq('user_id',userId);
  if(error||!data?.length)return 'contestant';
  const roleIds=data.map(r=>Number(r.role_id));
  if(roleIds.includes(1))return 'admin';
  if(roleIds.includes(3))return 'master';
  return 'contestant';
}

async function fetchRelationalAuthUser(username){
  if(!isSupabaseReady()||!username)return null;
  const {data,error}=await SB
    .from('users')
    .select('id,username,email,password_hash,is_active,created_at')
    .eq('username',username)
    .maybeSingle();
  if(error||!data||data.is_active===false)return null;
  const role=await getRoleFromRelationalUserId(data.id);
  return {userId:`db-${data.id}`,username:data.username,email:data.email||`${data.username}@besql.local`,passwordHash:data.password_hash||'',role,score:0,solved:0,joinedAt:data.created_at?new Date(data.created_at).getTime():Date.now()};
}

async function syncUserToRelational(user){
  if(!isSupabaseReady()||!user?.username)return Promise.resolve({success:false,reason:'Supabase not available or user data incomplete'});
  try{const {data:existing,error:existingErr}=await SB.from('users').select('id,email,password_hash,full_name,is_active').eq('username',user.username).maybeSingle();
  if(existingErr){console.warn('Supabase users prefetch failed:',existingErr.message||existingErr);return {success:false,error:existingErr.message||existingErr};}

    const payload = {
      username: user.username,
      updated_at: new Date().toISOString(),
    };

    // Only write fields we actually have, otherwise keep existing values.
    if (user.email) payload.email = user.email;
    else if (existing?.email) payload.email = existing.email;

    if (user.passwordHash) payload.password_hash = user.passwordHash;
    else if (existing?.password_hash) payload.password_hash = existing.password_hash;

    if (user.username) payload.full_name = user.username;
    else if (existing?.full_name) payload.full_name = existing.full_name;

    payload.is_active = existing?.is_active ?? true;

    if (!payload.email || !payload.password_hash) {
      return { success: false, reason: 'Missing email or password hash for user sync' };
    }

    const { data, error } = await SB.from('users').upsert(payload, { onConflict: 'username' }).select('id').maybeSingle();
    if (error) {
      console.warn('Supabase users sync failed:', error.message || error);
      return { success: false, error: error.message || error };
    }
    const userId = data?.id ?? await getRelationalUserId(user.username);
    if (!userId) {
      console.warn('Failed to get user ID after sync');
      return { success: false, reason: 'Failed to get user ID' };
    }
    const role_id = getRoleId(user.role);
    const { error: roleErr } = await SB.from('user_roles').upsert({ user_id: userId, role_id }, { onConflict: 'user_id,role_id' });
    if (roleErr) {
      console.warn('Supabase user_roles sync failed:', roleErr.message || roleErr);
      return { success: false, error: roleErr.message || roleErr };
    }
    return { success: true, userId };
  } catch (err) {
    console.warn('Supabase relational user sync exception:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

async function syncSubmissionToRelational(sub,result,problem){
  if(!isSupabaseReady()||!S.user?.username||!sub)return Promise.resolve({success:false,reason:'Supabase not available or submission data incomplete'});
  try{const uid=await getRelationalUserId(S.user.username);
    if (!uid) {
      console.warn('Failed to get user ID for submission sync');
      return { success: false, reason: 'User ID not found' };
    }
    const verdictMap = { AC: 'accepted', WA: 'wrong_answer', TLE: 'time_limit', CE: 'error' };
    const verdict = verdictMap[sub.verdict] || String(sub.verdict || 'pending').toLowerCase();
    const contestIdNum = Number(sub.contestId);
    const payload = {
      user_id: uid,
      problem_id: problem?.code || sub.problemId,
      contest_id: Number.isFinite(contestIdNum) ? contestIdNum : null,
      submitted_code: sub.code || '',
      verdict,
      error_message: result?.error || (sub.verdict === 'WA' ? 'Wrong Answer' : null),
      runtime_ms: Math.max(0, Number(sub.timeTaken || 0)) * 1000,
      memory_mb: null,
      tests_passed: Number(sub.tcPassed || 0),
      total_tests: Number(sub.tcTotal || 0),
      score: sub.verdict === 'AC' ? (Number(problem?.points || 0)) : 0,
      judged_at: new Date().toISOString(),
    };
    const { error } = await SB.from('submissions').insert(payload);
    if (error) {
      console.warn('Supabase submissions sync failed:', error.message || error);
      return { success: false, error: error.message || error };
    }
    return { success: true };
  } catch (err) {
    console.warn('Supabase relational submission sync exception:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

function parseRelationalJson(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  return value;
}

function normalizeSampleOutput(sampleOutput, solution) {
  const parsed = parseRelationalJson(sampleOutput);
  if (parsed && Array.isArray(parsed.columns)) {
    const cols = parsed.columns.map(c => String(c));
    const rows = Array.isArray(parsed.rows)
      ? parsed.rows.map(r => {
          if (Array.isArray(r)) return r;
          if (r && typeof r === 'object') return cols.map(c => r[c] ?? r[String(c).toLowerCase()] ?? null);
          return [];
        })
      : [];
    return { columns: cols, rows };
  }

  const ref = (solution && typeof runSQL === 'function') ? runSQL(solution, DB) : null;
  if (ref && !ref.error && Array.isArray(ref.columns) && Array.isArray(ref.rows)) {
    return {
      columns: [...ref.columns],
      rows: ref.rows.slice(0, Math.min(5, ref.rows.length)).map(row => row.map(cell => cell == null ? 'NULL' : String(cell))),
    };
  }
  return null;
}

function normalizeSchemaHint(schemaHint) {
  const parsed = parseRelationalJson(schemaHint);
  if (parsed && parsed.table) return parsed;
  return null;
}

function hydrateProblemFromRelationalRow(row) {
  const solution = row.solution || 'SELECT 1';
  const expectedFromSolution = runSQL(solution, DB);
  const hasReferenceResult = Boolean(expectedFromSolution && !expectedFromSolution.error && Array.isArray(expectedFromSolution.rows));
  const parsedCases = parseRelationalJson(row.test_cases);
  const rawCases = Array.isArray(parsedCases) ? parsedCases : [];
  const testCases = rawCases.map((tc, idx) => ({
    id: tc.id || `${row.id}-tc-${idx + 1}`,
    name: tc.name || `Test ${idx + 1}`,
    desc: tc.desc || '',
    hint: tc.hint || '',
    hidden: tc.hidden === true,
    validate: (r) => {
      if (r.error || !r.rows) return false;
      if (!hasReferenceResult) return false;
      return resultsExactlyMatch(r, expectedFromSolution);
    },
  }));

  return {
    id: row.id,
    code: row.code || String(row.id || '').toUpperCase(),
    title: row.title || 'Untitled Problem',
    difficulty: row.difficulty || 'Easy',
    points: Number(row.points || 100),
    timeLimit: null,
    category: row.category || 'General',
    tags: Array.isArray(row.tags) ? row.tags : [],
    description: row.description || '',
    solution,
    sampleOutput: normalizeSampleOutput(row.sample_output, solution),
    schemaHint: normalizeSchemaHint(row.schema_hint),
    testCases,
    dailyDate: row.daily_date || null,
  };
}

async function loadProblemsFromRelational(){
  if(!isSupabaseReady())return Promise.resolve({success:false,problems:null,reason:'Supabase not configured'});
  try {
    const { data, error } = await SB
      .from('problems')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('Supabase problems load failed:', error.message || error);
      return { success: false, problems: null, error: error.message || error };
    }
    const problems = (data || []).map(hydrateProblemFromRelationalRow);
    return { success: true, problems, count: problems.length };
  } catch (err) {
    console.warn('Supabase problems load exception:', err?.message || err);
    return { success: false, problems: null, error: err?.message || err };
  }
}

async function syncProblemToRelational(problem){
  if(!isSupabaseReady()||!problem?.id)return Promise.resolve({success:false,reason:'Supabase not available or problem data incomplete'});
  try {
    const payload = {
      id: problem.id,
      code: problem.code || String(problem.id).toUpperCase(),
      title: problem.title || 'Untitled Problem',
      difficulty: problem.difficulty || 'Easy',
      points: Number(problem.points || 100),
      time_limit: null,
      category: problem.category || 'General',
      tags: Array.isArray(problem.tags) ? problem.tags : [],
      description: problem.description || '',
      solution: problem.solution || 'SELECT 1',
      sample_output: parseRelationalJson(problem.sampleOutput) || problem.sampleOutput || null,
      schema_hint: parseRelationalJson(problem.schemaHint) || problem.schemaHint || null,
      test_cases: serializeProblemTestCases(problem.testCases),
      daily_date: problem.dailyDate || null,
      is_active: true,
      created_by: S.user?.username || 'system',
      updated_at: new Date().toISOString(),
    };
    const { error } = await SB.from('problems').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase problem sync failed:', error.message || error);
      return { success: false, error: error.message || error };
    }
    return { success: true, problemId: problem.id };
  } catch (err) {
    console.warn('Supabase problem sync exception:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

async function deactivateProblemInRelational(problemId){
  if(!isSupabaseReady()||!problemId)return Promise.resolve({success:false,reason:'Supabase not available or problem ID missing'});
  try {
    const { error } = await SB
      .from('problems')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', problemId);
    if (error) {
      console.warn('Supabase problem deactivate failed:', error.message || error);
      return { success: false, error: error.message || error };
    }
    return { success: true, problemId };
  } catch (err) {
    console.warn('Supabase problem deactivate exception:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

async function syncContestToRelational(contest){
  if(!isSupabaseReady()||!contest?.id)return Promise.resolve({success:false,reason:'Supabase not available or contest data incomplete'});
  try {
    const payload = serializeContestForRelational(contest);
    const { error } = await SB.from('contests').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase contest sync failed:', error.message || error);
      return { success: false, error: error.message || error };
    }
    return { success: true, contestId: contest.id };
  } catch (err) {
    console.warn('Supabase contest sync exception:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

async function deleteContestFromRelational(id){
  if(!isSupabaseReady()||!id)return Promise.resolve({success:false,reason:'Supabase not available or ID missing'});
  try {
    const { error } = await SB.from('contests').delete().eq('id', id);
    if (error) {
      console.warn('Supabase contest delete failed:', error.message || error);
      return { success: false, error: error.message || error };
    }
    return { success: true };
  } catch (err) {
    console.warn('Supabase contest delete exception:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

function mapRelationalVerdictToLocal(verdict){
  const v=String(verdict||'').trim().toLowerCase();
  if(v==='accepted')return 'AC';
  if(v==='wrong_answer')return 'WA';
  if(v==='time_limit')return 'TLE';
  if(v==='error')return 'CE';
  return String(verdict||'WA').toUpperCase();
}

function mapRelationalProblemIdToLocal(problemId){
  const raw=String(problemId||'').trim();
  if(!raw)return raw;
  const direct=S.problems.find(p=>String(p.id)===raw);
  if(direct)return direct.id;
  const byCode=S.problems.find(p=>String(p.code||'').toLowerCase()===raw.toLowerCase());
  if(byCode)return byCode.id;
  return raw;
}

function submissionFingerprint(sub){
  return [
    String(sub.problemId||''),
    String(sub.verdict||''),
    String(Number(sub.at||0)),
    String(sub.code||'').slice(0,80),
  ].join('|');
}

async function fetchRelationalSubmissionsForUser(username,localUserId){
  if(!isSupabaseReady()||!username)return [];
  try{
    const uid=await getRelationalUserId(username);
    if(!uid)return [];
    const {data,error}=await SB
      .from('submissions')
      .select('id,problem_id,contest_id,submitted_code,verdict,runtime_ms,tests_passed,total_tests,score,submitted_at,judged_at')
      .eq('user_id',uid)
      .order('submitted_at',{ascending:false});
    if(error||!Array.isArray(data))return [];
    return data.map(row=>({
      id:`db-sub-${row.id}`,
      userId:localUserId||`db-${uid}`,
      problemId:mapRelationalProblemIdToLocal(row.problem_id),
      contestId:row.contest_id==null?null:String(row.contest_id),
      code:row.submitted_code||'',
      verdict:mapRelationalVerdictToLocal(row.verdict),
      timeTaken:Math.max(0,Number(row.runtime_ms||0))/1000,
      at:new Date(row.submitted_at||row.judged_at||Date.now()).getTime(),
      tcPassed:Number(row.tests_passed||0),
      tcTotal:Number(row.total_tests||0),
      publicPassed:Number(row.tests_passed||0),
      publicTotal:Number(row.total_tests||0),
      dbScore:Number(row.score||0),
      isSubmitted:true,
      submittedVia:'submit-button',
    }));
  }catch(err){
    console.warn('Relational submissions fetch exception:',err?.message || err);
    return [];
  }
}

async function hydrateSubmissionsFromRelational(user){
  if(!user?.username||!user?.userId)return;
  const remote=normalizeSubmissionList(await fetchRelationalSubmissionsForUser(user.username,user.userId)).filter(isCountableSubmission);
  if(!remote.length){
    recomputeCurrentUserStatsFromSubmissions();
    return;
  }
  const existing=normalizeSubmissionList(S.submissions);
  const existingIds=new Set(existing.map(s=>String(s.id||'')));
  const existingPrints=new Set(existing.map(submissionFingerprint));
  const toAdd=remote.filter(s=>!existingIds.has(String(s.id||''))&&!existingPrints.has(submissionFingerprint(s)));
  if(!toAdd.length){
    recomputeCurrentUserStatsFromSubmissions();
    return;
  }
  const merged=[...existing,...toAdd].sort((a,b)=>Number(b.at||0)-Number(a.at||0));
  S.submissions=merged;
  LS.set(`subs:${user.userId}`,merged);
  recomputeCurrentUserStatsFromSubmissions();
  if (typeof rerenderCurrentViewPreserveState === 'function') rerenderCurrentViewPreserveState();
}

function serializeContestForRelational(contest){
  return {
    id:String(contest.id),
    title:contest.title||'Untitled Contest',
    description:contest.description||'',
    type:contest.type||'official',
    status:contest.status||'upcoming',
    start_time:new Date(Number(contest.startTime||Date.now())).toISOString(),
    end_time:new Date(Number(contest.endTime||Date.now())).toISOString(),
    duration_minutes:Number(contest.duration||120),
    problem_ids:Array.isArray(contest.problemIds)?contest.problemIds:[],
    is_public:contest.isPublic!==false,
    max_participants:Number(contest.maxParticipants||500),
    announcement:contest.announcement||'',
    created_by:String(contest.createdBy||S.user?.username||S.user?.userId||'system'),
    invitees:Array.isArray(contest.invitees)?contest.invitees:[],
    participants:Array.isArray(contest.participants)?contest.participants:[],
    password:contest.password||'',
    updated_at:new Date().toISOString(),
  };
}

function hydrateContestFromRelationalRow(row){
  const startTs=row.start_time?new Date(row.start_time).getTime():Date.now();
  const endTs=row.end_time?new Date(row.end_time).getTime():(startTs+Number(row.duration_minutes||120)*60000);
  return {
    id:String(row.id),
    title:row.title||'Untitled Contest',
    description:row.description||'',
    type:row.type||'official',
    status:row.status||'upcoming',
    startTime:startTs,
    endTime:endTs,
    duration:Number(row.duration_minutes||120),
    problemIds:Array.isArray(row.problem_ids)?row.problem_ids:[],
    isPublic:row.is_public!==false,
    maxParticipants:Number(row.max_participants||500),
    announcement:row.announcement||'',
    createdBy:row.created_by||'system',
    invitees:Array.isArray(row.invitees)?row.invitees:[],
    participants:Array.isArray(row.participants)?row.participants:[],
    password:row.password||'',
  };
}

async function loadContestsFromRelational(){
  if(!isSupabaseReady())return Promise.resolve({success:false,contests:null,reason:'Supabase not configured'});
  try{
    const {data,error}=await SB.from('contests').select('*').order('start_time',{ascending:false});
    if(error){
      console.warn('Supabase contests load failed:',error.message||error);
      return {success:false,contests:null,error:error.message||error};
    }
    const contests=(data||[]).map(hydrateContestFromRelationalRow);
    return {success:true,contests,count:contests.length};
  }catch(err){
    console.warn('Supabase contests load exception:',err?.message||err);
    return {success:false,contests:null,error:err?.message||err};
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getRelationalUserId,
    getRoleFromRelationalUserId,
    fetchRelationalAuthUser,
    syncUserToRelational,
    syncSubmissionToRelational,
    loadProblemsFromRelational,
    syncProblemToRelational,
    deactivateProblemInRelational,
    serializeProblemTestCases,
    hydrateProblemFromRelationalRow,
    syncContestToRelational,
    deleteContestFromRelational,
    fetchRelationalSubmissionsForUser,
    hydrateSubmissionsFromRelational,
    serializeContestForRelational,
    hydrateContestFromRelationalRow,
    loadContestsFromRelational,
  };
}


