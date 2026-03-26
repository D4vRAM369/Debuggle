import { type LucideIcon } from 'lucide-react'
import { Bug, Zap, BookOpen, BarChart2, Settings2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalysisResult } from '@/lib/analyze'
import { AnalyzePage } from '@/pages/AnalyzePage'
import { ChatPage } from '@/pages/ChatPage'
import { VaultPage } from '@/pages/VaultPage'
import { PatternsPage } from '@/pages/PatternsPage'
import { ConfigPage } from '@/pages/ConfigPage'

// Las 5 pantallas de Debuggle
export type TabId = 'analyze' | 'chat' | 'vault' | 'patterns' | 'config'

// Definición de cada elemento de navegación
interface NavItem {
  id:    TabId
  label: string
  icon:  LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { id: 'analyze',  label: 'Analizar', icon: Zap          },
  { id: 'chat',     label: 'Chat',     icon: MessageSquare },
  { id: 'vault',    label: 'Guía',     icon: BookOpen      },
  { id: 'patterns', label: 'Patrones', icon: BarChart2     },
]

// Config va separado abajo del sidebar
const CONFIG_ITEM: NavItem = { id: 'config', label: 'Config', icon: Settings2 }

// ── Componente de ítem de navegación ────────────────────────────────────────
interface NavButtonProps {
  item:     NavItem
  isActive: boolean
  onClick:  () => void
  dot?:     boolean   // indicador de contexto cargado en la tab
}

function NavButton({ item, isActive, onClick, dot }: NavButtonProps): JSX.Element {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 w-full rounded-xl border px-3 py-3 text-left transition-all duration-200',
        isActive
          ? 'border-primary/30 bg-[linear-gradient(135deg,rgba(92,124,250,0.28),rgba(92,124,250,0.12))] text-white shadow-[0_10px_30px_rgba(59,91,219,0.18)]'
          : 'border-transparent text-muted-foreground hover:border-white/8 hover:bg-white/4 hover:text-white'
      )}
    >
      {isActive && (
        <span className="absolute inset-y-2 left-0 w-px rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(133,163,255,0.95),rgba(255,255,255,0))]" />
      )}
      <Icon className={cn('size-4 shrink-0 transition-transform duration-200', !isActive && 'group-hover:scale-105')} />
      <span className="text-sm font-medium leading-none truncate">{item.label}</span>
      {dot && (
        <span className="absolute right-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_14px_rgba(92,124,250,0.9)]" />
      )}
    </button>
  )
}

// ── Props del shell ──────────────────────────────────────────────────────────
interface AppShellProps {
  activeTab:          TabId
  onTabChange:        (tab: TabId) => void
  chatContext:        AnalysisResult | null
  onAskAboutThis:     (result: AnalysisResult) => void
  onClearChatContext: () => void
}

// ── Shell principal ──────────────────────────────────────────────────────────
export function AppShell({
  activeTab,
  onTabChange,
  chatContext,
  onAskAboutThis,
  onClearChatContext,
}: AppShellProps): JSX.Element {

  // Renderiza la página activa con sus props específicas
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
    <div className="relative flex h-screen overflow-hidden bg-background px-4 py-5 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(46,87,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(52,211,153,0.08),transparent_22%)]" />
      <div className="relative mx-auto flex h-full w-full max-w-[1480px] overflow-hidden rounded-[28px] border border-white/8 bg-[rgba(8,10,20,0.88)] shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <aside className="flex w-52 shrink-0 flex-col border-r border-white/6 bg-[linear-gradient(180deg,rgba(16,18,31,0.96),rgba(12,14,24,0.9))]">
          <div className="flex items-center gap-3 border-b border-white/6 px-5 py-5">
            <div className="flex size-9 items-center justify-center rounded-2xl border border-primary/30 bg-[linear-gradient(135deg,rgba(92,124,250,0.28),rgba(92,124,250,0.08))] text-primary shadow-[0_12px_35px_rgba(59,91,219,0.22)]">
              <Bug className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">Debuggle</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Error Lab</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
            {NAV_ITEMS.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                onClick={() => onTabChange(item.id)}
                dot={item.id === 'chat' && chatContext !== null}
              />
            ))}
          </nav>

          <div className="px-3 pb-3 pt-2">
            <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-2">
              <NavButton
                item={CONFIG_ITEM}
                isActive={activeTab === 'config'}
                onClick={() => onTabChange('config')}
              />
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
            </div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground">Debuggle</p>
            <div className="w-14" />
          </div>

          <main className="flex-1 min-w-0 overflow-hidden">
            {renderPage()}
          </main>
        </section>
      </div>
    </div>
  )
}
