import { useState } from 'react'
import { AppShell, type TabId } from '@/components/layout/AppShell'
import type { AnalysisResult } from '@/lib/analyze'

function App(): JSX.Element {
  // Estado global de navegación — qué pantalla está visible
  const [activeTab, setActiveTab] = useState<TabId>('analyze')

  // Contexto que AnalyzePage puede pasar a ChatPage al pulsar "Preguntar sobre esto".
  // null = chat sin contexto previo (modo libre)
  const [chatContext, setChatContext] = useState<AnalysisResult | null>(null)

  // Navega al chat cargando el análisis actual como contexto
  function handleAskAboutThis(result: AnalysisResult): void {
    setChatContext(result)
    setActiveTab('chat')
  }

  function handleClearChatContext(): void {
    setChatContext(null)
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      chatContext={chatContext}
      onAskAboutThis={handleAskAboutThis}
      onClearChatContext={handleClearChatContext}
    />
  )
}

export default App
