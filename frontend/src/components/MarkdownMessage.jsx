import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Check, Copy } from 'lucide-react'

function CodeBlock({ inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false)
  const code = String(children).replace(/\n$/, '')

  if (inline) {
    return (
      <code className="font-mono text-brand-300 bg-surface-900/80 px-1.5 py-0.5 rounded text-xs" {...props}>
        {code}
      </code>
    )
  }

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative group my-3">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-800/80 border border-white/10 text-white/30 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="font-mono text-xs bg-surface-900 rounded-lg p-4 overflow-x-auto border border-white/5 text-white/90 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default function MarkdownMessage({ content }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        components={{
          code: CodeBlock,
          // Override default elements for dark theme
          h1: ({ children }) => <h1 className="font-display text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="font-display text-lg font-semibold text-white mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="font-display text-base font-semibold text-white/90 mt-3 mb-1.5">{children}</h3>,
          p: ({ children }) => <p className="text-white/85 text-sm leading-relaxed mb-3">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-white/85 text-sm">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-white/85 text-sm">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-white/70 italic">{children}</em>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-brand-400 underline hover:text-brand-300">{children}</a>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-brand-500 pl-3 text-white/60 italic my-3">{children}</blockquote>,
          hr: () => <hr className="border-white/10 my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
