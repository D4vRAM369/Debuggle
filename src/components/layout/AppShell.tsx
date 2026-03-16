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
// Sidebar solo iconos: ahorra ~130px de ancho horizontal.
// El label aparece como tooltip nativo del OS (title attribute).
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
      title={item.label}   // tooltip nativo al hacer hover
      className={cn(
        // Base: centrado, tamaño fijo, transición
        'relative flex items-center justify-center w-full p-2.5 rounded-md transition-colors',
        // Estado inactivo
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        // Estado activo: borde izquierdo + fondo
        isActive && 'bg-primary/10 text-primary border-l-2 border-l-primary'
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {/* Punto indicador: Chat tiene contexto cargado */}
      {dot && (
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
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
    // Layout raíz: sidebar (solo iconos, 48px) + contenido
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar — solo iconos ── */}
      <aside className="w-12 shrink-0 flex flex-col border-r border-border bg-card">

        {/* Logo — solo el icono */}
        <div className="flex items-center justify-center py-3.5 border-b border-border">
          <span className="text-lg leading-none">🐛</span>
        </div>

        {/* Navegación principal */}
        <nav className="flex flex-col gap-0.5 p-1 flex-1">
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

        {/* Config — fijada al fondo del sidebar */}
        <div className="p-1 border-t border-border">
          <NavButton
            item={CONFIG_ITEM}
            isActive={activeTab === 'config'}
            onClick={() => onTabChange('config')}
          />
        </div>
      </aside>

      {/* ── Área de contenido principal ── */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {renderPage()}
      </main>

    </div>
  )
}
