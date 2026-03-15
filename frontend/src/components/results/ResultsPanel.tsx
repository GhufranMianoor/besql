import type { ExecutionResult, ResultSetDto, DiffResult } from '../../types'
import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface ResultsPanelProps {
  result:    ExecutionResult | null
  runResult: ResultSetDto | null
  loading:   boolean
}

export default function ResultsPanel({ result, runResult, loading }: ResultsPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-text2">
        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span>Executing…</span>
      </div>
    )
  }

  if (!result && !runResult) {
    return (
      <div className="flex items-center justify-center h-full text-text2 text-sm">
        Press <kbd className="mx-1 px-1.5 py-0.5 bg-border rounded text-xs font-mono">Ctrl+Enter</kbd> to run
        or <kbd className="mx-1 px-1.5 py-0.5 bg-border rounded text-xs font-mono">Ctrl+Shift+Enter</kbd> to submit.
      </div>
    )
  }

  if (runResult) {
    return <ResultTable data={runResult} />
  }

  if (result) {
    return <JudgeResult result={result} />
  }

  return null
}

// ── Run result table ──────────────────────────────────────────────────────

function ResultTable({ data }: { data: ResultSetDto }) {
  return (
    <div className="h-full overflow-auto p-2">
      <p className="text-text2 text-xs mb-2">{data.rowCount} row{data.rowCount !== 1 ? 's' : ''}</p>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {data.columns.map((col) => (
              <th
                key={col}
                className="text-left px-2 py-1 bg-surface border border-border text-accent font-medium"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="hover:bg-surface/50">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1 border border-border/50 text-text1 font-mono">
                  {cell === null
                    ? <span className="text-text2 italic">NULL</span>
                    : String(cell)
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Judge result ──────────────────────────────────────────────────────────

function JudgeResult({ result }: { result: ExecutionResult }) {
  const accepted = result.status === 'Accepted'

  return (
    <div className="h-full overflow-auto p-3 space-y-3">
      {/* Status banner */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold
        ${accepted ? 'bg-green/10 text-green border border-green/30' : 'bg-red/10 text-red border border-red/30'}`}
      >
        {accepted
          ? <CheckCircle size={16} />
          : <XCircle    size={16} />
        }
        <span>{result.status.replace(/([A-Z])/g, ' $1').trim()}</span>

        <div className="ml-auto flex items-center gap-3 text-xs font-normal text-text2">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {result.executionTimeMs.toFixed(1)} ms
          </span>
          {result.queryCost > 0 && (
            <span>Cost: {result.queryCost.toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Error message */}
      {result.errorMessage && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red/5 border border-red/20 rounded text-red text-xs font-mono">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          {result.errorMessage}
        </div>
      )}

      {/* Warnings */}
      {result.diff?.warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-2 bg-yellow/5 border border-yellow/20 rounded text-yellow-400 text-xs">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          {w}
        </div>
      ))}

      {/* Diff view */}
      {result.diff && !accepted && <DiffView diff={result.diff} />}
    </div>
  )
}

// ── Diff view ─────────────────────────────────────────────────────────────

function DiffView({ diff }: { diff: DiffResult }) {
  const [show, setShow] = useState(true)

  return (
    <div className="border border-border rounded overflow-hidden">
      <button
        onClick={() => setShow((s) => !s)}
        className="flex items-center justify-between w-full px-3 py-2 bg-surface text-xs text-text2 hover:text-text1"
      >
        <span>Result Diff  · Expected {diff.expectedRows} rows, got {diff.actualRows}</span>
        {show ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {show && (
        <div className="overflow-auto max-h-60">
          {diff.missingColumns.length > 0 && (
            <p className="px-3 py-1 text-xs text-red bg-red/5">
              Missing columns: {diff.missingColumns.join(', ')}
            </p>
          )}
          {diff.extraColumns.length > 0 && (
            <p className="px-3 py-1 text-xs text-yellow-400 bg-yellow/5">
              Extra columns: {diff.extraColumns.join(', ')}
            </p>
          )}
          {diff.rowDiffs.slice(0, 20).map((rd) => (
            <div key={rd.rowIndex} className="px-3 py-1 border-t border-border/50">
              <p className="text-xs text-text2 mb-1">Row {rd.rowIndex + 1}</p>
              {rd.cells.map((cell) => (
                <div key={cell.column} className="flex gap-2 text-xs font-mono">
                  <span className="text-text2 w-24 flex-shrink-0">{cell.column}</span>
                  <span className="text-red line-through">{String(cell.expected ?? 'NULL')}</span>
                  <span className="text-green">→ {String(cell.actual ?? 'NULL')}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
