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
import { cn } from '@/lib/utils'
import { computeStats } from '@/lib/stats'
import type { VaultMeta } from '@/types/api'

// ── Subcomponentes ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number | null
  sub?: string
  color?: string
}) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-3)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={14} style={{ color: 'var(--text-3)' }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 'var(--fs-22)', fontWeight: 600, color: color ?? 'var(--text-1)', letterSpacing: '-0.015em', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-3)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
    </div>
  )
}

const ERR_COLORS  = ['var(--err)', 'var(--warn)', 'var(--info)', 'var(--info)', 'var(--info)']
const LANG_COLORS = ['var(--warn)', 'var(--info)', '#a78bfa', 'var(--info)', 'var(--info)']

function FreqBar({
  label,
  count,
  max,
  color,
  bold = false,
}: {
  label:  string
  count:  number
  max:    number
  color:  string
  bold?:  boolean
}) {
  const pct = Math.max(6, (count / max) * 100)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 120px 40px',
      alignItems: 'center', gap: 14,
      padding: '10px 14px',
      borderTop: '1px solid var(--border-1)',
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 'var(--fs-13)', color: 'var(--text-1)',
        fontWeight: bold ? 500 : 400,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
        {label}
      </span>
      <span style={{
        height: 6, borderRadius: 999, background: 'var(--bg-3)',
        overflow: 'hidden', position: 'relative',
      }}>
        <span style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, background: color,
          boxShadow: `0 0 12px ${color}40`,
        }} />
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)', color, fontWeight: 600, textAlign: 'right' }}>×{count}</span>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export function PatternsPage(): JSX.Element {
  const [entries, setEntries] = useState<VaultMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d')

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

  const now = Date.now()
  const filteredEntries = entries.filter((entry) => {
    if (range === 'all') return true
    const ageMs = now - new Date(entry.date).getTime()
    const maxDays = range === '7d' ? 7 : 30
    return ageMs <= maxDays * 24 * 60 * 60 * 1000
  })

  const stats = computeStats(filteredEntries)

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
  const repeatedEntries = filteredEntries
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
    <div style={{ height: '100%', overflowY: 'auto' }}>
    <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1024, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--fs-22)', fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text-1)' }}>Patrones</h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--fs-13)', color: 'var(--text-3)' }}>Resumen de tus errores analizados</p>
        </div>
        <div style={{ flex: 1 }} />
        <div className="seg" style={{ marginLeft: 'auto' }}>
          <button type="button" aria-pressed={range === '7d'} onClick={() => setRange('7d')}>7d</button>
          <button type="button" aria-pressed={range === '30d'} onClick={() => setRange('30d')}>30d</button>
          <button type="button" aria-pressed={range === 'all'} onClick={() => setRange('all')}>All</button>
        </div>
        <button className="icon-btn" onClick={load} disabled={loading} title="Recargar">
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} style={{ color: 'var(--text-3)' }} />
        </button>
      </div>

      {/* Tarjetas resumen — 4 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        <StatCard icon={Hash}          label="Total entradas"          value={stats.totalEntries} />
        <StatCard icon={Layers}        label="Tipos únicos"            value={stats.uniqueErrors} />
        <StatCard icon={AlertTriangle} label="Error más frecuente"     value={stats.topError?.split(':')[0] ?? null} sub={stats.topError ?? undefined} color="var(--err)" />
        <StatCard icon={Code2}         label="Lenguaje con más fallos" value={stats.topLanguage}  color="var(--warn)" />
      </div>

      {/* Frecuencia de errores */}
      {topErrors.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="eyebrow">Errores más frecuentes</div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-3)', overflow: 'hidden' }}>
            {topErrors.map(([type, count], i) => (
              <FreqBar key={type} label={type} count={count} max={maxError} color={ERR_COLORS[i] ?? 'var(--info)'} />
            ))}
          </div>
        </section>
      )}

      {/* Frecuencia de lenguajes */}
      {topLangs.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="eyebrow">Lenguajes</div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-3)', overflow: 'hidden' }}>
            {topLangs.map(([lang, count], i) => (
              <FreqBar key={lang} label={lang} count={count} max={maxLang} color={LANG_COLORS[i] ?? 'var(--info)'} bold />
            ))}
          </div>
        </section>
      )}

      {/* Errores repetidos */}
      {repeatedList.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="eyebrow">Errores recurrentes</div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-3)', overflow: 'hidden' }}>
            {repeatedList.map((item, i) => {
              const c = item.count >= 4 ? 'var(--err)' : item.count >= 2 ? 'var(--warn)' : 'var(--info)'
              return (
                <div key={`${item.errorType}::${item.language}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-1)',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.errorType}</span>
                  <span className="chip">{item.language}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)', color: c, fontWeight: 600, flexShrink: 0 }}>×{item.count}</span>
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
