import { useState, useEffect } from 'react'
import { AppShell, type TabId } from '@/components/layout/AppShell'
import type { AnalysisResult } from '@/lib/analyze'
import type { UpdateInfo } from '@/types/api'
import { Download, RefreshCw, X } from 'lucide-react'

// ── Tipos de estado del updater ───────────────────────────────────────────────
type UpdateState =
  | { status: 'idle' }
  | { status: 'available';  info: UpdateInfo }
  | { status: 'downloaded'; info: UpdateInfo }

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

  // Registrar listeners del updater una sola vez al montar
  useEffect(() => {
    window.api.updater.onAvailable((info) => setUpdateState({ status: 'available',  info }))
    window.api.updater.onDownloaded((info) => setUpdateState({ status: 'downloaded', info }))
  }, [])

  function handleAskAboutThis(result: AnalysisResult): void {
    setChatContext(result)
    setActiveTab('chat')
  }

  function handleClearChatContext(): void {
    setChatContext(null)
  }

  return (
    <div className="flex flex-col h-screen">
      <UpdateBanner
        state={updateState}
        onDismiss={() => setUpdateState({ status: 'idle' })}
        onInstall={() => window.api.updater.install()}
      />
      <div className="flex-1 min-h-0">
        <AppShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          chatContext={chatContext}
          onAskAboutThis={handleAskAboutThis}
          onClearChatContext={handleClearChatContext}
        />
      </div>
    </div>
  )
}

export default App
