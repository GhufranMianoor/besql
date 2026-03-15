/**
 * supabase-data.js — Data access layer for Supabase.
 *
 * When CONFIG.USE_SUPABASE is true and the `supabase` client is
 * initialised, these async helpers read/write the Supabase database.
 * Each function gracefully falls back to localStorage via LS.* if
 * Supabase is unavailable.
 *
 * Requires: config.js, state.js, storage.js, supabase-client.js,
 *           validator.js (for rebuildValidators), data/problems.js
 */
'use strict';

const SB = {
  /* ──────────────────────────────────────────────────────────
     AUTH
  ────────────────────────────────────────────────────────── */

  /**
   * Sign up a new user via Supabase Auth + create a profile row.
   * @returns {{ user: object|null, error: string|null }}
   */
  async signUp(email, password, username) {
    if (!supabase) return { user: null, error: 'Supabase not initialised' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { user: null, error: error.message };

    const userId = data.user.id;
    const { error: profileErr } = await supabase
      .from('profiles')
      .insert({ user_id: userId, username, role: 'contestant', score: 0, solved: 0, streak: 0 });

    if (profileErr) return { user: null, error: profileErr.message };

    return {
      user: { userId, username, role: 'contestant', score: 0, solved: 0, streak: 0, joinedAt: Date.now() },
      error: null,
    };
  },

  /**
   * Sign in an existing user via Supabase Auth and fetch their profile.
   * @returns {{ user: object|null, error: string|null }}
   */
  async signIn(email, password) {
    if (!supabase) return { user: null, error: 'Supabase not initialised' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };

    const profile = await SB.fetchProfile(data.user.id);
    return { user: profile, error: profile ? null : 'Profile not found' };
  },

  /**
   * Sign out the current Supabase session.
   */
  async signOut() {
    if (supabase) await supabase.auth.signOut();
  },

  /**
   * Fetch a single profile by user_id.
   */
  async fetchProfile(userId) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error || !data) return null;
    return {
      userId: data.user_id,
      username: data.username,
      role: data.role,
      score: data.score,
      solved: data.solved,
      streak: data.streak,
      joinedAt: data.joined_at,
    };
  },

  /* ──────────────────────────────────────────────────────────
     PROFILES / LEADERBOARD
  ────────────────────────────────────────────────────────── */

  /** Fetch the global leaderboard from the `leaderboard` view. */
  async fetchLeaderboard() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(50);
    if (error) { console.warn('[SB] leaderboard', error.message); return null; }
    return data.map(row => ({
      userId: row.user_id,
      username: row.username,
      role: row.role,
      score: row.score,
      solved: row.solved,
      streak: row.streak,
      rank: row.rank,
    }));
  },

  /** Update profile fields (score, solved, streak, role). */
  async updateProfile(userId, fields) {
    if (!supabase) return;
    const mapped = {};
    if ('score'  in fields) mapped.score  = fields.score;
    if ('solved' in fields) mapped.solved = fields.solved;
    if ('streak' in fields) mapped.streak = fields.streak;
    if ('role'   in fields) mapped.role   = fields.role;
    await supabase.from('profiles').update(mapped).eq('user_id', userId);
  },

  /* ──────────────────────────────────────────────────────────
     PROBLEMS
  ────────────────────────────────────────────────────────── */

  /** Fetch all public problems with their test cases. */
  async fetchProblems() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('problems')
      .select('*, test_cases(*)')
      .order('created_at', { ascending: true });
    if (error) { console.warn('[SB] fetchProblems', error.message); return null; }

    return data.map(p => ({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      points: p.points,
      tags: p.tags || [],
      solution: p.solution,
      schemaHint: p.schema_hint,
      sampleOutput: p.sample_output,
      timeLimit: p.time_limit,
      dailyDate: p.daily_date,
      testCases: (p.test_cases || []).map(tc => ({
        id: tc.id,
        name: tc.name,
        desc: tc.description || '',
      })),
    }));
  },

  /** Insert or update a problem (admin). */
  async saveProblem(problem) {
    if (!supabase) return;
    const row = {
      code: problem.code || problem.id.toUpperCase(),
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      points: problem.points,
      tags: problem.tags,
      solution: problem.solution,
      schema_hint: problem.schemaHint || null,
      sample_output: problem.sampleOutput || null,
      time_limit: problem.timeLimit || 300,
      daily_date: problem.dailyDate || null,
    };

    const { error } = await supabase
      .from('problems')
      .upsert({ id: problem.id, ...row }, { onConflict: 'id' });
    if (error) console.warn('[SB] saveProblem', error.message);
  },

  /** Delete a problem by id (admin). */
  async deleteProblem(id) {
    if (!supabase) return;
    await supabase.from('problems').delete().eq('id', id);
  },

  /* ──────────────────────────────────────────────────────────
     CONTESTS
  ────────────────────────────────────────────────────────── */

  /** Fetch all contests. */
  async fetchContests() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('contests')
      .select('*')
      .order('start_time', { ascending: false });
    if (error) { console.warn('[SB] fetchContests', error.message); return null; }

    return data.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      status: c.status,
      startTime: new Date(c.start_time).getTime(),
      endTime: new Date(c.end_time).getTime(),
      problemIds: c.problem_ids || [],
      isPublic: c.is_public,
      inviteCode: c.invite_code,
      createdBy: c.created_by,
    }));
  },

  /** Insert or update a contest (admin). */
  async saveContest(contest) {
    if (!supabase) return;
    const row = {
      title: contest.title,
      description: contest.description || '',
      status: contest.status || 'upcoming',
      start_time: new Date(contest.startTime).toISOString(),
      end_time: new Date(contest.endTime).toISOString(),
      problem_ids: contest.problemIds || [],
      is_public: contest.isPublic !== false,
      invite_code: contest.inviteCode || null,
    };
    const { error } = await supabase
      .from('contests')
      .upsert({ id: contest.id, ...row }, { onConflict: 'id' });
    if (error) console.warn('[SB] saveContest', error.message);
  },

  /** Delete a contest by id. */
  async deleteContest(id) {
    if (!supabase) return;
    await supabase.from('contests').delete().eq('id', id);
  },

  /* ──────────────────────────────────────────────────────────
     SUBMISSIONS
  ────────────────────────────────────────────────────────── */

  /** Fetch submissions for a specific user. */
  async fetchSubmissions(userId) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });
    if (error) { console.warn('[SB] fetchSubmissions', error.message); return null; }

    return data.map(s => ({
      id: s.id,
      userId: s.user_id,
      problemId: s.problem_id,
      contestId: s.contest_id,
      code: s.code,
      verdict: s.verdict,
      tcPassed: s.tc_passed,
      tcTotal: s.tc_total,
      timeTaken: s.time_taken,
      at: new Date(s.submitted_at).getTime(),
    }));
  },

  /** Insert a new submission. */
  async insertSubmission(sub) {
    if (!supabase) return;
    const { error } = await supabase.from('submissions').insert({
      user_id: sub.userId,
      problem_id: sub.problemId,
      contest_id: sub.contestId || null,
      code: sub.code,
      verdict: sub.verdict,
      tc_passed: sub.tcPassed,
      tc_total: sub.tcTotal,
      time_taken: sub.timeTaken,
    });
    if (error) console.warn('[SB] insertSubmission', error.message);
  },

  /* ──────────────────────────────────────────────────────────
     ANNOUNCEMENTS
  ────────────────────────────────────────────────────────── */

  /** Fetch the latest global announcement (stored as contest_id = NULL hack
   *  or we can use a dedicated 'settings' table). For simplicity, we use
   *  localStorage for global announcement alongside Supabase for the rest. */
  async fetchAnnouncement() {
    // Global announcement is kept in localStorage for simplicity
    return LS.get('announcement') || '';
  },

  async saveAnnouncement(msg) {
    LS.set('announcement', msg);
  },
};
