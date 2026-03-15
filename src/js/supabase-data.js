/**
 * supabase-data.js — Supabase data-access layer (SB namespace).
 *
 * All methods are async and map between the camelCase local data model
 * and the snake_case Supabase / PostgreSQL schema defined in
 * supabase/schema.sql.
 *
 * AUTH CONVENTION
 * ---------------
 * The UI collects a username + password.  Supabase Auth requires an
 * email address, so we derive a synthetic email:
 *   username@besql.local
 * This is an internal convention; users never see this address.
 *
 * PROFILE AUTO-CREATION
 * ---------------------
 * The `handle_new_user` trigger in schema.sql reads the `username` field
 * from user_metadata and inserts the profile row automatically whenever
 * a new auth.users record is created.
 */
'use strict';

/* ── Field mappers ─────────────────────────────────────────── */

/** Supabase profile row → local user object. */
function _sbProfileToUser(row) {
  return {
    userId:   row.user_id,
    username: row.username,
    role:     row.role,
    score:    row.score   || 0,
    solved:   row.solved  || 0,
    streak:   row.streak  || 0,
    joinedAt: new Date(row.joined_at).getTime(),
  };
}

/** Supabase problem row + test-case rows → local problem object. */
function _sbProblemToLocal(row, allTestCaseRows) {
  const tcs = (allTestCaseRows || [])
    .filter(tc => tc.problem_id === row.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(tc => ({ id: tc.id, name: tc.name, desc: tc.description || '' }));

  return {
    id:          row.id,
    code:        row.code,
    title:       row.title,
    description: row.description,
    difficulty:  row.difficulty,
    points:      row.points,
    tags:        row.tags        || [],
    solution:    row.solution,
    schemaHint:  row.schema_hint  || null,
    sampleOutput:row.sample_output || null,
    timeLimit:   row.time_limit,
    dailyDate:   row.daily_date   || null,
    isPublic:    row.is_public,
    // category is not a DB column – derive from first tag or default
    category:    (row.tags && row.tags.length) ? row.tags[0] : 'General',
    testCases:   tcs,
  };
}

/** Local problem object → Supabase upsert payload. */
function _localProblemToSb(p) {
  return {
    id:            p.id,
    code:          p.code || p.id.slice(0, 8).toUpperCase(),
    title:         p.title,
    description:   p.description,
    difficulty:    p.difficulty,
    points:        p.points,
    tags:          p.tags        || [],
    solution:      p.solution,
    schema_hint:   p.schemaHint  || null,
    sample_output: p.sampleOutput|| null,
    time_limit:    p.timeLimit   || 300,
    daily_date:    p.dailyDate   || null,
    is_public:     p.isPublic !== false,
  };
}

/** Supabase contest row → local contest object. */
function _sbContestToLocal(row) {
  const start = new Date(row.start_time).getTime();
  const end   = new Date(row.end_time).getTime();
  return {
    id:              row.id,
    title:           row.title,
    description:     row.description || '',
    status:          row.status,
    startTime:       start,
    endTime:         end,
    duration:        Math.round((end - start) / 60000),
    problemIds:      row.problem_ids  || [],
    isPublic:        row.is_public,
    type:            row.invite_code  ? 'custom' : 'official',
    inviteCode:      row.invite_code  || null,
    createdBy:       row.created_by   || null,
    maxParticipants: 500,
    announcement:    '',
  };
}

/** Local contest object → Supabase upsert payload. */
function _localContestToSb(c) {
  const startTs = c.startTime || Date.now() + 86400000;
  const endTs   = c.endTime   || startTs + (c.duration || 120) * 60000;
  return {
    id:          c.id,
    title:       c.title,
    description: c.description || '',
    status:      c.status      || 'upcoming',
    start_time:  new Date(startTs).toISOString(),
    end_time:    new Date(endTs).toISOString(),
    problem_ids: c.problemIds  || [],
    is_public:   c.isPublic !== false,
    invite_code: c.inviteCode  || null,
    created_by:  c.createdBy   || null,
  };
}

/** Supabase submission row → local submission object. */
function _sbSubmissionToLocal(row) {
  return {
    id:        row.id,
    userId:    row.user_id,
    problemId: row.problem_id,
    contestId: row.contest_id || null,
    code:      row.code,
    verdict:   row.verdict,
    tcPassed:  row.tc_passed,
    tcTotal:   row.tc_total,
    timeTaken: row.time_taken,
    at:        new Date(row.submitted_at).getTime(),
  };
}

/** Local submission object → Supabase insert payload. */
function _localSubmissionToSb(s) {
  return {
    id:         s.id,
    user_id:    s.userId,
    problem_id: s.problemId,
    contest_id: s.contestId || null,
    code:       s.code,
    verdict:    s.verdict,
    tc_passed:  s.tcPassed,
    tc_total:   s.tcTotal,
    time_taken: s.timeTaken,
  };
}

/* ── SB data-access object ─────────────────────────────────── */

const SB = {

  /* ── Auth ─────────────────────────────────────────────────── */

  /**
   * Sign in with username + password.
   * Returns the local user profile object or throws on failure.
   */
  async signIn(username, password) {
    const email = `${username}@besql.local`;
    const { data, error } = await SB_CLIENT.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const profile = await this._getProfile(data.user.id);
    if (!profile) throw new Error('Profile not found. Please contact an administrator.');
    return profile;
  },

  /**
   * Register a new account.
   * The username is stored in user_metadata so the handle_new_user
   * trigger (schema.sql) can auto-create the profiles row.
   * Returns the new local user profile object or throws on failure.
   */
  async signUp(username, password) {
    const email = `${username}@besql.local`;
    const { data, error } = await SB_CLIENT.auth.signUp({
      email,
      password,
      options: { data: { username, role: 'contestant' } },
    });
    if (error) throw new Error(error.message);

    // Wait briefly for the DB trigger to create the profile row.
    await new Promise(r => setTimeout(r, 600));
    const profile = await this._getProfile(data.user.id);
    if (!profile) throw new Error('Profile creation failed. Please try again.');
    return profile;
  },

  /** Sign out the current session. */
  async signOut() {
    await SB_CLIENT.auth.signOut();
  },

  /**
   * Restore an existing Supabase session from stored tokens.
   * Returns a local user profile or null if no active session.
   */
  async getSession() {
    const { data: { session } } = await SB_CLIENT.auth.getSession();
    if (!session) return null;
    const profile = await this._getProfile(session.user.id);
    return profile || null;
  },

  /** Fetch a profile by Supabase auth user-id.  Returns null on miss. */
  async _getProfile(userId) {
    const { data, error } = await SB_CLIENT
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error || !data) return null;
    return _sbProfileToUser(data);
  },

  /* ── Problems ──────────────────────────────────────────────── */

  /** Fetch all public problems together with their test cases. */
  async getProblems() {
    const [{ data: probs, error: pErr }, { data: tcs, error: tcErr }] = await Promise.all([
      SB_CLIENT.from('problems').select('*').eq('is_public', true).order('created_at'),
      SB_CLIENT.from('test_cases').select('*').order('sort_order'),
    ]);
    if (pErr)  { console.error('[SB] getProblems',  pErr);  return []; }
    if (tcErr) { console.error('[SB] getTestCases', tcErr); }
    return (probs || []).map(p => _sbProblemToLocal(p, tcs || []));
  },

  /**
   * Insert or update a problem and replace its test cases.
   * Strips the client-side validate() function before sending.
   */
  async upsertProblem(problem) {
    const { error } = await SB_CLIENT
      .from('problems')
      .upsert(_localProblemToSb(problem));
    if (error) throw new Error(error.message);

    // Replace all test cases for this problem.
    await SB_CLIENT.from('test_cases').delete().eq('problem_id', problem.id);
    if (problem.testCases && problem.testCases.length) {
      const tcPayload = problem.testCases.map((tc, i) => ({
        id:          tc.id,
        problem_id:  problem.id,
        name:        tc.name || `Test ${i + 1}`,
        description: tc.desc || '',
        sort_order:  i,
      }));
      const { error: tcErr } = await SB_CLIENT.from('test_cases').upsert(tcPayload);
      if (tcErr) throw new Error(tcErr.message);
    }
  },

  /** Delete a problem (cascades to test_cases via FK). */
  async deleteProblem(id) {
    const { error } = await SB_CLIENT.from('problems').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  /* ── Contests ──────────────────────────────────────────────── */

  /** Fetch all public contests. */
  async getContests() {
    const { data, error } = await SB_CLIENT
      .from('contests')
      .select('*')
      .eq('is_public', true)
      .order('start_time', { ascending: false });
    if (error) { console.error('[SB] getContests', error); return []; }
    return (data || []).map(_sbContestToLocal);
  },

  /** Insert or update a single contest. */
  async upsertContest(contest) {
    const { error } = await SB_CLIENT
      .from('contests')
      .upsert(_localContestToSb(contest));
    if (error) throw new Error(error.message);
  },

  /* ── Submissions ───────────────────────────────────────────── */

  /**
   * Fetch a user's submission history.
   * When the caller is an admin the RLS policy also returns all users'
   * submissions (no extra code needed; Supabase evaluates it server-side).
   */
  async getSubmissions(userId) {
    const { data, error } = await SB_CLIENT
      .from('submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });
    if (error) { console.error('[SB] getSubmissions', error); return []; }
    return (data || []).map(_sbSubmissionToLocal);
  },

  /**
   * Fetch ALL submissions (used for admin analytics).
   * Only succeeds when the caller has the 'admin' role (RLS policy).
   */
  async getAllSubmissions() {
    const { data, error } = await SB_CLIENT
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (error) { console.error('[SB] getAllSubmissions', error); return []; }
    return (data || []).map(_sbSubmissionToLocal);
  },

  /** Insert a new submission row. */
  async insertSubmission(sub) {
    const { error } = await SB_CLIENT
      .from('submissions')
      .insert(_localSubmissionToSb(sub));
    if (error) throw new Error(error.message);
  },

  /* ── Profiles / Users ──────────────────────────────────────── */

  /** Fetch all profiles ordered by score (used for leaderboard / admin). */
  async getProfiles() {
    const { data, error } = await SB_CLIENT
      .from('profiles')
      .select('*')
      .order('score', { ascending: false });
    if (error) { console.error('[SB] getProfiles', error); return []; }
    return (data || []).map(_sbProfileToUser);
  },

  /** Partially update a profile row (score, solved, streak, role, …). */
  async updateProfile(userId, updates) {
    const payload = {};
    if (updates.score  !== undefined) payload.score  = updates.score;
    if (updates.solved !== undefined) payload.solved = updates.solved;
    if (updates.streak !== undefined) payload.streak = updates.streak;
    if (updates.role   !== undefined) payload.role   = updates.role;
    if (!Object.keys(payload).length) return;
    const { error } = await SB_CLIENT
      .from('profiles')
      .update(payload)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  /* ── Announcements ─────────────────────────────────────────── */

  /**
   * Fetch the most recent global announcement (contest_id IS NULL).
   * Returns the message string or empty string if none exists.
   */
  async getAnnouncement() {
    const { data } = await SB_CLIENT
      .from('announcements')
      .select('message')
      .is('contest_id', null)
      .order('posted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.message || '';
  },

  /**
   * Replace the global announcement.
   * Deletes any existing global announcement, then inserts the new
   * message (if non-empty).  Requires the caller to have 'admin' role.
   */
  async saveAnnouncement(msg) {
    await SB_CLIENT.from('announcements').delete().is('contest_id', null);
    if (msg) {
      const { data: { user } } = await SB_CLIENT.auth.getUser();
      const { error } = await SB_CLIENT.from('announcements').insert({
        contest_id: null,
        message:    msg,
        posted_by:  user?.id || null,
      });
      if (error) throw new Error(error.message);
    }
  },
};
