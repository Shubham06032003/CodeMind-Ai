import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const fileName = source.file.split('/').pop()
  const dirPath = source.file.includes('/') ? source.file.substring(0, source.file.lastIndexOf('/')) : ''

  function handleCopy() {
    navigator.clipboard.writeText(source.snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="glass-panel overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
      >
        <span className="text-brand-500 text-xs font-mono font-bold w-5 shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-white text-xs font-medium">{fileName}</span>
            {dirPath && (
              <span className="text-white/30 text-[10px] truncate">{dirPath}</span>
            )}
          </div>
          <span className="text-white/35 text-[10px]">
            Lines {source.start_line}–{source.end_line}
          </span>
        </div>
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-white/5">
          <div className="relative group">
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1 rounded bg-surface-800/80 border border-white/10 text-white/30 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <pre className="text-[11px] font-mono text-white/75 p-3 overflow-x-auto leading-relaxed max-h-60 bg-surface-900/60">
              <code>{source.snippet}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SourcesPanel({ sources }) {
  return (
    <div className="mt-2 space-y-1.5 animate-fade-in">
      {sources.map((source, i) => (
        <SourceCard key={i} source={source} index={i} />
      ))}
    </div>
  )
}
