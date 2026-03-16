/**
 * Pantalla Guía — bóveda personal de errores guardados
 *
 * Layout master-detail:
 *   ├── Panel izquierdo (280px): lista de entradas + buscador
 *   └── Panel derecho (flex-1): detalle de la entrada seleccionada
 *
 * Fuente de datos: window.api.vault (IPC → main.ts → ~/Debuggle/vault/*.md)
 */
import { useState, useEffect } from 'react'
import {
  BookOpen, Search, Trash2, MessageSquare,
  Loader2, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { VaultMeta, VaultEntry } from '@/types/api'
import type { AnalysisResult, Severity } from '@/lib/analyze'
import { CodeBlock } from '@/components/ui/CodeBlock'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formatea una fecha ISO como tiempo relativo en español */
function formatDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)  return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days  = Math.floor(hours / 24)
  if (days < 7)  return `hace ${days}d`
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

/** Convierte una VaultEntry a AnalysisResult para pasarla al Chat */
function entryToAnalysisResult(entry: VaultEntry): AnalysisResult {
  return {
    errorType:    entry.errorType,
    language:     entry.language,
    severity:     entry.severity,
    explanation:  entry.explanation,
    solution:     entry.solution,
    terms:        entry.terms,
    correctedCode: entry.correctedCode,
  }
}

// ── Estilos de severidad ──────────────────────────────────────────────────────
const SEVERITY_STYLES: Record<Severity, string> = {
  low:      'bg-blue-500/15   text-blue-400   border-blue-500/30',
  medium:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  high:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15    text-red-400    border-red-500/30',
}

const SEVERITY_DOT: Record<Severity, string> = {
  low:      'bg-blue-400',
  medium:   'bg-yellow-400',
  high:     'bg-orange-400',
  critical: 'bg-red-400',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Bajo', medium: 'Medio', high: 'Alto', critical: 'Crítico',
}

const LEVEL_LABELS: Record<string, string> = {
  novato: 'Novato', medio: 'Medio', experto: 'Experto',
}



// ── Props ──────────────────────────────────────────────────────────────────────
interface VaultPageProps {
  onAskAboutThis: (result: AnalysisResult) => void
}

// ── Pantalla Guía ─────────────────────────────────────────────────────────────
export function VaultPage({ onAskAboutThis }: VaultPageProps): JSX.Element {
  const [entries,     setEntries]     = useState<VaultMeta[]>([])
  const [selected,    setSelected]    = useState<VaultEntry | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingEntry,setLoadingEntry]= useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [search,      setSearch]      = useState('')

  // ── Carga la lista al montar ──────────────────────────────────────────────
  useEffect(() => {
    loadList()
  }, [])

  async function loadList(): Promise<void> {
    setLoadingList(true)
    try {
      const list = await window.api.vault.list()
      setEntries(list)
    } finally {
      setLoadingList(false)
    }
  }

  async function handleSelect(meta: VaultMeta): Promise<void> {
    if (selected?.id === meta.id) return
    setLoadingEntry(true)
    try {
      const entry = await window.api.vault.read(meta.id)
      setSelected(entry)
    } finally {
      setLoadingEntry(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!selected || deleting) return
    const ok = window.confirm(
      `¿Eliminar "${selected.errorType}"?\nEsta acción no se puede deshacer.`
    )
    if (!ok) return

    setDeleting(true)
    try {
      await window.api.vault.delete(selected.id)
      setSelected(null)
      await loadList()
    } finally {
      setDeleting(false)
    }
  }

  // ── Filtrado del buscador ─────────────────────────────────────────────────
  const filtered = entries.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.errorType.toLowerCase().includes(q) ||
      e.language.toLowerCase().includes(q)
    )
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Panel izquierdo: lista ── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-border">

        {/* Cabecera de la lista */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Mi Guía</span>
            {entries.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-auto">
                {entries.length}
              </Badge>
            )}
          </div>
          {/* Buscador */}
          <div className="relative">
            <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar error o lenguaje..."
              className={cn(
                'w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-input',
                'bg-background text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-1 focus:ring-ring'
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de entradas */}
        <div className="flex-1 overflow-auto">
          {loadingList && (
            <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-xs">Cargando...</span>
            </div>
          )}

          {!loadingList && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-4 text-center">
              <BookOpen className="size-8 opacity-20" />
              <p className="text-xs leading-relaxed opacity-60">
                Guarda un análisis desde Analizar para verlo aquí.
              </p>
            </div>
          )}

          {!loadingList && entries.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 gap-1 text-muted-foreground px-4 text-center">
              <p className="text-xs opacity-60">Sin resultados para "{search}"</p>
            </div>
          )}

          {filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => handleSelect(entry)}
              className={cn(
                'w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors',
                'hover:bg-accent/60',
                selected?.id === entry.id && 'bg-primary/8 border-l-2 border-l-primary'
              )}
            >
              <div className="flex items-start gap-2">
                {/* Punto de severidad */}
                <span className={cn(
                  'size-1.5 rounded-full mt-1.5 shrink-0',
                  SEVERITY_DOT[entry.severity]
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {entry.errorType}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{entry.language}</span>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <span className="text-xs text-muted-foreground">{LEVEL_LABELS[entry.level]}</span>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <span className="text-xs text-muted-foreground/60">{formatDate(entry.date)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Panel derecho: detalle ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Estado vacío */}
        {!selected && !loadingEntry && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="size-7 opacity-25" />
            </div>
            <p className="text-sm opacity-60">Selecciona una entrada para leerla</p>
          </div>
        )}

        {/* Cargando entrada */}
        {loadingEntry && (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin opacity-40" />
          </div>
        )}

        {/* Detalle de la entrada */}
        {selected && !loadingEntry && (
          <div className="flex flex-col h-full overflow-hidden">

            {/* Cabecera del detalle */}
            <div className="px-5 pt-4 pb-3 border-b border-border space-y-2 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('border', SEVERITY_STYLES[selected.severity])}>
                    {selected.errorType}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{selected.language}</Badge>
                  <Badge variant="outline" className={cn('text-xs border', SEVERITY_STYLES[selected.severity])}>
                    {SEVERITY_LABELS[selected.severity]}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {LEVEL_LABELS[selected.level]}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10 border border-primary/30"
                    onClick={() => onAskAboutThis(entryToAnalysisResult(selected))}
                  >
                    <MessageSquare className="size-3.5" />
                    Preguntar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-red-400"
                    onClick={handleDelete}
                    disabled={deleting}
                    title="Eliminar entrada"
                  >
                    {deleting
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Trash2 className="size-3.5" />
                    }
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Guardado {formatDate(selected.date)}
              </p>
            </div>

            {/* Cuerpo del detalle — scrollable */}
            <div className="flex-1 overflow-auto px-5 py-4 space-y-4 text-sm">

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  📝 Qué pasó
                </p>
                <p className="text-foreground leading-relaxed">{selected.explanation}</p>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  💡 Cómo solucionarlo
                </p>
                <p className="text-foreground leading-relaxed">{selected.solution}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  🔑 Términos clave
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.terms.map((term) => (
                    <Badge key={term} variant="secondary" className="text-xs">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>

              {selected.correctedCode && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      🔧 Corrección sugerida
                    </p>
                    <CodeBlock code={selected.correctedCode} language={selected.language} />
                  </div>
                </>
              )}

              {/* Error original — colapsado al fondo */}
              <Separator />
              <details className="group">
                <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors">
                  📋 Error original
                </summary>
                <pre className="mt-2 bg-zinc-950 border border-border rounded-md p-3 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {selected.input}
                </pre>
              </details>

            </div>
          </div>
        )}
      </main>
    </div>
  )
}
