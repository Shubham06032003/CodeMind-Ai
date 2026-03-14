import { useState } from 'react'
import { Brain, Link, Zap, GitBranch, Settings, User, ArrowRight, Sparkles } from 'lucide-react'
import { analyzeRepo } from '../lib/api.js'

const EXAMPLE_REPOS = [
  {
    name: 'facebook/react',
    desc: 'UI framework for building interfaces',
    icon: '⚛️',
    url: 'https://github.com/facebook/react',
  },
  {
    name: 'vercel/next.js',
    desc: 'The React Framework for the Web',
    icon: '▲',
    url: 'https://github.com/vercel/next.js',
  },
  {
    name: 'supabase/supabase',
    desc: 'Open source Firebase alternative',
    icon: '⚡',
    url: 'https://github.com/supabase/supabase',
  },
]

export default function LandingPage({ onAnalyze }) {
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(url) {
    const target = url || repoUrl
    if (!target.trim()) {
      setError('Please enter a GitHub repository URL.')
      return
    }
    if (!target.includes('github.com')) {
      setError('Please enter a valid GitHub URL (e.g. https://github.com/user/repo).')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { task_id } = await analyzeRepo(target.trim())
      onAnalyze(task_id, target.trim())
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to connect to backend. Is it running?')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 bg-grid-pattern flex flex-col">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full bg-brand-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-brand-800/10 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-brand-500 flex items-center justify-center glow-brand shrink-0">
            <Brain className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="font-display text-base md:text-lg font-bold text-white tracking-tight">CodeMind AI</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <User className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-12 md:py-20 text-center animate-fade-in">
        <div className="max-w-2xl w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-brand-900/60 border border-brand-700/40 text-brand-300 text-xs font-medium mb-6 md:mb-8">
            <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
            <span className="truncate">Powered by Gemini 2.5 Flash + RAG</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 md:mb-6">
            <span className="text-white">Understand Any </span>
            <span className="text-brand-400">Codebase</span>
            <br />
            <span className="text-white">Instantly</span>
          </h1>

          {/* Subtitle */}
          <p className="text-white/50 text-sm md:text-lg leading-relaxed mb-8 md:mb-10 max-w-lg mx-auto px-2">
            Paste a GitHub repository link below to start your AI-powered analysis.
            Get deep insights into architecture, logic, and patterns in seconds.
          </p>

          {/* URL Input */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 px-0 md:px-0">
            <div className="flex-1 relative">
              <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 shrink-0" />
              <input
                type="url"
                value={repoUrl}
                onChange={e => { setRepoUrl(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="https://github.com/username/repo"
                className="input-field pl-11 text-sm md:text-base"
                disabled={loading}
                autoFocus
              />
            </div>
            <button
              onClick={() => handleSubmit()}
              disabled={loading}
              className="btn-primary whitespace-nowrap glow-brand w-full sm:w-auto justify-center"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>Analyzing…</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>Analyze Repository</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-4 animate-fade-in px-2">{error}</p>
          )}

          {/* Example repos */}
          <div className="mt-8 md:mt-12">
            <p className="text-white/25 text-xs uppercase tracking-widest mb-4 md:mb-5 font-medium">Try an Example</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
              {EXAMPLE_REPOS.map(repo => (
                <button
                  key={repo.url}
                  onClick={() => { setRepoUrl(repo.url); handleSubmit(repo.url) }}
                  disabled={loading}
                  className="glass-panel p-3 md:p-4 text-left hover:border-brand-700/40 hover:bg-surface-700/60 transition-all duration-200 group disabled:opacity-50"
                >
                  <div className="flex items-center sm:items-start gap-3">
                    <span className="text-lg md:text-xl shrink-0">{repo.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold text-sm truncate group-hover:text-brand-300 transition-colors">
                        {repo.name}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5 leading-snug hidden sm:block">{repo.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-white/25 text-xs">
        <span className="text-center sm:text-left">© 2024 CodeMind AI. Powering the next generation of developers.</span>
        <div className="flex gap-4 md:gap-5 shrink-0">
          <a href="#" className="hover:text-white/50 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white/50 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white/50 transition-colors">Status</a>
        </div>
      </footer>
    </div>
  )
}