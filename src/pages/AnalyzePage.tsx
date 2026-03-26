import { useState, useEffect } from 'react'
import {
  Sparkles,
  Trash2,
  BookmarkPlus,
  BookmarkCheck,
  Loader2,
  AlertCircle,
  Cpu,
  MessageSquare,
  WandSparkles,
  Code2,
} from 'lucide-react'
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
import { type ProviderId, getProvider, DEFAULT_PROVIDER_ID, getDefaultModel } from '@/lib/providers'
import { CodeBlock } from '@/components/ui/CodeBlock'

const LEVELS: { id: Level; label: string }[] = [
  { id: 'novato', label: 'Novato' },
  { id: 'medio', label: 'Medio' },
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
    <div className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {LEVELS.map((lvl) => (
        <button
          key={lvl.id}
          onClick={() => onChange(lvl.id)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
            value === lvl.id
              ? 'bg-[linear-gradient(135deg,#7292ff,#5b7cfa)] text-white shadow-[0_10px_30px_rgba(91,124,250,0.35)]'
              : 'text-muted-foreground hover:text-white'
          )}
        >
          {lvl.label}
        </button>
      ))}
    </div>
  )
}

const SEVERITY_STYLES: Record<Severity, string> = {
  low: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  medium: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  high: 'border-orange-400/20 bg-orange-400/10 text-orange-200',
  critical: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  critical: 'Crítico',
}

interface AnalyzePageProps {
  onAskAboutThis: (result: AnalysisResult) => void
}

export function AnalyzePage({ onAskAboutThis }: AnalyzePageProps): JSX.Element {
  const [input, setInput] = useState('')
  const [level, setLevel] = useState<Level>('medio')
  const [isAnalyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [detectedLang, setLang] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usedMock, setUsedMock] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [activeProvider, setActiveProvider] = useState<ProviderId>(DEFAULT_PROVIDER_ID)
  const [activeModel, setActiveModel] = useState<string>('')

  useEffect(() => {
    async function loadPrefs(): Promise<void> {
      const [savedProvider, savedModel] = await Promise.all([
        window.api.config.getPref('activeProvider'),
        window.api.config.getPref('activeModel'),
      ])
      if (savedProvider) setActiveProvider(savedProvider as ProviderId)
      if (savedModel) setActiveModel(savedModel)
    }
    loadPrefs()
  }, [])

  useEffect(() => {
    if (input.trim().length < 10) {
      setLang(null)
      return
    }
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
      const provider = getProvider(activeProvider)
      const modelToUse = activeModel || getDefaultModel(activeProvider)

      let apiKey: string | null = null
      if (provider.needsKey) {
        apiKey = await window.api.config.getKey(activeProvider)
      }

      if (!provider.needsKey || apiKey) {
        const res = await analyzeWithAI({
          input,
          level: currentLevel,
          provider: activeProvider,
          model: modelToUse,
          apiKey: apiKey ?? undefined,
        })
        setResult(res)
        setUsedMock(false)
      } else {
        const res = await analyzeMock(input, currentLevel)
        setResult(res)
        setUsedMock(true)
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
        language: result.language,
        errorType: result.errorType,
        severity: result.severity,
        level,
        input,
        explanation: result.explanation,
        solution: result.solution,
        terms: result.terms,
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

  const providerName = getProvider(activeProvider).name

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-5">
      <div className="rounded-[26px] border border-white/7 bg-[linear-gradient(180deg,rgba(25,29,48,0.92),rgba(15,17,28,0.92))] shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"TypeError: Cannot read properties of undefined (reading 'map')\nat AnalyzePage (App.tsx:42:28)\no pega aquí tu error, log o snippet de código..."}
              className="min-h-[132px] rounded-[18px] border-white/7 bg-[rgba(8,10,18,0.7)] px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-slate-500 focus-visible:border-primary/70 focus-visible:ring-[3px] focus-visible:ring-primary/20"
            />
            {detectedLang && (
              <Badge
                variant="outline"
                className="pointer-events-none absolute right-3 top-3 rounded-full border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-100"
              >
                {detectedLang}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LevelSelector value={level} onChange={setLevel} />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/7 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground">
                <Cpu className="size-3" />
                {providerName}
              </span>
              {(input || result) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClear}
                  title="Limpiar"
                  className="rounded-full border border-white/7 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
              <Button
                onClick={() => handleAnalyze()}
                disabled={!input.trim() || isAnalyzing}
                size="lg"
                className="rounded-full border border-primary/40 bg-[linear-gradient(135deg,#7ea2ff,#5b7cfa)] px-6 text-white shadow-[0_18px_45px_rgba(91,124,250,0.35)] hover:brightness-110"
              >
                {isAnalyzing
                  ? <><Loader2 className="size-4 animate-spin" /> Analizando...</>
                  : <><WandSparkles className="size-4" /> Analizar</>
                }
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[26px] border border-white/7 bg-[linear-gradient(180deg,rgba(12,14,24,0.92),rgba(9,10,18,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {!result && !isAnalyzing && !error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-full border border-white/8 bg-white/[0.03]">
              <Sparkles className="size-6 opacity-40" />
            </div>
            <p className="text-sm">El análisis aparecerá aquí</p>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin opacity-50" />
            <p className="text-sm">Analizando con {providerName}...</p>
          </div>
        )}

        {error && !isAnalyzing && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-muted-foreground">
            <AlertCircle className="size-8 text-red-400 opacity-70" />
            <p className="text-center text-sm text-red-400/80">{error}</p>
            <p className="text-center text-xs opacity-60">
              Comprueba tu API key en Config, o prueba con otro proveedor.
            </p>
          </div>
        )}

        {result && !isAnalyzing && (
          <Card className="gap-0 overflow-hidden rounded-[22px] border-white/8 bg-[linear-gradient(180deg,rgba(28,31,47,0.92),rgba(20,22,34,0.94))] py-0 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
            <CardHeader className="border-b border-white/6 pb-4 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]', SEVERITY_STYLES[result.severity])}>
                  {result.errorType}
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-200">
                  {result.language}
                </Badge>
                <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 text-[11px]', SEVERITY_STYLES[result.severity])}>
                  Severidad: {SEVERITY_LABELS[result.severity]}
                </Badge>
                {usedMock && (
                  <Badge variant="outline" className="rounded-full border-dashed border-white/12 bg-white/[0.02] px-2.5 py-1 text-[11px] text-muted-foreground">
                    modo demo - configura una API key
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-5 py-5 text-sm">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-200">
                    <AlertCircle className="size-4" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Qué pasó
                  </p>
                </div>
                <p className="leading-relaxed text-slate-100">{result.explanation}</p>
              </div>

              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Cómo solucionarlo
                  </p>
                </div>
                <p className="leading-relaxed text-slate-100">{result.solution}</p>
              </div>

              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Términos clave
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.terms.map((term) => (
                    <Badge key={term} variant="secondary" className="cursor-pointer rounded-full border border-white/7 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-200 hover:bg-white/[0.08]">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>

            {result.correctedCode && (
              <>
                <Separator className="bg-white/6" />
                <div className="space-y-3 px-5 pb-5 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-200">
                      <Code2 className="size-4" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Corrección sugerida
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fragmento listo para probar o adaptar.
                  </p>
                  <CodeBlock code={result.correctedCode} language={result.language} />
                </div>
              </>
            )}

            <CardFooter className="flex-wrap gap-2 border-t border-white/6 px-5 py-4">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5 rounded-full border-white/8 bg-white/[0.03] text-slate-100 transition-colors hover:bg-white/[0.06]',
                  savedOk && 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
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
                className="gap-1.5 rounded-full border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                onClick={() => onAskAboutThis(result)}
              >
                <MessageSquare className="size-3.5" />
                Preguntar sobre esto
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchLevel}
                className="ml-auto rounded-full text-xs text-muted-foreground hover:bg-white/[0.04] hover:text-white"
              >
                Ver en {level === 'novato' ? 'Medio' : level === 'medio' ? 'Experto' : 'Novato'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
