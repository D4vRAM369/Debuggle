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
  Loader2, X, AlertTriangle, Lightbulb, Tag, Code2, FileText, Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VaultMeta, VaultEntry } from '@/types/api'
import type { AnalysisResult, Severity } from '@/lib/analyze'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Chip } from '@/components/ui/Chip'
import { Severity as SeverityBadge } from '@/components/ui/Severity'
import type { UILang } from '@/App'

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

const LEVEL_LABELS_ES: Record<string, string> = { novato: 'Novato', medio: 'Medio', experto: 'Experto' }
const LEVEL_LABELS_EN: Record<string, string> = { novato: 'Beginner', medio: 'Medium', experto: 'Expert' }

// ── Props ──────────────────────────────────────────────────────────────────────
interface VaultPageProps {
  lang: UILang
  onAskAboutThis: (result: AnalysisResult) => void
}

// ── Pantalla Guía ─────────────────────────────────────────────────────────────
export function VaultPage({ lang, onAskAboutThis }: VaultPageProps): JSX.Element {
  const [entries,     setEntries]     = useState<VaultMeta[]>([])
  const [selected,    setSelected]    = useState<VaultEntry | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingEntry,setLoadingEntry]= useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [search,      setSearch]      = useState('')
  const LEVEL_LABELS = lang === 'en' ? LEVEL_LABELS_EN : LEVEL_LABELS_ES

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
      lang === 'en'
        ? `Delete "${selected.errorType}"?\nThis action cannot be undone.`
        : `¿Eliminar "${selected.errorType}"?\nEsta acción no se puede deshacer.`
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
      <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-1)', background: 'var(--bg-1)', minHeight: 0, overflow: 'hidden' }}>

        {/* Cabecera de la lista */}
        <div style={{ padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--border-1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen style={{ width: 16, height: 16, color: 'var(--text-2)' }} />
            <span style={{ fontSize: 'var(--fs-14)', fontWeight: 600, color: 'var(--text-1)' }}>{lang === 'en' ? 'My Vault' : 'Mi Guía'}</span>
            <span className="chip" style={{ marginLeft: 'auto' }}>{entries.length}</span>
            <button className="icon-btn" title="Filtrar" style={{ width: 28, height: 28 }}>
              <Filter style={{ width: 13, height: 13 }} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-4)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'en' ? 'Search error or language...' : 'Buscar error o lenguaje...'}
              style={{ width: '100%', height: 32, paddingLeft: 32, paddingRight: search ? 32 : 12, background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-2)', color: 'var(--text-1)', fontSize: 'var(--fs-12)', outline: 'none' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0, display: 'flex' }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de entradas */}
        <div className="flex-1 overflow-auto">
          {loadingList && (
            <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-xs">{lang === 'en' ? 'Loading...' : 'Cargando...'}</span>
            </div>
          )}

          {!loadingList && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-4 text-center">
              <BookOpen className="size-8 opacity-20" />
              <p className="text-xs leading-relaxed opacity-60">
                {lang === 'en' ? 'Save an analysis from Analyze to see it here.' : 'Guarda un análisis desde Analizar para verlo aquí.'}
              </p>
            </div>
          )}

          {!loadingList && entries.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 gap-1 text-muted-foreground px-4 text-center">
              <p className="text-xs opacity-60">{lang === 'en' ? `No results for "${search}"` : `Sin resultados para "${search}"`}</p>
            </div>
          )}

          {filtered.map((entry) => {
            const isActive = selected?.id === entry.id
            const sevColor = entry.severity === 'critical' || entry.severity === 'high' ? 'var(--err)' : entry.severity === 'medium' ? 'var(--warn)' : 'var(--info)'
            return (
              <button
                key={entry.id}
                onClick={() => handleSelect(entry)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', marginBottom: 2,
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--accent-border)' : 'transparent'}`,
                  borderRadius: 'var(--radius-2)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: sevColor, boxShadow: `0 0 6px ${sevColor}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--fs-13)', fontWeight: 500, color: 'var(--text-1)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.errorType}
                  </span>
                  <SeverityBadge severity={entry.severity} dotOnly />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 15, fontSize: 'var(--fs-11)', color: 'var(--text-3)' }}>
                  <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{entry.language}</span>
                  <span>·</span>
                  <span>{LEVEL_LABELS[entry.level]}</span>
                  <span>·</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(entry.date)}</span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Panel derecho: detalle ── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Estado vacío */}
        {!selected && !loadingEntry && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="size-7 opacity-25" />
            </div>
            <p className="text-sm opacity-60">{lang === 'en' ? 'Select an entry to read it' : 'Selecciona una entrada para leerla'}</p>
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
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-1)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Chip tone={selected.severity === 'low' ? 'ok' : selected.severity === 'medium' ? 'warn' : 'err'} lg>
                  {selected.errorType.length > 36 ? selected.errorType.slice(0, 35) + '…' : selected.errorType}
                </Chip>
                <Chip>{selected.language}</Chip>
                <SeverityBadge severity={selected.severity} />
                <Chip>{LEVEL_LABELS[selected.level]}</Chip>
                <div style={{ flex: 1 }} />
                <button className="btn ghost" style={{ height: 28, fontSize: 'var(--fs-12)', gap: 6 }} onClick={() => onAskAboutThis(entryToAnalysisResult(selected))}>
                  <MessageSquare style={{ width: 13, height: 13 }} /> {lang === 'en' ? 'Ask' : 'Preguntar'}
                </button>
                <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={handleDelete} disabled={deleting} title="Eliminar">
                  {deleting ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Trash2 style={{ width: 13, height: 13 }} />}
                </button>
              </div>
              <div style={{ fontSize: 'var(--fs-11)', color: 'var(--text-3)', marginTop: 8 }}>
                {lang === 'en' ? 'Saved' : 'Guardado'} · <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(selected.date)}</span>
              </div>
            </div>

            {/* Cuerpo del detalle — scrollable */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Qué pasó */}
              <div className="card">
                <div className="card-head">
                  <span className="icn icn-anim-pulse" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', border: '1px solid rgba(251,191,36,0.28)' }}>
                    <AlertTriangle style={{ width: 18, height: 18 }} />
                  </span>
                  <h3 style={{ color: 'var(--warn)' }}>{lang === 'en' ? 'What happened' : 'Qué pasó'}</h3>
                </div>
                <div className="card-body"><p>{selected.explanation}</p></div>
              </div>

              {/* Cómo solucionarlo */}
              <div className="card">
                <div className="card-head">
                  <span className="icn icn-anim-glow" style={{ background: 'var(--ok-soft)', color: 'var(--ok)', border: '1px solid rgba(74,222,128,0.28)' }}>
                    <Lightbulb style={{ width: 18, height: 18 }} />
                  </span>
                  <h3 style={{ color: 'var(--ok)' }}>{lang === 'en' ? 'How to fix it' : 'Cómo solucionarlo'}</h3>
                </div>
                <div className="card-body"><p>{selected.solution}</p></div>
              </div>

              {/* Términos clave */}
              {selected.terms.length > 0 && (
                <div className="card">
                  <div className="card-head">
                    <span className="icn icn-anim-bounce" style={{ background: 'var(--info-soft)', color: 'var(--info)', border: '1px solid rgba(96,165,250,0.28)' }}>
                      <Tag style={{ width: 18, height: 18 }} />
                    </span>
                    <h3 style={{ color: 'var(--info)' }}>{lang === 'en' ? 'Key terms' : 'Términos clave'}</h3>
                  </div>
                  <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.terms.map((term) => (
                      <span key={term} className="chip info mono">#{term}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Corrección sugerida */}
              {selected.correctedCode && (
                <div className="card">
                  <div className="card-head">
                    <span className="icn icn-anim-spark" style={{ background: 'var(--purple-soft)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,0.28)' }}>
                      <Code2 style={{ width: 18, height: 18 }} />
                    </span>
                    <h3 style={{ color: 'var(--purple)' }}>{lang === 'en' ? 'Suggested fix' : 'Corrección sugerida'}</h3>
                  </div>
                  <div className="card-body">
                    <CodeBlock code={selected.correctedCode} language={selected.language} />
                  </div>
                </div>
              )}

              {/* Error original */}
              <div className="card">
                <div className="card-head">
                  <span className="icn" style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border-2)' }}>
                    <FileText style={{ width: 18, height: 18 }} />
                  </span>
                <h3>{lang === 'en' ? 'Original error' : 'Error original'}</h3>
                </div>
                <div className="card-body">
                  <CodeBlock code={selected.input} language="log" />
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  )
}
