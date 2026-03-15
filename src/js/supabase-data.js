/**
 * supabase-data.js — Supabase data-access layer (SB namespace).
 *
 * All methods return Promises and must be awaited or chained with .then().
 * When CONFIG.USE_SUPABASE is false the app uses the localStorage layer
 * (storage.js) instead and none of these methods are called.
 *
 * Column mapping: DB snake_case ↔ app camelCase
 *   problem_id    ↔  problemId
 *   user_id       ↔  userId
 *   created_by    ↔  createdBy
 *   daily_date    ↔  dailyDate
 *   is_public     ↔  isPublic
 *   sample_output ↔  sampleOutput
 *   schema_hint   ↔  schemaHint
 *   time_limit    ↔  timeLimit
 *   start_time    ↔  startTime
 *   end_time      ↔  endTime
 *   problem_ids   ↔  problemIds
 *   invite_code   ↔  inviteCode
 *   tc_passed     ↔  tcPassed
 *   tc_total      ↔  tcTotal
 *   time_taken    ↔  timeTaken
 *   submitted_at  ↔  submittedAt (ms timestamp)
 *   avatar_url    ↔  avatarUrl
 *   joined_at     ↔  joinedAt (ms timestamp)
 *   last_solve    ↔  lastSolve
 */
'use strict';

const SB = {

  /* ── PROBLEMS ─────────────────────────────────────────── */

  /**
   * Fetch all public problems (with their test-case rows).
   * @returns {Promise<Array>}
   */
  async getProblems() {
    const { data, error } = await supabaseClient
      .from('problems')
      .select('*, test_cases(*)')
      .eq('is_public', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(SB._mapProblem);
  },

  /**
   * Insert or update a problem (and its test cases).
   * @param {Object} p  App-format problem object
   * @returns {Promise<Object>} saved problem
   */
  async saveProblem(p) {
    const row = SB._unmapProblem(p);
    const { data, error } = await supabaseClient
      .from('problems')
      .upsert(row, { onConflict: 'id' })
      .select('*, test_cases(*)')
      .single();
    if (error) throw error;

    // Sync test cases
    if (Array.isArray(p.testCases) && p.testCases.length) {
      // Remove old test cases, then insert fresh ones
      await supabaseClient.from('test_cases').delete().eq('problem_id', data.id);
      const tcRows = p.testCases.map((tc, i) => ({
        id:          tc.id || undefined,
        problem_id:  data.id,
        name:        tc.name  || `Test ${i + 1}`,
        description: tc.desc  || tc.description || '',
        sort_order:  i,
      }));
      const { error: tcErr } = await supabaseClient.from('test_cases').insert(tcRows);
      if (tcErr) throw tcErr;
    }

    return SB._mapProblem({ ...data, test_cases: p.testCases || [] });
  },

  /**
   * Delete a problem by id.
   * @param {string} id
   */
  async deleteProblem(id) {
    const { error } = await supabaseClient
      .from('problems')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /* ── CONTESTS ─────────────────────────────────────────── */

  /**
   * Fetch all contests the current user can see.
   * @returns {Promise<Array>}
   */
  async getContests() {
    const { data, error } = await supabaseClient
      .from('contests')
      .select('*')
      .order('start_time', { ascending: true });
    if (error) throw error;
    return (data || []).map(SB._mapContest);
  },

  /**
   * Fetch private contests created by a specific user.
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getCustomContests(userId) {
    const { data, error } = await supabaseClient
      .from('contests')
      .select('*')
      .eq('created_by', userId)
      .eq('is_public', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(SB._mapContest);
  },

  /**
   * Insert or update a contest.
   * @param {Object} c  App-format contest object
   * @returns {Promise<Object>} saved contest
   */
  async saveContest(c) {
    const row = SB._unmapContest(c);
    const { data, error } = await supabaseClient
      .from('contests')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return SB._mapContest(data);
  },

  /**
   * Delete a contest by id.
   * @param {string} id
   */
  async deleteContest(id) {
    const { error } = await supabaseClient
      .from('contests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /* ── SUBMISSIONS ──────────────────────────────────────── */

  /**
   * Fetch all submissions for a user (most recent first).
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getSubmissions(userId) {
    const { data, error } = await supabaseClient
      .from('submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(SB._mapSubmission);
  },

  /**
   * Insert a new submission record.
   * @param {Object} sub  App-format submission object
   * @returns {Promise<Object>} saved submission
   */
  async saveSubmission(sub) {
    const row = SB._unmapSubmission(sub);
    const { data, error } = await supabaseClient
      .from('submissions')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return SB._mapSubmission(data);
  },

  /* ── PROFILES ─────────────────────────────────────────── */

  /**
   * Fetch a user profile by Supabase auth user id.
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getProfile(userId) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data ? SB._mapProfile(data) : null;
  },

  /**
   * Fetch all user profiles ordered by score.
   * @returns {Promise<Array>}
   */
  async getAllUsers() {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .order('score', { ascending: false });
    if (error) throw error;
    return (data || []).map(SB._mapProfile);
  },

  /**
   * Partially update a user profile.
   * @param {string} userId
   * @param {Object} updates  App-format partial profile
   * @returns {Promise<Object>} updated profile
   */
  async updateProfile(userId, updates) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .update(SB._unmapProfile(updates))
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return SB._mapProfile(data);
  },

  /**
   * Fetch the leaderboard view (ranked profiles, admins excluded).
   * @returns {Promise<Array>}
   */
  async getLeaderboard() {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('*');
    if (error) throw error;
    return (data || []).map(SB._mapProfile);
  },

  /* ── AUTH ─────────────────────────────────────────────── */

  /**
   * Register a new user.  Supabase Auth uses email; we derive a synthetic
   * email from the username so the existing username-only UI is preserved.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>} new profile
   */
  async signUp(username, password) {
    const email = `${username}@besql.app`;
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;
    const userId = data.user.id;

    // Create the profile row
    const { error: profErr } = await supabaseClient
      .from('profiles')
      .insert({ user_id: userId, username, role: 'contestant' });
    if (profErr) throw profErr;

    return { userId, username, role: 'contestant', score: 0, solved: 0, streak: 0, joinedAt: Date.now() };
  },

  /**
   * Sign in an existing user by username + password.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>} profile
   */
  async signIn(username, password) {
    const email = `${username}@besql.app`;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return SB.getProfile(data.user.id);
  },

  /**
   * Sign out the current user.
   */
  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },

  /**
   * Restore session from the Supabase auth token (e.g. on page reload).
   * @returns {Promise<Object|null>} profile or null when no active session
   */
  async getSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session) return null;
    try {
      return await SB.getProfile(data.session.user.id);
    } catch {
      return null;
    }
  },

  /* ── PRIVATE MAPPERS ──────────────────────────────────── */

  /** DB row → app object */
  _mapProblem(row) {
    const tcs = (row.test_cases || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(tc => ({ id: tc.id, name: tc.name, desc: tc.description || '' }));
    return {
      id:           row.id,
      code:         row.code,
      title:        row.title,
      description:  row.description,
      difficulty:   row.difficulty,
      points:       row.points,
      tags:         row.tags || [],
      solution:     row.solution,
      schemaHint:   row.schema_hint  || null,
      sampleOutput: row.sample_output || null,
      timeLimit:    row.time_limit,
      dailyDate:    row.daily_date   || null,
      isPublic:     row.is_public,
      createdBy:    row.created_by   || null,
      testCases:    tcs,
    };
  },

  /** App object → DB row */
  _unmapProblem(p) {
    const row = {
      title:         p.title,
      description:   p.description   || '',
      difficulty:    p.difficulty     || 'Easy',
      points:        p.points         || 100,
      tags:          p.tags           || [],
      solution:      p.solution       || '',
      schema_hint:   p.schemaHint     || null,
      sample_output: p.sampleOutput   || null,
      time_limit:    p.timeLimit      || 300,
      daily_date:    p.dailyDate      || null,
      is_public:     p.isPublic !== false,
    };
    if (p.id)        row.id         = p.id;
    if (p.code)      row.code       = p.code;
    if (p.createdBy) row.created_by = p.createdBy;
    return row;
  },

  /** DB row → app object */
  _mapContest(row) {
    const startMs = new Date(row.start_time).getTime();
    const endMs   = new Date(row.end_time).getTime();
    return {
      id:          row.id,
      title:       row.title,
      description: row.description  || '',
      status:      row.status,
      startTime:   startMs,
      endTime:     endMs,
      duration:    Math.round((endMs - startMs) / 60000),
      problemIds:  row.problem_ids   || [],
      isPublic:    row.is_public,
      inviteCode:  row.invite_code   || null,
      createdBy:   row.created_by    || null,
      announcement: '',
    };
  },

  /** App object → DB row */
  _unmapContest(c) {
    const startIso = c.startTime
      ? new Date(c.startTime).toISOString()
      : new Date(Date.now() + 86400000).toISOString();
    const endIso = c.endTime
      ? new Date(c.endTime).toISOString()
      : new Date((c.startTime || Date.now() + 86400000) + (c.duration || 120) * 60000).toISOString();
    const row = {
      title:       c.title,
      description: c.description  || null,
      status:      c.status       || 'upcoming',
      start_time:  startIso,
      end_time:    endIso,
      problem_ids: c.problemIds   || [],
      is_public:   c.isPublic !== false,
      invite_code: c.inviteCode   || null,
    };
    if (c.id)        row.id         = c.id;
    if (c.createdBy) row.created_by = c.createdBy;
    return row;
  },

  /** DB row → app object */
  _mapSubmission(row) {
    return {
      id:          row.id,
      userId:      row.user_id,
      problemId:   row.problem_id,
      contestId:   row.contest_id   || null,
      code:        row.code,
      verdict:     row.verdict,
      tcPassed:    row.tc_passed,
      tcTotal:     row.tc_total,
      timeTaken:   row.time_taken,
      at:          new Date(row.submitted_at).getTime(),
    };
  },

  /** App object → DB row */
  _unmapSubmission(s) {
    const row = {
      user_id:    s.userId,
      problem_id: s.problemId,
      code:       s.code      || '',
      verdict:    s.verdict,
      tc_passed:  s.tcPassed  || 0,
      tc_total:   s.tcTotal   || 0,
      time_taken: s.timeTaken || 0,
    };
    if (s.id)        row.id         = s.id;
    if (s.contestId) row.contest_id = s.contestId;
    return row;
  },

  /** DB row → app object */
  _mapProfile(row) {
    return {
      userId:    row.user_id,
      username:  row.username,
      role:      row.role,
      score:     row.score    || 0,
      solved:    row.solved   || 0,
      streak:    row.streak   || 0,
      lastSolve: row.last_solve  || null,
      avatarUrl: row.avatar_url  || null,
      bio:       row.bio         || '',
      joinedAt:  row.joined_at ? new Date(row.joined_at).getTime() : Date.now(),
      rank:      row.rank        || null,
    };
  },

  /** Partial app object → partial DB row */
  _unmapProfile(p) {
    const row = {};
    if (p.username  !== undefined) row.username   = p.username;
    if (p.role      !== undefined) row.role        = p.role;
    if (p.score     !== undefined) row.score       = p.score;
    if (p.solved    !== undefined) row.solved      = p.solved;
    if (p.streak    !== undefined) row.streak      = p.streak;
    if (p.avatarUrl !== undefined) row.avatar_url  = p.avatarUrl;
    if (p.bio       !== undefined) row.bio         = p.bio;
    return row;
  },
};
