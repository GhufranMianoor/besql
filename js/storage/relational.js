/**
 * Relational Sync Module
 * Handles synchronization with Supabase relational database tables
 */
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

function relationalSerializeProblemTestCases(testCases) {
  return (testCases || []).map(tc => {
    const { validate, ...rest } = tc;
    return rest;
  });
}

function relationalParseRelationalJson(value) {
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

function relationalNormalizeSampleOutput(sampleOutput, solution) {
  const parsed = relationalParseRelationalJson(sampleOutput);
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

function relationalNormalizeSchemaHint(schemaHint) {
  const parsed = relationalParseRelationalJson(schemaHint);
  if (parsed && parsed.table) return parsed;
  return null;
}

function relationalNormalizeResultCell(v) {
  if (v == null) return null;
  const n = Number(v);
  if (Number.isFinite(n) && String(v).trim() !== '') return n;
  return String(v).trim().toLowerCase();
}

function relationalNormalizeResultColumns(cols) {
  return (cols || []).map(c => String(c).trim().toLowerCase());
}

function relationalNormalizeResultRow(row) {
  return (row || []).map(relationalNormalizeResultCell);
}

function relationalRowsMatch(actualRows, expectedRows, ignoreOrder = false) {
  const a = actualRows || [];
  const b = expectedRows || [];
  if (a.length !== b.length) return false;
  if (!ignoreOrder) {
    for (let i = 0; i < b.length; i++) {
      const ar = relationalNormalizeResultRow(a[i]);
      const br = relationalNormalizeResultRow(b[i]);
      if (ar.length !== br.length) return false;
      for (let j = 0; j < br.length; j++) if (ar[j] !== br[j]) return false;
    }
    return true;
  }
  const toKey = row => JSON.stringify(relationalNormalizeResultRow(row));
  const ak = a.map(toKey).sort();
  const bk = b.map(toKey).sort();
  for (let i = 0; i < bk.length; i++) if (ak[i] !== bk[i]) return false;
  return true;
}

function relationalResultsExactlyMatch(actual, expected) {
  if (!actual || !expected) return false;
  const actualCols = relationalNormalizeResultColumns(actual.columns);
  const expectedCols = relationalNormalizeResultColumns(expected.columns);
  if (actualCols.length !== expectedCols.length) return false;
  return relationalRowsMatch(actual.rows || [], expected.rows || [], true);
}

function hydrateRelationalProblemFromRow(row) {
  const solution = row.solution || 'SELECT 1';
  const expectedFromSolution = runSQL(solution, DB);
  const hasReferenceResult = Boolean(expectedFromSolution && !expectedFromSolution.error && Array.isArray(expectedFromSolution.rows));
  const parsedCases = relationalParseRelationalJson(row.test_cases);
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
      return relationalResultsExactlyMatch(r, expectedFromSolution);
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
    sampleOutput: relationalNormalizeSampleOutput(row.sample_output, solution),
    schemaHint: relationalNormalizeSchemaHint(row.schema_hint),
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
    const problems = (data || []).map(hydrateRelationalProblemFromRow);
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
      sample_output: relationalParseRelationalJson(problem.sampleOutput) || problem.sampleOutput || null,
      schema_hint: relationalParseRelationalJson(problem.schemaHint) || problem.schemaHint || null,
      test_cases: relationalSerializeProblemTestCases(problem.testCases),
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
    relationalSerializeProblemTestCases,
    hydrateRelationalProblemFromRow,
  };
}
