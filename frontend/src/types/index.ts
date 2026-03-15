// ── Domain types (mirror backend DTOs) ──────────────────────────────────

export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type UserRole   = 'Contestant' | 'Judge' | 'CompanyHR' | 'Admin'

export type SubmissionStatus =
  | 'Pending'
  | 'Running'
  | 'Accepted'
  | 'WrongAnswer'
  | 'RuntimeError'
  | 'TimeLimitExceeded'
  | 'CompileError'
  | 'PlagiarismFlag'

export interface User {
  id:        string
  username:  string
  email:     string
  role:      UserRole
  score:     number
  solved:    number
  streak:    number
  avatarUrl?: string
  bio?:      string
}

export interface Problem {
  id:          string
  title:       string
  slug:        string
  description: string
  difficulty:  Difficulty
  initScript:  string
  tags:        string[]
  acceptCount: number
  submitCount: number
  acceptRate:  number
  schema?:     SchemaInfo
}

export interface SchemaInfo {
  tables: TableInfo[]
}

export interface TableInfo {
  name:    string
  columns: ColumnInfo[]
}

export interface ColumnInfo {
  name:       string
  type:       string
  nullable:   boolean
  primaryKey: boolean
  foreignKey?: string
}

export interface ResultSetDto {
  columns:  string[]
  rows:     unknown[][]
  rowCount: number
}

export interface CellDiff {
  column:   string
  expected: unknown
  actual:   unknown
}

export interface RowDiff {
  rowIndex: number
  kind:     'Match' | 'Missing' | 'Extra' | 'Modified'
  cells:    CellDiff[]
}

export interface DiffResult {
  isMatch:        boolean
  expectedRows:   number
  actualRows:     number
  missingColumns: string[]
  extraColumns:   string[]
  rowDiffs:       RowDiff[]
  warnings:       string[]
}

export interface ExecutionResult {
  submissionId:    string
  status:          SubmissionStatus
  executionTimeMs: number
  queryCost:       number
  diff?:           DiffResult
  errorMessage?:   string
}

export interface Contest {
  id:          string
  title:       string
  slug:        string
  description: string
  status:      'Draft' | 'Upcoming' | 'Running' | 'Ended'
  startTime:   string
  endTime:     string
}

export interface LeaderboardEntry {
  rank:        number
  username:    string
  totalScore:  number
  solvedCount: number
}

export interface AuthResult {
  accessToken:  string
  refreshToken: string
  username:     string
  role:         string
}
