import { useState, useEffect } from 'react'
import { AppShell, type TabId } from '@/components/layout/AppShell'
import type { AnalysisResult } from '@/lib/analyze'
import type { UpdateInfo } from '@/types/api'
import { Download, RefreshCw, X } from 'lucide-react'
import { OnboardingPage } from '@/pages/OnboardingPage'

// ── Tipos de estado del updater ───────────────────────────────────────────────
type UpdateState =
  | { status: 'idle' }
  | { status: 'available';  info: UpdateInfo }
  | { status: 'downloaded'; info: UpdateInfo }

export type UILang = 'es' | 'en'
export type UITheme = 'dark' | 'light'
export type UIDensity = 'cozy' | 'compact'

export interface UIPrefs {
  accent: string
  lang: UILang
  theme: UITheme
  density: UIDensity
}

const WINDOW_LABELS: Record<UILang, Record<TabId, string>> = {
  es: { analyze: 'Analizar', chat: 'Chat', vault: 'Guía', patterns: 'Patrones', config: 'Config' },
  en: { analyze: 'Analyze', chat: 'Chat', vault: 'Vault', patterns: 'Patterns', config: 'Config' },
}

const DEFAULT_UI: UIPrefs = {
  accent: '#1DA1F2',
  lang: 'es',
  theme: 'dark',
  density: 'cozy',
}

const ONBOARDING_KEY = 'debuggle.onboarding.v1'

// ── Banner de actualización ───────────────────────────────────────────────────
function UpdateBanner({ state, onDismiss, onInstall }: {
  state:     UpdateState
  onDismiss: () => void
  onInstall: () => void
}): JSX.Element | null {
  if (state.status === 'idle') return null

  const isDownloaded = state.status === 'downloaded'

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs bg-primary/10 border-b border-primary/20 text-primary">
      <div className="flex items-center gap-2">
        <Download className="size-3.5 shrink-0" />
        {isDownloaded
          ? <span>Debuggle <strong>{state.info.version}</strong> descargada — reinicia para instalar.</span>
          : <span>Nueva versión <strong>{state.info.version}</strong> disponible. Descargando en segundo plano…</span>
        }
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isDownloaded && (
          <button
            onClick={onInstall}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="size-3" />
            Reiniciar
          </button>
        )}
        <button onClick={onDismiss} className="hover:text-foreground transition-colors">
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── App principal ─────────────────────────────────────────────────────────────
function App(): JSX.Element {
  const [activeTab,   setActiveTab]   = useState<TabId>('analyze')
  const [chatContext, setChatContext] = useState<AnalysisResult | null>(null)
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' })
  const [ui, setUi] = useState<UIPrefs>(DEFAULT_UI)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [onboardingReady, setOnboardingReady] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Registrar listeners del updater una sola vez al montar
  useEffect(() => {
    window.api.updater.onAvailable((info) => setUpdateState({ status: 'available',  info }))
    window.api.updater.onDownloaded((info) => setUpdateState({ status: 'downloaded', info }))
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('debuggle.ui')
    if (!raw) {
      // First run: detect OS language. Spanish if locale starts with 'es', English otherwise.
      const detectedLang: UILang = (navigator.language ?? 'en').startsWith('es') ? 'es' : 'en'
      setUi((prev) => ({ ...prev, lang: detectedLang }))
      return
    }
    try {
      const parsed = JSON.parse(raw) as Partial<UIPrefs>
      setUi({
        accent: parsed.accent ?? DEFAULT_UI.accent,
        lang: parsed.lang === 'en' ? 'en' : 'es',
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        density: parsed.density === 'compact' ? 'compact' : 'cozy',
      })
    } catch {
      // ignore broken persisted prefs
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (!e.metaKey && !e.ctrlKey) return
      if (showOnboarding) return
      switch (e.key) {
        case '1': e.preventDefault(); setActiveTab('analyze');  break
        case '2': e.preventDefault(); setActiveTab('chat');     break
        case '3': e.preventDefault(); setActiveTab('vault');    break
        case '4': e.preventDefault(); setActiveTab('patterns'); break
        case ',': e.preventDefault(); setActiveTab('config');   break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showOnboarding])

  useEffect(() => {
    const raw = localStorage.getItem(ONBOARDING_KEY)
    if (!raw) {
      setShowOnboarding(true)
      setOnboardingReady(true)
      return
    }
    try {
      const parsed = JSON.parse(raw) as { completed?: boolean }
      setShowOnboarding(!parsed.completed)
    } catch {
      setShowOnboarding(true)
    } finally {
      setOnboardingReady(true)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('debuggle.ui', JSON.stringify(ui))
    document.documentElement.dataset.theme = ui.theme
    document.documentElement.dataset.density = ui.density

    const accentHex = ui.accent.replace('#', '')
    const r = parseInt(accentHex.slice(0, 2), 16)
    const g = parseInt(accentHex.slice(2, 4), 16)
    const b = parseInt(accentHex.slice(4, 6), 16)
    const root = document.documentElement.style
    root.setProperty('--accent', ui.accent)
    root.setProperty('--accent-soft', `rgba(${r},${g},${b},0.14)`)
    root.setProperty('--accent-border', `rgba(${r},${g},${b},0.35)`)
  }, [ui])

  function handleAskAboutThis(result: AnalysisResult): void {
    setChatContext(result)
    setActiveTab('chat')
  }

  function handleClearChatContext(): void {
    setChatContext(null)
  }

  function persistOnboardingState(completed: boolean, skipped: boolean): void {
    localStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({
        completed,
        skipped,
        completedAt: completed ? new Date().toISOString() : null,
      }),
    )
  }

  function handleOnboardingFinish(skipped: boolean): void {
    persistOnboardingState(true, skipped)
    setShowOnboarding(false)
    setActiveTab('analyze')
  }

  function handleReplayOnboarding(): void {
    setTweaksOpen(false)
    setActiveTab('analyze')
    setShowOnboarding(true)
  }

  return (
    <div className="desktop">
      <div className="win">
        <div className="titlebar">
          <div className="title">Debuggle — {WINDOW_LABELS[ui.lang][activeTab]}</div>
        </div>

        <UpdateBanner
          state={updateState}
          onDismiss={() => setUpdateState({ status: 'idle' })}
          onInstall={() => window.api.updater.install()}
        />

        <div className="win-body">
          {onboardingReady && showOnboarding ? (
            <OnboardingPage lang={ui.lang} onFinish={handleOnboardingFinish} />
          ) : (
            <AppShell
              activeTab={activeTab}
              onTabChange={setActiveTab}
              chatContext={chatContext}
              onAskAboutThis={handleAskAboutThis}
              onClearChatContext={handleClearChatContext}
              onReplayOnboarding={handleReplayOnboarding}
              ui={ui}
              tweaksOpen={tweaksOpen}
              onToggleLang={() => setUi((prev) => ({ ...prev, lang: prev.lang === 'es' ? 'en' : 'es' }))}
              onToggleTheme={() => setUi((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))}
              onToggleTweaks={() => setTweaksOpen((v) => !v)}
              onCloseTweaks={() => setTweaksOpen(false)}
              onAccentChange={(accent) => setUi((prev) => ({ ...prev, accent }))}
              onThemeChange={(theme) => setUi((prev) => ({ ...prev, theme }))}
              onDensityChange={(density) => setUi((prev) => ({ ...prev, density }))}
              onLangChange={(lang) => setUi((prev) => ({ ...prev, lang }))}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
