import { type LucideIcon, Zap, BookOpen, BarChart2, Settings2, MessageSquare, Globe, Moon, SlidersHorizontal } from 'lucide-react'
import type { AnalysisResult } from '@/lib/analyze'
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
  analyze:  'Analizar',
  chat:     'Chat',
  vault:    'Guía',
  patterns: 'Patrones',
  config:   'Config',
}

function BugMark({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 8a4 4 0 0 1 8 0" />
      <path d="M9 5l-1-1.5" />
      <path d="M15 5l1-1.5" />
      <rect x="7" y="9" width="10" height="10" rx="4.5" />
      <path d="M2.5 12h4.5" />
      <path d="M17 12h4.5" />
      <path d="M4 7l3 1.5" />
      <path d="M20 7l-3 1.5" />
      <path d="M4 17l3-1.5" />
      <path d="M20 17l-3-1.5" />
      <path d="M12 12v6" />
    </svg>
  )
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
  function renderPage(): JSX.Element {
    switch (activeTab) {
      case 'analyze':
        return <AnalyzePage onAskAboutThis={onAskAboutThis} />
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
            <BugMark />
          </div>
          <div className="brand">
            <div className="name">Debuggle</div>
            <div className="tag">ERROR LAB</div>
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
                <Icon className="ico" />
                <span>{item.label}</span>
                {item.id === 'chat' && chatContext !== null
                  ? <span className="nav-dot" />
                  : <span className="kbd">{item.kbd}</span>
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
            <Settings2 className="ico" />
            <span>Config</span>
            <span className="kbd">⌘,</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <section className="main">
        <div className="topbar">
          <span className="crumb"><b>DEBUGGLE</b> <span style={{ color: 'var(--text-4)' }}>/</span> {SCREEN_LABELS[activeTab]}</span>
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
