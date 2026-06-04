import { useState } from 'react'
import type { ChatSource } from '../lib/types'

interface Props {
  sources: ChatSource[]
}

export function SourcesAccordion({ sources }: Props) {
  const [open, setOpen] = useState(false)

  if (!sources || sources.length === 0) {
    return (
      <p className="text-xs text-gray-400 mt-2">No sources retrieved.</p>
    )
  }

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
        aria-expanded={open}
      >
        <span>Sources ({sources.length})</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul className="divide-y divide-gray-100">
          {sources.map((src) => (
            <li key={src.chunkId} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800 truncate max-w-[60%]">
                  {src.documentName}
                </span>
                {src.pageNumber !== null && (
                  <span className="text-xs text-gray-400">
                    Page {src.pageNumber}
                  </span>
                )}
              </div>

              {/* Similarity bar */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.round((src.similarityScore ?? 0) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {Math.round((src.similarityScore ?? 0) * 100)}%
                </span>
              </div>

              <p className="text-xs text-gray-500 line-clamp-2">
                {src.excerpt.length > 150 ? `${src.excerpt.slice(0, 150)}…` : src.excerpt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
