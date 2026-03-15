import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Play, Send, BookOpen, Database } from 'lucide-react'
import SqlEditor from '../components/editor/SqlEditor'
import SchemaViewer from '../components/schema/SchemaViewer'
import ResultsPanel from '../components/results/ResultsPanel'
import { problemsApi, submissionsApi } from '../services/besqlApi'
import type { Problem, ExecutionResult, ResultSetDto } from '../types'

type LeftTab = 'problem' | 'schema'

export default function ProblemSolver() {
  const { slug } = useParams<{ slug: string }>()

  const [problem,   setProblem]   = useState<Problem | null>(null)
  const [query,     setQuery]     = useState('-- Write your SQL query here\n')
  const [result,    setResult]    = useState<ExecutionResult | null>(null)
  const [runResult, setRunResult] = useState<ResultSetDto | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [leftTab,   setLeftTab]   = useState<LeftTab>('problem')
  const [error,     setError]     = useState<string | null>(null)

  // ── Load problem ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return
    problemsApi.getBySlug(slug)
      .then(({ data }) => setProblem(data))
      .catch(() => setError('Problem not found.'))
  }, [slug])

  // ── Run (no judging) ─────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!problem) return
    setLoading(true)
    setResult(null)
    setRunResult(null)
    try {
      const { data } = await submissionsApi.run(problem.id, query)
      setRunResult(data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Execution failed.'
      setRunResult({ columns: [], rows: [], rowCount: 0 })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [problem, query])

  // ── Submit (judge) ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!problem) return
    setLoading(true)
    setResult(null)
    setRunResult(null)
    try {
      const { data } = await submissionsApi.submit(problem.id, query)
      setResult(data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Submission failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [problem, query])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red text-sm">
        {error}
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-text2 text-sm">
        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        Loading…
      </div>
    )
  }

  const difficultyColor = {
    Easy:   'text-green border-green/30 bg-green/10',
    Medium: 'text-yellow border-yellow/30 bg-yellow/10',
    Hard:   'text-red border-red/30 bg-red/10',
  }[problem.difficulty]

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden">

      {/* ── Left pane: description / schema ──────────────────────────── */}
      <div className="w-[400px] min-w-[280px] max-w-[560px] flex flex-col border-r border-border resize-x overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border bg-surface flex-shrink-0">
          <LeftTabBtn
            active={leftTab === 'problem'}
            icon={<BookOpen size={13} />}
            label="Problem"
            onClick={() => setLeftTab('problem')}
          />
          <LeftTabBtn
            active={leftTab === 'schema'}
            icon={<Database size={13} />}
            label="Schema"
            onClick={() => setLeftTab('schema')}
          />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {leftTab === 'problem' ? (
            <div className="h-full overflow-auto p-4 prose prose-invert prose-sm max-w-none">
              {/* Header */}
              <div className="flex items-start justify-between mb-3 not-prose">
                <h1 className="text-base font-semibold text-text1">{problem.title}</h1>
                <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ml-2 ${difficultyColor}`}>
                  {problem.difficulty}
                </span>
              </div>

              {/* Tags */}
              {problem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4 not-prose">
                  {problem.tags.map((t) => (
                    <span key={t} className="text-xs px-1.5 py-0.5 bg-surface border border-border rounded text-text2">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Description — rendered as pre-formatted text */}
              <div
                className="text-sm text-text1 leading-relaxed whitespace-pre-wrap not-prose"
                dangerouslySetInnerHTML={{ __html: problem.description }}
              />

              {/* Stats */}
              <div className="mt-4 pt-3 border-t border-border not-prose flex gap-4 text-xs text-text2">
                <span>Accepted: <strong className="text-text1">{problem.acceptCount}</strong></span>
                <span>Submitted: <strong className="text-text1">{problem.submitCount}</strong></span>
                <span>Rate: <strong className="text-text1">{problem.acceptRate}%</strong></span>
              </div>
            </div>
          ) : (
            problem.schema
              ? <SchemaViewer schema={problem.schema} />
              : <div className="flex items-center justify-center h-full text-text2 text-sm">No schema info available.</div>
          )}
        </div>
      </div>

      {/* ── Right pane: editor + results ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface flex-shrink-0">
          <span className="text-text2 text-xs">SQL</span>
          <div className="flex-1" />
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-surface border border-border rounded hover:bg-border/50 transition-colors disabled:opacity-50"
          >
            <Play size={12} />
            Run  <kbd className="text-[10px] text-text2 ml-1">Ctrl+↵</kbd>
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-accent text-white rounded hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Send size={12} />
            Submit  <kbd className="text-[10px] opacity-70 ml-1">⇧Ctrl+↵</kbd>
          </button>
        </div>

        {/* Editor (top 60 %) */}
        <div className="flex-[3] min-h-0 relative">
          <SqlEditor
            value={query}
            onChange={setQuery}
            schema={problem.schema}
            onRun={handleRun}
            onSubmit={handleSubmit}
            height="100%"
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-border flex-shrink-0" />

        {/* Results (bottom 40 %) */}
        <div className="flex-[2] min-h-0 bg-bg">
          <ResultsPanel
            result={result}
            runResult={runResult}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

// ── Small helper ─────────────────────────────────────────────────────────
function LeftTabBtn({
  active, icon, label, onClick,
}: {
  active: boolean; icon: React.ReactNode; label: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors
        ${active
          ? 'border-accent text-text1'
          : 'border-transparent text-text2 hover:text-text1'
        }`}
    >
      {icon} {label}
    </button>
  )
}
