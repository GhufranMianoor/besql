import { useRef, useEffect, useCallback } from 'react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import type { editor, languages, IDisposable } from 'monaco-editor'
import type { SchemaInfo } from '../../types'

// ── SQL keywords for syntax highlighting / completion ───────────────────
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
  'FULL', 'CROSS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN',
  'LIKE', 'ILIKE', 'IS', 'NULL', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC',
  'DESC', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'AS', 'WITH',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'INSERT', 'UPDATE', 'DELETE',
  'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'EXPLAIN', 'ANALYZE',
]

const SQL_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CAST',
  'LOWER', 'UPPER', 'TRIM', 'LENGTH', 'SUBSTRING', 'CONCAT', 'NOW',
  'DATE_TRUNC', 'EXTRACT', 'TO_CHAR', 'ROW_NUMBER', 'RANK', 'DENSE_RANK',
  'LEAD', 'LAG', 'FIRST_VALUE', 'LAST_VALUE', 'NTILE', 'OVER', 'PARTITION',
  'ROUND', 'FLOOR', 'CEIL', 'ABS', 'MOD', 'POWER', 'SQRT',
]

// ── Props ────────────────────────────────────────────────────────────────

export interface SqlEditorProps {
  value:       string
  onChange:   (value: string) => void
  schema?:     SchemaInfo
  onRun?:      () => void
  onSubmit?:   () => void
  readOnly?:   boolean
  height?:     string
}

// ── Component ────────────────────────────────────────────────────────────

export default function SqlEditor({
  value,
  onChange,
  schema,
  onRun,
  onSubmit,
  readOnly = false,
  height = '100%',
}: SqlEditorProps) {
  const monacoRef     = useRef<Monaco | null>(null)
  const editorRef     = useRef<editor.IStandaloneCodeEditor | null>(null)
  const completionRef = useRef<IDisposable | null>(null)

  // ── Register schema-aware completions ───────────────────────────────
  const registerCompletions = useCallback((monaco: Monaco) => {
    // Dispose previous provider to avoid duplicate suggestions
    completionRef.current?.dispose()

    completionRef.current = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', '\n'],

      provideCompletionItems(model, position): languages.CompletionList {
        const wordInfo = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber:   position.lineNumber,
          startColumn:     wordInfo.startColumn,
          endColumn:       wordInfo.endColumn,
        }

        const suggestions: languages.CompletionItem[] = []

        // ── SQL keywords ──────────────────────────────────────────────
        for (const kw of SQL_KEYWORDS) {
          suggestions.push({
            label:            kw,
            kind:             monaco.languages.CompletionItemKind.Keyword,
            insertText:       kw,
            detail:           'SQL keyword',
            range,
          })
        }

        // ── SQL functions ─────────────────────────────────────────────
        for (const fn of SQL_FUNCTIONS) {
          suggestions.push({
            label:            fn + '()',
            kind:             monaco.languages.CompletionItemKind.Function,
            insertText:       fn + '($1)',
            insertTextRules:  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail:           'SQL function',
            range,
          })
        }

        // ── Schema: table names ───────────────────────────────────────
        if (schema) {
          for (const table of schema.tables) {
            suggestions.push({
              label:      table.name,
              kind:       monaco.languages.CompletionItemKind.Class,
              insertText: table.name,
              detail:     `Table (${table.columns.length} columns)`,
              documentation: {
                value: table.columns
                  .map(c => `\`${c.name}\` ${c.type}${c.primaryKey ? ' 🔑' : ''}`)
                  .join('\n'),
              },
              range,
            })

            // ── Schema: column names (table.column) ───────────────────
            for (const col of table.columns) {
              suggestions.push({
                label:      `${table.name}.${col.name}`,
                kind:       monaco.languages.CompletionItemKind.Field,
                insertText: `${table.name}.${col.name}`,
                detail:     `${col.type}${col.primaryKey ? ' PRIMARY KEY' : ''}${col.nullable ? '' : ' NOT NULL'}`,
                range,
              })

              // Also add bare column names
              suggestions.push({
                label:      col.name,
                kind:       monaco.languages.CompletionItemKind.Field,
                insertText: col.name,
                detail:     `${table.name}.${col.name} (${col.type})`,
                range,
              })
            }
          }
        }

        return { suggestions }
      },
    })
  }, [schema])

  // ── Re-register when schema changes ─────────────────────────────────
  useEffect(() => {
    if (monacoRef.current) registerCompletions(monacoRef.current)
    return () => completionRef.current?.dispose()
  }, [registerCompletions])

  // ── Editor mount callback ────────────────────────────────────────────
  const handleMount: OnMount = (editorInstance, monaco) => {
    editorRef.current  = editorInstance
    monacoRef.current  = monaco

    // ── Configure SQL language tokens for better highlighting ─────────
    monaco.languages.setMonarchTokensProvider('sql', {
      keywords:  SQL_KEYWORDS,
      operators: ['=', '<>', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '||'],
      builtins:  SQL_FUNCTIONS,

      tokenizer: {
        root: [
          [/[a-zA-Z_$][\w$]*/, {
            cases: {
              '@keywords':  'keyword',
              '@builtins':  'predefined',
              '@default':   'identifier',
            },
          }],
          [/\d+(\.\d+)?/, 'number'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_sq'],
          [/"/, 'string', '@string_dq'],
          [/--.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/[;,.()\[\]{}]/, 'delimiter'],
        ],
        string_sq: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop'],
        ],
        string_dq: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment'],
        ],
      },
    })

    registerCompletions(monaco)

    // ── Keybindings ───────────────────────────────────────────────────
    editorInstance.addAction({
      id:    'besql-run',
      label: 'Run Query',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => onRun?.(),
    })

    editorInstance.addAction({
      id:    'besql-submit',
      label: 'Submit Solution',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: () => onSubmit?.(),
    })

    // ── Format SQL on Ctrl+Shift+F (basic) ───────────────────────────
    editorInstance.addAction({
      id:    'besql-format',
      label: 'Format SQL',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: (e) => {
        const raw    = e.getValue()
        const formatted = basicSqlFormat(raw)
        e.setValue(formatted)
      },
    })
  }

  return (
    <Editor
      height={height}
      language="sql"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      options={{
        readOnly,
        fontSize:          14,
        fontFamily:        '"JetBrains Mono", "Fira Code", monospace',
        fontLigatures:     true,
        lineNumbers:       'on',
        minimap:           { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap:          'on',
        tabSize:           2,
        insertSpaces:      true,
        formatOnPaste:     false,
        automaticLayout:   true,
        suggestOnTriggerCharacters: true,
        quickSuggestions:  { other: true, comments: false, strings: false },
        parameterHints:    { enabled: true },
        padding:           { top: 12 },
      }}
    />
  )
}

// ── Minimal SQL formatter ────────────────────────────────────────────────
// Capitalises keywords and adds newlines before major top-level clauses.
// NOTE: This is intentionally basic — it works well for simple queries but
// may misformat nested CTEs or sub-queries with the same clause keywords.
// A full-featured formatter (e.g. sql-formatter) can be swapped in here.
function basicSqlFormat(sql: string): string {
  const CLAUSE_KEYWORDS = /\b(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|FULL JOIN|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|UNION ALL|UNION|ON|AND|OR)\b/gi
  return sql
    .replace(CLAUSE_KEYWORDS, (kw) => '\n' + kw.toUpperCase())
    .replace(/^\n/, '')
    .replace(/\s{2,}/g, ' ')
}
