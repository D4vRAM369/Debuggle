/**
 * Pantalla Patrones — estadísticas del vault personal
 *
 * Secciones:
 *   1. Tarjetas resumen (total, tipos únicos, error top, lenguaje top)
 *   2. Barras de frecuencia de errores (top 5)
 *   3. Barras de frecuencia de lenguajes
 *   4. Lista de errores repetidos (aparecen > 1 vez)
 */
import { useEffect, useState } from 'react'
import { BarChart2, RefreshCw, AlertTriangle, Code2, Hash, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { computeStats } from '@/lib/stats'
import type { VaultMeta } from '@/types/api'

// ── Subcomponentes ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'text-slate-100',
}: {
  icon: React.ElementType
  label: string
  value: string | number | null
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 flex items-start gap-3">
      <div className="mt-0.5 text-slate-500">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className={cn('text-lg font-bold truncate', accent)}>{value ?? '—'}</p>
      </div>
    </div>
  )
}

type PillColors = { dot: string; bg: string; border: string; bar: string; badge: string; badgeText: string }

const ERROR_PALETTE: PillColors[] = [
  { dot: '#ef4444', bg: 'rgba(239,68,68,.04)',  border: 'rgba(239,68,68,.18)',  bar: '#ef4444', badge: 'rgba(239,68,68,.15)',  badgeText: '#ef4444' },
  { dot: '#f97316', bg: 'rgba(249,115,22,.04)', border: 'rgba(249,115,22,.18)', bar: '#f97316', badge: 'rgba(249,115,22,.15)', badgeText: '#f97316' },
]
const LANG_PALETTE: PillColors[] = [
  { dot: '#f59e0b', bg: 'rgba(245,158,11,.04)', border: 'rgba(245,158,11,.18)', bar: '#f59e0b', badge: 'rgba(245,158,11,.15)', badgeText: '#f59e0b' },
  { dot: '#3b82f6', bg: 'rgba(59,130,246,.04)', border: 'rgba(59,130,246,.18)', bar: '#3b82f6', badge: 'rgba(59,130,246,.15)', badgeText: '#3b82f6' },
]
const MUTED_COLOR: PillColors = { dot: '#6b7280', bg: 'rgba(107,114,128,.03)', border: 'rgba(107,114,128,.12)', bar: '#6b7280', badge: 'rgba(107,114,128,.12)', badgeText: '#9ca3af' }

function FreqBar({
  label,
  count,
  max,
  rank = 0,
  palette = ERROR_PALETTE,
}: {
  label:    string
  count:    number
  max:      number
  rank?:    number
  palette?: PillColors[]
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  const c   = palette[rank] ?? MUTED_COLOR

  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2 rounded-md"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="size-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
        <span className="text-[11px] text-slate-200 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-12 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: c.bar }} />
        </div>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
          style={{ background: c.badge, color: c.badgeText }}
        >
          ×{count}
        </span>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export function PatternsPage(): JSX.Element {
  const [entries, setEntries] = useState<VaultMeta[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const data = await window.api.vault.list()
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = computeStats(entries)

  // Top 5 errores y lenguajes ordenados por frecuencia
  const topErrors = Object.entries(stats.errorFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const topLangs = Object.entries(stats.languageFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const maxError = topErrors[0]?.[1] ?? 1
  const maxLang  = topLangs[0]?.[1]  ?? 1

  // Entradas repetidas agrupadas por errorType::language, ordenadas desc
  const repeatedEntries = entries
    .filter((e) => stats.repeatedErrors.includes(e.errorType))
    .reduce<Map<string, { errorType: string; language: string; count: number }>>(
      (acc, e) => {
        const key = `${e.errorType}::${e.language}`
        if (!acc.has(key)) {
          acc.set(key, {
            errorType: e.errorType,
            language:  e.language,
            count:     stats.errorFrequency[e.errorType],
          })
        }
        return acc
      },
      new Map(),
    )

  const repeatedList = [...repeatedEntries.values()].sort((a, b) => b.count - a.count)

  // ── Estados de carga y vacío ─────────────────────────────────────────────────

  // IMPORTANTE: el loading check debe ir ANTES del render principal.
  // Sin él, React renderiza las StatCards con entries=[] (valores 0/null)
  // durante los ~100ms del IPC antes de recibir la respuesta → flash visible.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <RefreshCw size={16} className="animate-spin opacity-40" />
        <span className="text-sm opacity-40">Cargando patrones…</span>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-2xl mx-auto flex flex-col gap-6 p-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-200">Tus patrones de error</h2>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="text-slate-500 hover:text-slate-300">
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Hash}          label="Total entradas"          value={stats.totalEntries} />
        <StatCard icon={Layers}        label="Tipos únicos"            value={stats.uniqueErrors} />
        <StatCard icon={AlertTriangle} label="Error más frecuente"     value={stats.topError}     accent="text-red-400" />
        <StatCard icon={Code2}         label="Lenguaje con más fallos" value={stats.topLanguage}  accent="text-amber-400" />
      </div>

      {/* Frecuencia de errores */}
      {topErrors.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Errores más frecuentes
          </h3>
          <div className="flex flex-col gap-2">
            {topErrors.map(([type, count], i) => (
              <FreqBar key={type} label={type} count={count} max={maxError} rank={i} palette={ERROR_PALETTE} />
            ))}
          </div>
        </section>
      )}

      {/* Frecuencia de lenguajes */}
      {topLangs.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Lenguajes
          </h3>
          <div className="flex flex-col gap-2">
            {topLangs.map(([lang, count], i) => (
              <FreqBar key={lang} label={lang} count={count} max={maxLang} rank={i} palette={LANG_PALETTE} />
            ))}
          </div>
        </section>
      )}

      {/* Errores repetidos */}
      {repeatedList.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Errores recurrentes
          </h3>
          <div className="flex flex-col gap-2">
            {repeatedList.map((item) => {
              const c = item.count >= 4 ? ERROR_PALETTE[0] : item.count >= 2 ? ERROR_PALETTE[1] : MUTED_COLOR
              return (
                <div
                  key={`${item.errorType}::${item.language}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-md"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="size-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
                    <span className="text-[11px] text-slate-200 truncate">{item.errorType}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-medium px-2 py-1 rounded-full leading-none"
                      style={{ background: 'rgba(255,255,255,.06)', color: '#94a3b8' }}
                    >
                      {item.language}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-1 rounded-full leading-none tabular-nums"
                      style={{ background: c.badge, color: c.badgeText }}
                    >
                      ×{item.count}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

    </div>
    </div>
  )
}

export default PatternsPage
