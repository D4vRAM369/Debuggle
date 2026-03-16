import { useState } from 'react'
import { AppShell, type TabId } from '@/components/layout/AppShell'

function App(): JSX.Element {
  // Estado global de navegación — qué pantalla está visible
  const [activeTab, setActiveTab] = useState<TabId>('analyze')

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  )
}

export default App
