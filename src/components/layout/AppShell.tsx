import { useState } from 'react'
import { type LucideIcon, Zap, BookOpen, BarChart2, Settings2, MessageSquare, Globe, Moon, Sun, SlidersHorizontal, X } from 'lucide-react'
import type { AnalysisResult, Severity } from '@/lib/analyze'
import { AnalyzePage } from '@/pages/AnalyzePage'
import { ChatPage } from '@/pages/ChatPage'
import { VaultPage } from '@/pages/VaultPage'
import { PatternsPage } from '@/pages/PatternsPage'
import { ConfigPage } from '@/pages/ConfigPage'
import { Severity as SeverityBadge } from '@/components/ui/Severity'
import type { UIDensity, UILang, UIPrefs, UITheme } from '@/App'

export type TabId = 'analyze' | 'chat' | 'vault' | 'patterns' | 'config'

interface NavItem {
  id:    TabId
  label: string
  icon:  LucideIcon
  kbd:   string
}

const NAV_META: Omit<NavItem, 'label'>[] = [
  { id: 'analyze',  icon: Zap,           kbd: '⌘1' },
  { id: 'chat',     icon: MessageSquare, kbd: '⌘2' },
  { id: 'vault',    icon: BookOpen,      kbd: '⌘3' },
  { id: 'patterns', icon: BarChart2,     kbd: '⌘4' },
]

const LABELS: Record<UILang, Record<TabId, string>> = {
  es: { analyze: 'Analizar', chat: 'Chat', vault: 'Guía', patterns: 'Patrones', config: 'Config' },
  en: { analyze: 'Analyze', chat: 'Chat', vault: 'Vault', patterns: 'Patterns', config: 'Config' },
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
  onReplayOnboarding: () => void
  ui: UIPrefs
  tweaksOpen: boolean
  onToggleLang: () => void
  onToggleTheme: () => void
  onToggleTweaks: () => void
  onCloseTweaks: () => void
  onAccentChange: (accent: string) => void
  onThemeChange: (theme: UITheme) => void
  onDensityChange: (density: UIDensity) => void
  onLangChange: (lang: UILang) => void
}

export function AppShell({
  activeTab,
  onTabChange,
  chatContext,
  onAskAboutThis,
  onClearChatContext,
  onReplayOnboarding,
  ui,
  tweaksOpen,
  onToggleLang,
  onToggleTheme,
  onToggleTweaks,
  onCloseTweaks,
  onAccentChange,
  onThemeChange,
  onDensityChange,
  onLangChange,
}: AppShellProps): JSX.Element {
  const [severity, setSeverity] = useState<Severity | null>(null)
  const navItems: NavItem[] = NAV_META.map((item) => ({ ...item, label: LABELS[ui.lang][item.id] }))

  function renderPage(): JSX.Element {
    switch (activeTab) {
      case 'analyze':
        return <AnalyzePage lang={ui.lang} onAskAboutThis={onAskAboutThis} onAnalysisDone={(r) => setSeverity(r.severity)} />
      case 'chat':
        return <ChatPage lang={ui.lang} context={chatContext} onClearContext={onClearChatContext} />
      case 'vault':
        return <VaultPage lang={ui.lang} onAskAboutThis={onAskAboutThis} />
      case 'patterns':
        return <PatternsPage lang={ui.lang} />
      case 'config':
        return <ConfigPage lang={ui.lang} onReplayOnboarding={onReplayOnboarding} />
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
          {navItems.map((item) => {
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
            <span>{LABELS[ui.lang].config}</span>
            <span className="kbd">⌘,</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <section className="main">
        <div className="topbar">
          {severity && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="eyebrow" style={{ margin: 0 }}>{ui.lang === 'es' ? 'Severidad' : 'Severity'}</span>
              <SeverityBadge severity={severity} />
            </div>
          )}
          <span className="crumb"><b>DEBUGGLE</b> <span style={{ color: 'var(--text-4)' }}>/</span> {LABELS[ui.lang][activeTab]}</span>
          <span className="spacer" />
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn" title={ui.lang === 'es' ? 'Idioma' : 'Language'} onClick={onToggleLang}><Globe style={{ width: 16, height: 16 }} /></button>
            <button className="icon-btn" title={ui.lang === 'es' ? 'Tema' : 'Theme'} onClick={onToggleTheme}>{ui.theme === 'dark' ? <Moon style={{ width: 16, height: 16 }} /> : <Sun style={{ width: 16, height: 16 }} />}</button>
            <button className="icon-btn" title="Tweaks (⌘K)" onClick={onToggleTweaks}><SlidersHorizontal style={{ width: 16, height: 16 }} /></button>
          </div>
        </div>

        <main className="content">
          {renderPage()}
        </main>
      </section>

      <div className="tweaks" data-open={tweaksOpen}>
        <div className="tweaks-head">
          <SlidersHorizontal className="ico" />
          Tweaks
          <div style={{ flex: 1 }} />
          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={onCloseTweaks}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
        <div className="tweaks-body">
          <div className="tweak-row">
            <span className="lbl">Accent</span>
            <div className="swatches">
              {['#1DA1F2', '#7c5cff', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map((c) => (
                <button key={c} aria-pressed={ui.accent === c} style={{ background: c }} onClick={() => onAccentChange(c)} />
              ))}
            </div>
          </div>
          <div className="tweak-row">
            <span className="lbl">Theme</span>
            <div className="seg">
              <button aria-pressed={ui.theme === 'dark'} onClick={() => onThemeChange('dark')}>Dark</button>
              <button aria-pressed={ui.theme === 'light'} onClick={() => onThemeChange('light')}>Light</button>
            </div>
          </div>
          <div className="tweak-row">
            <span className="lbl">Density</span>
            <div className="seg">
              <button aria-pressed={ui.density === 'cozy'} onClick={() => onDensityChange('cozy')}>Cozy</button>
              <button aria-pressed={ui.density === 'compact'} onClick={() => onDensityChange('compact')}>Compact</button>
            </div>
          </div>
          <div className="tweak-row">
            <span className="lbl">Language</span>
            <div className="seg">
              <button aria-pressed={ui.lang === 'es'} onClick={() => onLangChange('es')}>Español</button>
              <button aria-pressed={ui.lang === 'en'} onClick={() => onLangChange('en')}>English</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
