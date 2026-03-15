import type { SchemaInfo, TableInfo } from '../../types'
import { useState } from 'react'
import { ChevronRight, ChevronDown, Table2, Key, Link } from 'lucide-react'

interface SchemaViewerProps {
  schema: SchemaInfo
}

export default function SchemaViewer({ schema }: SchemaViewerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  return (
    <div className="h-full overflow-auto bg-surface border-r border-border p-3 font-mono text-sm">
      <p className="text-text2 text-xs uppercase tracking-widest mb-3 px-1">Schema</p>
      {schema.tables.map((table) => (
        <TableNode
          key={table.name}
          table={table}
          isOpen={expanded.has(table.name)}
          onToggle={() => toggle(table.name)}
        />
      ))}
    </div>
  )
}

function TableNode({
  table,
  isOpen,
  onToggle,
}: {
  table:    TableInfo
  isOpen:   boolean
  onToggle: () => void
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full text-left px-1 py-1 rounded hover:bg-border/50 transition-colors"
      >
        {isOpen
          ? <ChevronDown  size={12} className="text-text2 flex-shrink-0" />
          : <ChevronRight size={12} className="text-text2 flex-shrink-0" />
        }
        <Table2 size={13} className="text-accent flex-shrink-0" />
        <span className="text-text1 font-medium truncate">{table.name}</span>
        <span className="ml-auto text-text2 text-xs">{table.columns.length}</span>
      </button>

      {isOpen && (
        <div className="ml-5 border-l border-border/50 pl-2 mt-0.5">
          {table.columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center gap-1.5 py-0.5 text-xs text-text2 hover:text-text1 cursor-default"
              title={`${col.name}: ${col.type}${col.nullable ? '' : ' NOT NULL'}`}
            >
              {col.primaryKey
                ? <Key  size={10} className="text-yellow-500 flex-shrink-0" />
                : col.foreignKey
                  ? <Link size={10} className="text-blue-400 flex-shrink-0" />
                  : <span className="w-2.5 flex-shrink-0" />
              }
              <span className="truncate">{col.name}</span>
              <span className="ml-auto text-text2/60 flex-shrink-0">{col.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
