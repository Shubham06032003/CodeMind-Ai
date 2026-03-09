import { useState } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import ChatPage from './pages/ChatPage.jsx'

export default function App() {
  const [appState, setAppState] = useState({
    view: 'landing',   // 'landing' | 'chat'
    taskId: null,
    repoUrl: '',
  })

  function handleAnalyze(taskId, repoUrl) {
    setAppState({ view: 'chat', taskId, repoUrl })
  }

  function handleBack() {
    setAppState({ view: 'landing', taskId: null, repoUrl: '' })
  }

  if (appState.view === 'chat') {
    return (
      <ChatPage
        taskId={appState.taskId}
        repoUrl={appState.repoUrl}
        onBack={handleBack}
      />
    )
  }

  return <LandingPage onAnalyze={handleAnalyze} />
}
