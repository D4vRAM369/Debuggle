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

function FreqBar({
  label,
  count,
  max,
  color = 'bg-primary',
}: {
  label: string
  count: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 truncate text-sm text-slate-300 shrink-0" title={label}>
        {label}
      </span>
      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-5 text-right">{count}</span>
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

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <BarChart2 size={36} className="opacity-40" />
        <p className="text-sm">Aún no hay entradas en tu Guía.</p>
        <p className="text-xs text-slate-600">
          Analiza errores y guárdalos — aquí verás tus patrones.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 p-2">

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
            {topErrors.map(([type, count]) => (
              <FreqBar key={type} label={type} count={count} max={maxError} color="bg-red-500/70" />
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
            {topLangs.map(([lang, count]) => (
              <FreqBar key={lang} label={lang} count={count} max={maxLang} color="bg-amber-500/70" />
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
            {repeatedList.map((item) => (
              <div
                key={`${item.errorType}::${item.language}`}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              >
                <span className="text-sm text-slate-200 truncate mr-3">{item.errorType}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">{item.language}</Badge>
                  <Badge variant="destructive" className="text-xs">×{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}

export default PatternsPage
