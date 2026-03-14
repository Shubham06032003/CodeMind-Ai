import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, ArrowLeft, Send, Loader2, GitBranch, CheckCircle2, XCircle,
         Clock, Paperclip, History, Zap, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { getStatus, chat as chatApi } from '../lib/api.js'
import MarkdownMessage from '../components/MarkdownMessage.jsx'
import SourcesPanel from '../components/SourcesPanel.jsx'

const SUGGESTED_QUESTIONS = [
  'Explain the project architecture',
  'Where is the DB connection?',
  'Find auth logic',
  'List API routes',
]

const STATUS_LABEL = {
  queued: 'Queued',
  cloning: 'Cloning repo…',
  indexing: 'Scanning files…',
  embedding: 'Generating embeddings…',
  saving: 'Building index…',
  complete: 'Index complete',
  ready: 'Index complete',
  error: 'Error',
}

export default function ChatPage({ taskId, repoUrl, onBack }) {
  const [taskStatus, setTaskStatus] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [newRepoUrl, setNewRepoUrl] = useState(repoUrl)
  const [showLimitPopup, setShowLimitPopup] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const pollRef = useRef(null)

  // Derive short repo name for display
  const repoName = repoUrl.replace('https://github.com/', '').replace(/\/$/, '')

  // ── Status polling ─────────────────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    try {
      const data = await getStatus(taskId)
      setTaskStatus(data)
      if (data.status === 'complete' || data.status === 'ready') {
        clearInterval(pollRef.current)
        
        if (data.limit_exceeded && !sessionStorage.getItem(`limit_warned_${taskId}`)) {
           setLimitMessage('Repository File Limit Reached. To ensure fast analysis, we only indexed the first 300 files.')
           setShowLimitPopup(true)
           sessionStorage.setItem(`limit_warned_${taskId}`, 'true')
        }

        // Welcome message
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I've finished analysing the **${repoName}** repository. I'm ready to explain the architecture, find specific logic, or help you debug components. What would you like to know first?`,
          sources: [],
          ts: Date.now(),
        }])
        inputRef.current?.focus()
      } else if (data.status === 'error') {
        clearInterval(pollRef.current)
        if (data.message && (data.message.toLowerCase().includes('limit') || data.message.toLowerCase().includes('tim'))) {
           setLimitMessage(`Analysis Limit Reached: ${data.message}`)
           setShowLimitPopup(true)
        }
      }
    } catch (err) {
      console.error('Status poll error:', err)
    }
  }, [taskId, repoName])

  useEffect(() => {
    pollStatus()
    pollRef.current = setInterval(pollStatus, 2000)
    return () => clearInterval(pollRef.current)
  }, [pollStatus])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage(text) {
    const question = (text || input).trim()
    if (!question || isAsking) return
    setInput('')
    setIsAsking(true)

    const userMsg = { id: Date.now(), role: 'user', content: question, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])

    try {
      const result = await chatApi(taskId, question)
      
      if (result.answer && result.answer.includes('Gemini API error') && (result.answer.includes('429') || result.answer.toLowerCase().includes('quota') || result.answer.toLowerCase().includes('exhausted') || result.answer.toLowerCase().includes('limit'))) {
        setLimitMessage('API Quota Exceeded. You have exhausted the current API limit for Gemini. Showing offline stub answers instead.')
        setShowLimitPopup(true)
      }
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: result.answer,
        sources: result.sources || [],
        ts: Date.now(),
      }])
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message
      if (detail && (detail.toLowerCase().includes('limit') || detail.toLowerCase().includes('429') || detail.toLowerCase().includes('exhausted'))) {
        setLimitMessage('API Limit Reached. You have exhausted the current API limit. Please try again later.')
        setShowLimitPopup(true)
      }
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ Error: ${detail}`,
        sources: [],
        ts: Date.now(),
      }])
    } finally {
      setIsAsking(false)
    }
  }

  const isReady = taskStatus?.status === 'complete' || taskStatus?.status === 'ready'
  const isError = taskStatus?.status === 'error'
  const progress = taskStatus?.progress || 0

  return (
    <div className="h-screen bg-surface-900 bg-grid-pattern flex flex-col overflow-hidden">
      {/* Top bar */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm leading-none">CodeMind AI</p>
            <p className="text-white/30 text-[10px] uppercase tracking-wider leading-none mt-0.5">Understand Any Codebase Instantly</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button className="px-4 py-2 rounded-lg text-white/60 hover:text-white text-sm border border-white/10 hover:border-white/20 transition-all">
            Sign In
          </button>
          <button className="btn-primary text-xs py-2">Get Started</button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-64 shrink-0 border-r border-white/5 flex flex-col p-4 gap-5 overflow-y-auto">
          <div>
            <h2 className="font-display font-bold text-white text-lg leading-tight">
              Analyze a GitHub Repository
            </h2>
            <p className="text-white/35 text-xs mt-1">Connect your project to start exploring.</p>
          </div>

          {/* Repo URL field */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2 font-medium">Repository URL</p>
            <div className="flex gap-1.5">
              <input
                value={newRepoUrl}
                onChange={e => setNewRepoUrl(e.target.value)}
                className="flex-1 min-w-0 bg-surface-700/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-brand-500/60 truncate"
                readOnly
              />
              <button className="p-2 rounded-lg bg-surface-700/60 border border-white/10 text-white/40 hover:text-white transition-colors">
                <GitBranch className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Analyze button */}
          <button
            onClick={onBack}
            className="btn-primary w-full justify-center text-xs py-2.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Analyze Repository
          </button>

          {/* Status block */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-medium">Status</p>
              <div className={`w-2 h-2 rounded-full ${
                isReady ? 'bg-green-400' :
                isError ? 'bg-red-400' :
                'bg-brand-400 animate-pulse'
              }`} />
            </div>
            <div className="glass-panel p-3 space-y-2">
              <p className="text-white text-sm font-semibold">
                {isError ? '❌ Error' : isReady ? '✅ Index complete' : STATUS_LABEL[taskStatus?.status] || 'Loading…'}
              </p>
              {taskStatus?.message && (
                <p className="text-white/45 text-xs leading-relaxed">{taskStatus.message}</p>
              )}
              {!isReady && !isError && (
                <div className="w-full h-1.5 bg-surface-900 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              {isReady && (
                <div className="w-full h-1.5 bg-brand-500/30 rounded-full">
                  <div className="h-full w-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* Active stack */}
          {taskStatus?.stack_tags?.length > 0 && (
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2 font-medium">Active Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {taskStatus.stack_tags.map(tag => (
                  <span key={tag} className="tag-pill">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {isReady && (
            <div className="glass-panel p-3 space-y-1.5">
              {taskStatus?.file_count > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Files</span>
                  <span className="text-white font-medium">{taskStatus.file_count}</span>
                </div>
              )}
              {taskStatus?.chunk_count > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Chunks</span>
                  <span className="text-white font-medium">{taskStatus.chunk_count}</span>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && !isReady && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center animate-pulse-slow">
                  <div className="w-16 h-16 rounded-2xl bg-brand-900/50 border border-brand-700/30 flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-brand-400" />
                  </div>
                  <p className="text-white/50 text-sm">
                    {isError ? 'Failed to index repository.' : 'Indexing your repository…'}
                  </p>
                  <p className="text-white/25 text-xs mt-1">
                    {isError ? taskStatus?.message : 'This may take a moment for large repos.'}
                  </p>
                </div>
              </div>
            )}

            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {isAsking && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-brand-900/60 border border-brand-700/30 flex items-center justify-center shrink-0 mt-1">
                  <Brain className="w-4 h-4 text-brand-400" />
                </div>
                <div className="glass-panel px-4 py-3 max-w-2xl">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested questions */}
          {isReady && messages.length <= 1 && (
            <div className="px-6 pb-2 flex gap-2 flex-wrap shrink-0">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={isAsking}
                  className="px-3 py-1.5 rounded-full text-xs bg-surface-700/60 border border-white/10 text-white/60 hover:text-white hover:border-brand-500/40 transition-all disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="px-6 pb-6 shrink-0">
            <div className="glass-panel flex items-end gap-3 p-3">
              <button className="p-2 text-white/30 hover:text-white/60 transition-colors shrink-0 self-end mb-0.5">
                <Paperclip className="w-4 h-4" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder={isReady ? 'Ask a question about the codebase…' : 'Waiting for indexing to complete…'}
                disabled={!isReady || isAsking}
                rows={1}
                className="flex-1 bg-transparent resize-none text-sm text-white placeholder-white/25 outline-none leading-relaxed max-h-32 py-1.5 disabled:opacity-50"
                style={{ minHeight: '2rem' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!isReady || isAsking || !input.trim()}
                className="w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-400 flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              >
                {isAsking ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <p className="text-white/20 text-[10px] text-right mt-1.5">Press Cmd + Enter to send</p>
          </div>
        </main>
      </div>

      {/* Limit Popup Modal */}
      {showLimitPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-surface-800 border border-brand-500/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-display font-medium text-lg mb-1">Limit Finished</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  {limitMessage}
                </p>
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowLimitPopup(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-colors font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Individual chat message ───────────────────────────────────────────────────
function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const [showSources, setShowSources] = useState(false)
  const hasSources = message.sources && message.sources.length > 0

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 animate-slide-up">
        <div className="max-w-lg bg-brand-600/80 border border-brand-500/30 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-white text-sm leading-relaxed">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-brand-800 border border-brand-600/30 flex items-center justify-center shrink-0 mt-1 text-xs font-bold text-brand-300">
          U
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl bg-brand-900/60 border border-brand-700/30 flex items-center justify-center shrink-0 mt-1">
        <Brain className="w-4 h-4 text-brand-400" />
      </div>
      <div className="flex-1 max-w-3xl space-y-3">
        <div className="glass-panel px-4 py-4">
          <MarkdownMessage content={message.content} />
        </div>

        {hasSources && (
          <div>
            <button
              onClick={() => setShowSources(v => !v)}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <span className="font-medium text-white/60">Sources used</span>
              <span className="px-1.5 py-0.5 rounded-full bg-brand-900/50 text-brand-400 text-[10px]">{message.sources.length}</span>
              {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showSources && <SourcesPanel sources={message.sources} />}
            {!showSources && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {message.sources.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setShowSources(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-700/60 border border-white/5 text-[11px] text-white/50 hover:text-white/80 hover:border-brand-700/40 transition-all"
                  >
                    <span className="text-brand-500">📄</span>
                    <span className="truncate max-w-[120px]">{s.file.split('/').pop()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
