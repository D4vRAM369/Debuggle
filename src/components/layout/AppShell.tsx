import { useState } from 'react'
import { type LucideIcon, Bug, Zap, BookOpen, BarChart2, Settings2, MessageSquare, Globe, Moon, SlidersHorizontal } from 'lucide-react'
import type { AnalysisResult, Severity } from '@/lib/analyze'
import { Severity as SeverityBadge } from '@/components/ui/Severity'
import { AnalyzePage } from '@/pages/AnalyzePage'
import { ChatPage } from '@/pages/ChatPage'
import { VaultPage } from '@/pages/VaultPage'
import { PatternsPage } from '@/pages/PatternsPage'
import { ConfigPage } from '@/pages/ConfigPage'

export type TabId = 'analyze' | 'chat' | 'vault' | 'patterns' | 'config'

interface NavItem {
  id:    TabId
  label: string
  icon:  LucideIcon
  kbd:   string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'analyze',  label: 'Analizar', icon: Zap,           kbd: '⌘1' },
  { id: 'chat',     label: 'Chat',     icon: MessageSquare, kbd: '⌘2' },
  { id: 'vault',    label: 'Guía',     icon: BookOpen,      kbd: '⌘3' },
  { id: 'patterns', label: 'Patrones', icon: BarChart2,     kbd: '⌘4' },
]

const SCREEN_LABELS: Record<TabId, string> = {
  analyze:  'ANALIZAR',
  chat:     'CHAT',
  vault:    'GUÍA',
  patterns: 'PATRONES',
  config:   'CONFIG',
}

interface AppShellProps {
  activeTab:          TabId
  onTabChange:        (tab: TabId) => void
  chatContext:        AnalysisResult | null
  onAskAboutThis:     (result: AnalysisResult) => void
  onClearChatContext: () => void
}

export function AppShell({
  activeTab,
  onTabChange,
  chatContext,
  onAskAboutThis,
  onClearChatContext,
}: AppShellProps): JSX.Element {
  const [severity, setSeverity] = useState<Severity | null>(null)

  function renderPage(): JSX.Element {
    switch (activeTab) {
      case 'analyze':
        return <AnalyzePage onAskAboutThis={onAskAboutThis} onAnalysisDone={(r) => setSeverity(r.severity)} />
      case 'chat':
        return <ChatPage context={chatContext} onClearContext={onClearChatContext} />
      case 'vault':
        return <VaultPage onAskAboutThis={onAskAboutThis} />
      case 'patterns':
        return <PatternsPage />
      case 'config':
        return <ConfigPage />
    }
  }

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="side">
        <div className="side-head">
          <div className="logo">
            <Bug style={{ width: 20, height: 20 }} />
          </div>
          <div className="brand">
            <div className="name">Debuggle</div>
            <div className="tag">Error Lab</div>
          </div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                className="nav-item"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="nav-ico" />
                <span>{item.label}</span>
                {item.id === 'chat' && chatContext !== null
                  ? <span className="nav-dot" />
                  : <span className="nav-kbd">{item.kbd}</span>
                }
              </button>
            )
          })}
        </nav>

        <div className="side-foot">
          <button
            className="nav-item"
            aria-current={activeTab === 'config' ? 'true' : undefined}
            onClick={() => onTabChange('config')}
          >
            <Settings2 className="nav-ico" />
            <span>Config</span>
            <span className="nav-kbd">⌘,</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <section className="main">
        <div className="topbar">
          <SeverityBadge severity={severity} dotOnly />
          <span className="spacer" />
          <span className="crumb">DEBUGGLE / <b>{SCREEN_LABELS[activeTab]}</b></span>
          <span className="spacer" />
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn" title="Idioma"><Globe style={{ width: 16, height: 16 }} /></button>
            <button className="icon-btn" title="Tema"><Moon style={{ width: 16, height: 16 }} /></button>
            <button className="icon-btn" title="Tweaks"><SlidersHorizontal style={{ width: 16, height: 16 }} /></button>
          </div>
        </div>

        <main className="content">
          {renderPage()}
        </main>
      </section>
    </div>
  )
}
