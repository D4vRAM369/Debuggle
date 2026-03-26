import { useState, useEffect, useRef } from 'react'
import { Sparkles, Trash2, BookmarkPlus, BookmarkCheck, Loader2, AlertCircle, Cpu, MessageSquare, ChevronDown } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  type Level,
  type AnalysisResult,
  type Severity,
  detectLanguage,
  analyzeMock,
} from '@/lib/analyze'
import { analyzeWithAI } from '@/lib/ai'
import { type ProviderId, getProvider, DEFAULT_PROVIDER_ID, getDefaultModel, PROVIDERS } from '@/lib/providers'
import { CodeBlock } from '@/components/ui/CodeBlock'

// ── Selector de nivel ────────────────────────────────────────────────────────
const LEVELS: { id: Level; label: string }[] = [
  { id: 'novato',  label: 'Novato'  },
  { id: 'medio',   label: 'Medio'   },
  { id: 'experto', label: 'Experto' },
]

function LevelSelector({
  value,
  onChange,
}: {
  value: Level
  onChange: (l: Level) => void
}): JSX.Element {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted/40">
      {LEVELS.map((lvl) => (
        <button
          key={lvl.id}
          onClick={() => onChange(lvl.id)}
          className={cn(
            'px-3 py-1 rounded text-xs font-medium transition-colors',
            value === lvl.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {lvl.label}
        </button>
      ))}
    </div>
  )
}

// ── Badge de severidad ───────────────────────────────────────────────────────
const SEVERITY_STYLES: Record<Severity, string> = {
  low:      'bg-blue-500/15   text-blue-400   border-blue-500/30',
  medium:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  high:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15    text-red-400    border-red-500/30',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Bajo', medium: 'Medio', high: 'Alto', critical: 'Crítico',
}


// ── Selector de proveedor + modelo ───────────────────────────────────────────
interface ProviderPickerProps {
  activeProvider: ProviderId
  activeModel:    string
  onChange:       (provider: ProviderId, model: string) => void
}

function ProviderPicker({ activeProvider, activeModel, onChange }: ProviderPickerProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Cierra al hacer click fuera
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Cpu className="size-3" />
        <span>{provider.name}</span>
        <span className="text-white/20">·</span>
        <span className="max-w-[80px] truncate opacity-70">{modelLabel}</span>
        <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 w-64 rounded-xl border border-white/10 bg-[rgba(12,14,24,0.97)] shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {PROVIDERS.map((prov) => (
              <div key={prov.id}>
                {/* Cabecera del proveedor */}
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {prov.name}
                </div>
                {/* Modelos del proveedor */}
                {prov.models.map((model) => {
                  const isActive = prov.id === activeProvider && model.id === activeModel
                  return (
                    <button
                      key={model.id}
                      onClick={() => { onChange(prov.id, model.id); setOpen(false) }}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors',
                        isActive
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'
                      )}
                    >
                      <span className="truncate">{model.label}</span>
                      <span className={cn(
                        'ml-2 shrink-0 text-[10px]',
                        model.free ? 'text-emerald-500/70' : 'text-orange-400/60'
                      )}>
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
  /** Callback invocado al pulsar "Preguntar sobre esto" — navega al Chat con contexto */
  onAskAboutThis:  (result: AnalysisResult) => void
  /** Callback invocado cuando hay resultado nuevo — actualiza el semáforo en AppShell */
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

  // Configuración activa (se carga desde prefs al montar)
  const [activeProvider, setActiveProvider] = useState<ProviderId>(DEFAULT_PROVIDER_ID)
  const [activeModel,    setActiveModel]    = useState<string>('')

  // Carga las preferencias guardadas al montar el componente
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

  // Detecta el lenguaje en tiempo real mientras escribes
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

      // Obtener la API key si el proveedor la necesita
      let apiKey: string | null = null
      if (provider.needsKey) {
        apiKey = await window.api.config.getKey(activeProvider)
      }

      if (!provider.needsKey || apiKey) {
        // ✅ IA real — proveedor configurado
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
        // ⚠️ Sin API key → modo demo (mock)
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

  async function handleSwitchLevel(): Promise<void> {
    const next: Level = level === 'novato' ? 'medio' : level === 'medio' ? 'experto' : 'novato'
    setLevel(next)
    if (!input.trim()) return
    await handleAnalyze(next)
  }

  return (
    <div className="flex flex-col h-full p-5 gap-4 overflow-hidden">

      {/* ── Zona de entrada ── */}
      <div className="flex flex-col gap-3">

        {/* Textarea con badge de lenguaje detectado */}
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pega aquí tu error, log o snippet de código..."
            className="min-h-[160px] font-mono text-sm resize-none pr-4 rounded-none"
          />
          {detectedLang && (
            <Badge
              variant="outline"
              className="absolute top-2 right-2 text-xs pointer-events-none"
            >
              {detectedLang}
            </Badge>
          )}
        </div>

        {/* Controles: nivel + selector proveedor + botón analizar */}
        <div className="flex items-center justify-between gap-3">
          <LevelSelector value={level} onChange={setLevel} />
          <div className="flex items-center gap-2">
            {/* Selector de proveedor + modelo */}
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
            {(input || result) && (
              <Button variant="ghost" size="icon" onClick={handleClear} title="Limpiar">
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button
              onClick={() => handleAnalyze()}
              disabled={!input.trim() || isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing
                ? <><Loader2 className="size-4 animate-spin" /> Analizando...</>
                : <><Sparkles className="size-4" /> Analizar</>
              }
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Zona de resultados ── */}
      <div className="flex-1 overflow-auto">

        {/* Estado vacío */}
        {!result && !isAnalyzing && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Sparkles className="size-8 opacity-30" />
            <p className="text-sm">El análisis aparecerá aquí</p>
          </div>
        )}

        {/* Spinner mientras analiza */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="size-8 animate-spin opacity-50" />
            <p className="text-sm">Analizando con {getProvider(activeProvider).name}...</p>
          </div>
        )}

        {/* Error de la llamada a la IA */}
        {error && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground px-8">
            <AlertCircle className="size-8 text-red-400 opacity-70" />
            <p className="text-sm text-center text-red-400/80">{error}</p>
            <p className="text-xs text-center opacity-60">
              Comprueba tu API key en Config, o prueba con otro proveedor.
            </p>
          </div>
        )}

        {/* Resultado */}
        {result && !isAnalyzing && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('border', SEVERITY_STYLES[result.severity])}>
                  {result.errorType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {result.language}
                </Badge>
                <Badge variant="outline" className={cn('text-xs border', SEVERITY_STYLES[result.severity])}>
                  Severidad: {SEVERITY_LABELS[result.severity]}
                </Badge>
                {usedMock && (
                  <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                    modo demo — configura una API key
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  📝 Qué pasó
                </p>
                <p className="text-foreground leading-relaxed">{result.explanation}</p>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  💡 Cómo solucionarlo
                </p>
                <p className="text-foreground leading-relaxed">{result.solution}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  🔑 Términos clave
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.terms.map((term) => (
                    <Badge key={term} variant="secondary" className="text-xs cursor-pointer hover:bg-accent">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>

            {result.correctedCode && (
              <>
                <Separator />
                <div className="px-6 pb-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    🔧 Corrección sugerida
                  </p>
                  <CodeBlock code={result.correctedCode} language={result.language} />
                </div>
              </>
            )}

            <CardFooter className="gap-2 pt-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5 transition-colors',
                  savedOk && 'text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/10'
                )}
                onClick={handleSave}
                disabled={isSaving || usedMock || savedOk}
                title={usedMock ? 'No disponible en modo demo' : undefined}
              >
                {isSaving
                  ? <><Loader2 className="size-3.5 animate-spin" /> Guardando...</>
                  : savedOk
                    ? <><BookmarkCheck className="size-3.5" /> Guardado</>
                    : <><BookmarkPlus className="size-3.5" /> Guardar en Guía</>
                }
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => onAskAboutThis(result)}
              >
                <MessageSquare className="size-3.5" />
                Preguntar sobre esto
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchLevel}
                className="text-xs text-muted-foreground ml-auto"
              >
                🔁 Ver en {level === 'novato' ? 'Medio' : level === 'medio' ? 'Experto' : 'Novato'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
