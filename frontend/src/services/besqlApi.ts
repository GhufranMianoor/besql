import api from './api'
import type { AuthResult, Problem, ExecutionResult, ResultSetDto, LeaderboardEntry } from '../types'

// ── Auth ────────────────────────────────────────────────────────────────

export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post<AuthResult>('/auth/register', { username, email, password }),

  login: (username: string, password: string) =>
    api.post<AuthResult>('/auth/login', { username, password }),

  refresh: (refreshToken: string) =>
    api.post<AuthResult>('/auth/refresh', { refreshToken }),
}

// ── Problems ─────────────────────────────────────────────────────────────

export const problemsApi = {
  list: (params?: { difficulty?: string; tag?: string; page?: number; pageSize?: number }) =>
    api.get<{ items: Problem[]; total: number }>('/problems', { params }),

  getBySlug: (slug: string) =>
    api.get<Problem>(`/problems/${slug}`),
}

// ── Submissions ──────────────────────────────────────────────────────────

export const submissionsApi = {
  submit: (problemId: string, queryText: string, contestId?: string) =>
    api.post<ExecutionResult>('/submissions', { problemId, queryText, contestId }),

  run: (problemId: string, queryText: string) =>
    api.post<ResultSetDto>('/submissions/run', { problemId, queryText }),
}

// ── Contests ─────────────────────────────────────────────────────────────

export const contestsApi = {
  leaderboard: (contestId: string, top = 50) =>
    api.get<{ contestId: string; contestTitle: string; entries: LeaderboardEntry[] }>(
      `/contests/${contestId}/leaderboard`,
      { params: { top } }
    ),
}
