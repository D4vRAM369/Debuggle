import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, Trash2, BookmarkPlus, BookmarkCheck, Loader2, AlertCircle, Cpu,
  MessageSquare, ChevronDown, AlertTriangle, Lightbulb, Tag, Code2, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Level,
  type AnalysisResult,
  detectLanguage,
  analyzeMock,
} from '@/lib/analyze'
import { analyzeWithAI } from '@/lib/ai'
import { type ProviderId, getProvider, DEFAULT_PROVIDER_ID, getDefaultModel, PROVIDERS } from '@/lib/providers'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Chip } from '@/components/ui/Chip'
import { Severity as SeverityBadge } from '@/components/ui/Severity'

const SAMPLE_ERROR = `$ cargo run
error[E0308]: mismatched types
  --> src/main.rs:14:23
   |
14 |     let user_id: u32 = response.id;
   |                  ---   ^^^^^^^^^^^ expected \`u32\`, found \`String\`
   |                  |
   |                  expected due to this`

// ── Segmented nivel ──────────────────────────────────────────────────────────
const LEVELS: { id: Level; label: string }[] = [
  { id: 'novato',  label: 'Novato'  },
  { id: 'medio',   label: 'Medio'   },
  { id: 'experto', label: 'Experto' },
]

function LevelSeg({ value, onChange }: { value: Level; onChange: (l: Level) => void }): JSX.Element {
  return (
    <div className="seg">
      {LEVELS.map((lvl) => (
        <button
          key={lvl.id}
          type="button"
          aria-pressed={value === lvl.id}
          onClick={() => onChange(lvl.id)}
        >
          {lvl.label}
        </button>
      ))}
    </div>
  )
}

// ── Pill selector proveedor + modelo ─────────────────────────────────────────
interface ProviderPickerProps {
  activeProvider: ProviderId
  activeModel:    string
  onChange:       (provider: ProviderId, model: string) => void
}

function ProviderPicker({ activeProvider, activeModel, onChange }: ProviderPickerProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const provider   = getProvider(activeProvider)
  const modelLabel = provider.models.find(m => m.id === activeModel)?.label
                  ?? provider.models[0]?.label
                  ?? provider.name

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '0 12px', height: 30,
          background: 'var(--bg-3)', border: '1px solid var(--border-1)',
          borderRadius: 999, fontSize: 'var(--fs-12)', color: 'var(--text-2)',
          cursor: 'pointer',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--ok)', boxShadow: '0 0 8px var(--ok)',
        }} />
        <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{provider.name}</span>
        <span style={{ color: 'var(--text-4)' }}>·</span>
        <span>{modelLabel}</span>
        <ChevronDown style={{ width: 13, height: 13, color: 'var(--text-3)', transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
          width: 260, background: 'var(--bg-1)', border: '1px solid var(--border-2)',
          borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', overflow: 'hidden',
        }}>
          <div style={{ maxHeight: 288, overflowY: 'auto' }}>
            {PROVIDERS.map((prov) => (
              <div key={prov.id}>
                <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
                  {prov.name}
                </div>
                {prov.models.map((model) => {
                  const isActive = prov.id === activeProvider && model.id === activeModel
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => { onChange(prov.id, model.id); setOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '6px 12px', fontSize: 'var(--fs-12)',
                        background: isActive ? 'var(--accent-soft)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text-2)',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{model.label}</span>
                      <span style={{ marginLeft: 8, flexShrink: 0, fontSize: 10, color: model.free ? 'var(--ok)' : 'var(--warn)' }}>
                        {model.context}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AnalyzePageProps {
  onAskAboutThis: (result: AnalysisResult) => void
  onAnalysisDone?: (result: AnalysisResult) => void
}

// ── Pantalla Analizar ────────────────────────────────────────────────────────
export function AnalyzePage({ onAskAboutThis, onAnalysisDone }: AnalyzePageProps): JSX.Element {
  const [input,        setInput]     = useState('')
  const [level,        setLevel]     = useState<Level>('medio')
  const [isAnalyzing,  setAnalyzing] = useState(false)
  const [result,       setResult]    = useState<AnalysisResult | null>(null)
  const [detectedLang, setLang]      = useState<string | null>(null)
  const [error,        setError]     = useState<string | null>(null)
  const [usedMock,     setUsedMock]  = useState(false)
  const [isSaving,     setIsSaving]  = useState(false)
  const [savedOk,      setSavedOk]   = useState(false)

  const [activeProvider, setActiveProvider] = useState<ProviderId>(DEFAULT_PROVIDER_ID)
  const [activeModel,    setActiveModel]    = useState<string>('')

  useEffect(() => {
    async function loadPrefs(): Promise<void> {
      const [savedProvider, savedModel] = await Promise.all([
        window.api.config.getPref('activeProvider'),
        window.api.config.getPref('activeModel'),
      ])
      if (savedProvider) setActiveProvider(savedProvider as ProviderId)
      if (savedModel)    setActiveModel(savedModel)
    }
    loadPrefs()
  }, [])

  useEffect(() => {
    if (input.trim().length < 10) { setLang(null); return }
    const lang = detectLanguage(input)
    setLang(lang === 'Desconocido' ? null : lang)
  }, [input])

  async function handleAnalyze(overrideLevel?: Level): Promise<void> {
    if (!input.trim()) return
    const currentLevel = overrideLevel ?? level

    setAnalyzing(true)
    setResult(null)
    setError(null)
    setUsedMock(false)

    try {
      const provider   = getProvider(activeProvider)
      const modelToUse = activeModel || getDefaultModel(activeProvider)

      let apiKey: string | null = null
      if (provider.needsKey) {
        apiKey = await window.api.config.getKey(activeProvider)
      }

      if (!provider.needsKey || apiKey) {
        const res = await analyzeWithAI({
          input,
          level:    currentLevel,
          provider: activeProvider,
          model:    modelToUse,
          apiKey:   apiKey ?? undefined,
        })
        setResult(res)
        setUsedMock(false)
        onAnalysisDone?.(res)
      } else {
        const res = await analyzeMock(input, currentLevel)
        setResult(res)
        setUsedMock(true)
        onAnalysisDone?.(res)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al contactar la IA'
      setError(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave(): Promise<void> {
    if (!result || isSaving || usedMock) return
    setIsSaving(true)
    try {
      await window.api.vault.save({
        language:      result.language,
        errorType:     result.errorType,
        severity:      result.severity,
        level,
        input,
        explanation:   result.explanation,
        solution:      result.solution,
        terms:         result.terms,
        correctedCode: result.correctedCode,
      })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } catch (err) {
      console.error('[vault:save] Error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  function handleClear(): void {
    setInput('')
    setResult(null)
    setLang(null)
    setError(null)
    setSavedOk(false)
  }

  function handlePasteExample(): void {
    setInput(SAMPLE_ERROR)
  }

  const chipTone = result ? (result.severity === 'low' ? 'ok' : result.severity === 'medium' ? 'warn' : 'err') : ''
  const contextChip = input.trim().length === 0 ? null : (detectedLang ?? 'entrada')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Zona de entrada ── */}
      <div style={{ padding: '20px 20px 0' }}>

        {/* Header: título + contexto detectado + acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <h1 style={{ margin: 0, fontSize: 'var(--fs-18)', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-1)' }}>Analizar</h1>
          {contextChip && <Chip tone="info" mono>{contextChip}</Chip>}
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={handlePasteExample} style={{ height: 30 }}>
            <FileText style={{ width: 13, height: 13 }} /> Pegar ejemplo
          </button>
          <button className="btn ghost" onClick={handleClear} style={{ height: 30 }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Limpiar
          </button>
        </div>

        {/* Textarea con contador */}
        <div style={{ position: 'relative' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pega aquí tu error, log o snippet de código..."
            style={{
              width: '100%', minHeight: 180, padding: '12px 14px',
              background: 'var(--bg-2)', border: '1px solid var(--border-1)',
              borderRadius: 'var(--radius-3)', color: 'var(--text-1)',
              fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.55,
              resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{
            position: 'absolute', right: 10, bottom: 8,
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-4)',
            pointerEvents: 'none',
          }}>
            {input.length} caracteres
          </div>
        </div>

        {/* Controles: nivel + proveedor + analizar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <span className="eyebrow">Nivel</span>
          <LevelSeg value={level} onChange={setLevel} />
          <div style={{ flex: 1 }} />
          <ProviderPicker
            activeProvider={activeProvider}
            activeModel={activeModel || getDefaultModel(activeProvider)}
            onChange={async (prov, model) => {
              setActiveProvider(prov)
              setActiveModel(model)
              await Promise.all([
                window.api.config.setPref('activeProvider', prov),
                window.api.config.setPref('activeModel', model),
              ])
            }}
          />
          <button
            className="btn primary"
            onClick={() => handleAnalyze()}
            disabled={!input.trim() || isAnalyzing}
            style={{ height: 30 }}
          >
            {isAnalyzing
              ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Analizando...</>
              : <><Sparkles style={{ width: 14, height: 14 }} /> Analizar</>
            }
          </button>
        </div>
      </div>

      {/* ── Zona de resultados ── */}
      <div style={{ flex: 1, minHeight: 0, padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Estado vacío */}
        {!result && !isAnalyzing && !error && (
          <div style={{
            flex: 1, border: '1px dashed var(--border-2)',
            borderRadius: 'var(--radius-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 200,
          }}>
            <div className="empty-state" style={{ gap: 10, padding: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'var(--bg-2)', border: '1px solid var(--border-1)',
                display: 'grid', placeItems: 'center',
              }}>
                <Sparkles style={{ width: 22, height: 22, color: 'var(--text-3)' }} />
              </div>
              <h4 style={{ margin: 0 }}>El análisis aparecerá aquí</h4>
              <p style={{ margin: 0 }}>Pega un error y Debuggle lo desglosa en partes legibles.</p>
            </div>
          </div>
        )}

        {/* Spinner */}
        {isAnalyzing && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-3)' }}>
            <Loader2 style={{ width: 32, height: 32 }} className="animate-spin opacity-60" />
            <p style={{ margin: 0, fontSize: 'var(--fs-13)' }}>Analizando con {getProvider(activeProvider).name}...</p>
          </div>
        )}

        {/* Error */}
        {error && !isAnalyzing && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 }}>
            <AlertCircle style={{ width: 32, height: 32, color: 'var(--err)', opacity: 0.7 }} />
            <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--err)', textAlign: 'center' }}>{error}</p>
            <p style={{ margin: 0, fontSize: 'var(--fs-12)', color: 'var(--text-4)', textAlign: 'center' }}>
              Comprueba tu API key en Config, o prueba con otro proveedor.
            </p>
          </div>
        )}

        {/* Resultado */}
        {result && !isAnalyzing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Chips header + acciones */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Chip tone={chipTone as 'ok' | 'warn' | 'err'} lg>
                {result.errorType.length > 36 ? result.errorType.slice(0, 35) + '…' : result.errorType}
              </Chip>
              <Chip tone="warn">{result.language}</Chip>
              <SeverityBadge severity={result.severity} />
              {usedMock && <Chip>demo</Chip>}
              <div style={{ flex: 1 }} />
              <button
                className="btn ghost"
                onClick={handleSave}
                disabled={isSaving || usedMock || savedOk}
                title={usedMock ? 'No disponible en modo demo' : undefined}
                style={{ height: 30, fontSize: 'var(--fs-12)' }}
              >
                {isSaving
                  ? <><Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> Guardando...</>
                  : savedOk
                    ? <><BookmarkCheck style={{ width: 13, height: 13, color: 'var(--ok)' }} /> Guardado</>
                    : <><BookmarkPlus style={{ width: 13, height: 13 }} /> Guardar en guía</>
                }
              </button>
              <button
                className="btn"
                onClick={() => onAskAboutThis(result)}
                style={{ height: 30, fontSize: 'var(--fs-12)' }}
              >
                <MessageSquare style={{ width: 13, height: 13 }} /> Preguntar
              </button>
            </div>

            {/* Qué pasó + Cómo solucionarlo — 2 columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="card">
                <div className="card-head">
                  <span className="icn icn-anim-pulse" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', border: '1px solid rgba(251,191,36,0.28)' }}>
                    <AlertTriangle style={{ width: 18, height: 18 }} />
                  </span>
                  <h3 style={{ color: 'var(--warn)' }}>Qué pasó</h3>
                </div>
                <div className="card-body"><p>{result.explanation}</p></div>
              </div>

              <div className="card">
                <div className="card-head">
                  <span className="icn icn-anim-glow" style={{ background: 'var(--ok-soft)', color: 'var(--ok)', border: '1px solid rgba(74,222,128,0.28)' }}>
                    <Lightbulb style={{ width: 18, height: 18 }} />
                  </span>
                  <h3 style={{ color: 'var(--ok)' }}>Cómo solucionarlo</h3>
                </div>
                <div className="card-body"><p>{result.solution}</p></div>
              </div>
            </div>

            {/* Términos clave */}
            {result.terms.length > 0 && (
              <div className="card">
                <div className="card-head">
                  <span className="icn icn-anim-bounce" style={{ background: 'var(--info-soft)', color: 'var(--info)', border: '1px solid rgba(96,165,250,0.28)' }}>
                    <Tag style={{ width: 18, height: 18 }} />
                  </span>
                  <h3 style={{ color: 'var(--info)' }}>Términos clave</h3>
                </div>
                <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.terms.map((term) => (
                    <span key={term} className="chip info mono">#{term}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Corrección sugerida */}
            {result.correctedCode && (
              <div className="card">
                <div className="card-head">
                  <span className="icn icn-anim-spark" style={{ background: 'var(--purple-soft)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,0.28)' }}>
                    <Code2 style={{ width: 18, height: 18 }} />
                  </span>
                  <h3 style={{ color: 'var(--purple)' }}>Corrección sugerida</h3>
                </div>
                <div className="card-body">
                  <CodeBlock code={result.correctedCode} language={result.language} />
                </div>
              </div>
            )}

            {/* Error original */}
            <div className="card">
              <div className="card-head">
                <span className="icn" style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border-2)' }}>
                  <FileText style={{ width: 18, height: 18 }} />
                </span>
                <h3>Error original</h3>
              </div>
              <div className="card-body">
                <CodeBlock code={input} language="log" />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
