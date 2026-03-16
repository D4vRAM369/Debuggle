import { type LucideIcon } from 'lucide-react'
import { Zap, BookOpen, BarChart2, Settings2, MessageSquare } from 'lucide-react'
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
        // Base: layout del botón
        'flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors relative',
        // Estado inactivo: texto apagado, hover sutil
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        // Estado activo: fondo y texto destacados
        isActive && 'bg-primary/10 text-primary font-medium'
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
      {/* Punto indicador: Chat tiene contexto cargado */}
      {dot && (
        <span className="ml-auto size-1.5 rounded-full bg-primary shrink-0" />
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
    // Layout raíz: sidebar + contenido lado a lado
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-card">

        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <span className="text-xl">🐛</span>
          <span className="font-semibold text-foreground tracking-tight">Debuggle</span>
        </div>

        {/* Navegación principal */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
              // Muestra el punto si Chat tiene un análisis cargado como contexto
              dot={item.id === 'chat' && chatContext !== null}
            />
          ))}
        </nav>

        {/* Config — fijada al fondo del sidebar */}
        <div className="p-2 border-t border-border">
          <NavButton
            item={CONFIG_ITEM}
            isActive={activeTab === 'config'}
            onClick={() => onTabChange('config')}
          />
        </div>
      </aside>

      {/* ── Área de contenido principal ── */}
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>

    </div>
  )
}
