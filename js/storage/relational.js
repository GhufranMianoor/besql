/**
 * Relational Sync Module
 * Handles synchronization with Supabase relational database tables
 */

async function getRelationalUserId(username) {
  if (!SB || STORAGE_MODE !== 'supabase' || !username) {
    return null;
  }
  const { data, error } = await SB.from('users').select('id').eq('username', username).maybeSingle();
  if (error) {
    console.warn('Failed to get relational user ID:', error.message || error);
    return null;
  }
  return data?.id ?? null;
}

async function getRoleFromRelationalUserId(userId) {
  if (!SB || STORAGE_MODE !== 'supabase' || !userId) {
    return 'contestant';
  }
  const { data, error } = await SB.from('user_roles').select('role_id').eq('user_id', userId);
  if (error || !data?.length) {
    return 'contestant';
  }
  const roleIds = data.map(r => Number(r.role_id));
  if (roleIds.includes(1)) return 'admin';
  if (roleIds.includes(3)) return 'master';
  return 'contestant';
}

async function fetchRelationalAuthUser(username) {
  if (!SB || STORAGE_MODE !== 'supabase' || !username) {
    return null;
  }
  const { data, error } = await SB
    .from('users')
    .select('id,username,email,password_hash,is_active,created_at')
    .eq('username', username)
    .maybeSingle();
  if (error || !data || data.is_active === false) {
    return null;
  }
  const role = await getRoleFromRelationalUserId(data.id);
  return {
    userId: `db-${data.id}`,
    username: data.username,
    email: data.email || `${data.username}@besql.local`,
    passwordHash: data.password_hash || '',
    role,
    score: 0,
    solved: 0,
    streak: 0,
    joinedAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
  };
}

async function syncUserToRelational(user) {
  if (!SB || STORAGE_MODE !== 'supabase' || !user?.username || !user?.email) {
    return Promise.resolve({ success: false, reason: 'Supabase not available or user data incomplete' });
  }
  try {
    const payload = {
      username: user.username,
      email: user.email,
      password_hash: user.passwordHash || '',
      full_name: user.username,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
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

async function syncSubmissionToRelational(sub, result, problem) {
  if (!SB || STORAGE_MODE !== 'supabase' || !S.user?.username || !sub) {
    return Promise.resolve({ success: false, reason: 'Supabase not available or submission data incomplete' });
  }
  try {
    const uid = await getRelationalUserId(S.user.username);
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

function serializeProblemTestCases(testCases) {
  return (testCases || []).map(tc => {
    const { validate, ...rest } = tc;
    return rest;
  });
}

function hydrateProblemFromRelationalRow(row) {
  const solution = row.solution || 'SELECT 1';
  const rawCases = Array.isArray(row.test_cases) ? row.test_cases : [];
  const testCases = rawCases.map((tc, idx) => ({
    id: tc.id || `${row.id}-tc-${idx + 1}`,
    name: tc.name || `Test ${idx + 1}`,
    desc: tc.desc || '',
    hint: tc.hint || '',
    hidden: tc.hidden === true,
    validate: (r) => {
      if (r.error || !r.rows) return false;
      const ref = runSQL(solution, DB);
      if (ref.error || !ref.rows) return false;
      return r.rowCount === ref.rowCount;
    },
  }));

  return {
    id: row.id,
    code: row.code || String(row.id || '').toUpperCase(),
    title: row.title || 'Untitled Problem',
    difficulty: row.difficulty || 'Easy',
    points: Number(row.points || 100),
    timeLimit: row.time_limit == null ? null : Number(row.time_limit),
    category: row.category || 'General',
    tags: Array.isArray(row.tags) ? row.tags : [],
    description: row.description || '',
    solution,
    sampleOutput: row.sample_output || null,
    schemaHint: row.schema_hint || null,
    testCases,
    dailyDate: row.daily_date || null,
  };
}

async function loadProblemsFromRelational() {
  if (!SB || STORAGE_MODE !== 'supabase') {
    return Promise.resolve({ success: false, problems: null, reason: 'Supabase not configured' });
  }
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

async function syncProblemToRelational(problem) {
  if (!SB || STORAGE_MODE !== 'supabase' || !problem?.id) {
    return Promise.resolve({ success: false, reason: 'Supabase not available or problem data incomplete' });
  }
  try {
    const payload = {
      id: problem.id,
      code: problem.code || String(problem.id).toUpperCase(),
      title: problem.title || 'Untitled Problem',
      difficulty: problem.difficulty || 'Easy',
      points: Number(problem.points || 100),
      time_limit: problem.timeLimit == null ? null : Number(problem.timeLimit),
      category: problem.category || 'General',
      tags: Array.isArray(problem.tags) ? problem.tags : [],
      description: problem.description || '',
      solution: problem.solution || 'SELECT 1',
      sample_output: problem.sampleOutput || null,
      schema_hint: problem.schemaHint || null,
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

async function deactivateProblemInRelational(problemId) {
  if (!SB || STORAGE_MODE !== 'supabase' || !problemId) {
    return Promise.resolve({ success: false, reason: 'Supabase not available or problem ID missing' });
  }
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
    serializeProblemTestCases,
    hydrateProblemFromRelationalRow,
  };
}
