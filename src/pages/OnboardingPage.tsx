import { useEffect, useState } from 'react'
import { ArrowRight, ArrowLeft, X, ChevronLeft, ChevronRight, Zap, BookOpen, Brain, Layers, Play, RotateCcw } from 'lucide-react'
import type { UILang } from '@/App'
import { analyzeMock, type Level, type AnalysisResult } from '@/lib/analyze'

// ── Types ────────────────────────────────────────────────────────────────────

interface OnboardingPageProps {
  lang: UILang
  onFinish: (skipped: boolean) => void
}

interface SampleError {
  label: string
  labelEn: string
  error: string
}

// ── Sample errors for the interactive demo ───────────────────────────────────

const SAMPLE_ERRORS: SampleError[] = [
  {
    label: 'JavaScript · React',
    labelEn: 'JavaScript · React',
    error: `TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (UserList.tsx:18:21)
    at renderWithHooks (react-dom.development.js:16305:18)
    at mountIndeterminateComponent (react-dom.development.js:20074:13)`,
  },
  {
    label: 'Python',
    labelEn: 'Python',
    error: `Traceback (most recent call last):
  File "app.py", line 42, in process_data
    result = data.transform()
AttributeError: 'NoneType' object has no attribute 'transform'`,
  },
  {
    label: 'Rust',
    labelEn: 'Rust',
    error: `error[E0308]: mismatched types
 --> src/main.rs:12:18
  |
12|     let x: i32 = "hello";
  |            ---   ^^^^^^^ expected \`i32\`, found \`&str\`
  |            |
  |            expected due to this`,
  },
  {
    label: 'Java',
    labelEn: 'Java',
    error: `Exception in thread "main" java.lang.NullPointerException
    at com.example.service.UserService.getUser(UserService.java:34)
    at com.example.controller.UserController.handleRequest(UserController.java:67)
    at java.base/java.lang.Thread.run(Thread.java:834)`,
  },
]

// ── i18n strings ─────────────────────────────────────────────────────────────

const T = {
  es: {
    skip: 'Saltar',
    back: 'Anterior',
    next: 'Siguiente',
    start: 'Empezar a analizar',
    stepOf: (s: number, t: number) => `${s} de ${t}`,
    skipHint: 'Saltar tutorial',

    // Hero
    heroTitle: 'Debuggle',
    heroSubtitle: 'Entiende tus errores. Aprende de ellos. No los repitas.',
    heroBadge: 'Análisis de errores con IA',
    heroStat1: 'Lenguajes detectados',
    heroStat2: 'Niveles de explicación',
    heroStat3: 'Sin datos enviados',

    // Features
    featTitle: '¿Qué hace Debuggle?',
    featSubtitle: 'Tres pasos. Zero fricción.',
    feat1Title: 'Pega el error',
    feat1Body: 'Copia cualquier stack trace o mensaje de error. Debuggle detecta el lenguaje automáticamente.',
    feat2Title: 'Elige tu nivel',
    feat2Body: 'Novato, Medio o Experto. La misma respuesta adaptada a tu experiencia, no una plantilla genérica.',
    feat3Title: 'Guarda y aprende',
    feat3Body: 'Cada análisis va a tu Guía personal. Patrones de errores que repites se detectan automáticamente.',

    // Demo
    demoTitle: 'Pruébalo ahora',
    demoSubtitle: 'Demo en vivo — sin API key, sin configuración',
    demoErrorLabel: 'Error de ejemplo',
    demoLevelLabel: 'Nivel de explicación',
    demoAnalyze: 'Analizar este error',
    demoAnalyzing: 'Analizando…',
    demoAgain: 'Analizar otro',
    demoResultTitle: 'Resultado',
    levelNovato: 'Novato',
    levelMedio: 'Medio',
    levelExperto: 'Experto',
    explanation: 'Explicación',
    solution: 'Solución',
    terms: 'Términos clave',
  },
  en: {
    skip: 'Skip',
    back: 'Back',
    next: 'Next',
    start: 'Start analyzing',
    stepOf: (s: number, t: number) => `${s} of ${t}`,
    skipHint: 'Skip tutorial',

    // Hero
    heroTitle: 'Debuggle',
    heroSubtitle: 'Understand your errors. Learn from them. Never repeat them.',
    heroBadge: 'AI-powered error analysis',
    heroStat1: 'Detected languages',
    heroStat2: 'Explanation levels',
    heroStat3: 'No data sent',

    // Features
    featTitle: 'What does Debuggle do?',
    featSubtitle: 'Three steps. Zero friction.',
    feat1Title: 'Paste the error',
    feat1Body: 'Copy any stack trace or error message. Debuggle auto-detects the language.',
    feat2Title: 'Pick your level',
    feat2Body: 'Novice, Mid or Expert. Same answer adapted to your experience, not a generic template.',
    feat3Title: 'Save and learn',
    feat3Body: 'Every analysis goes to your personal Vault. Repeated error patterns are detected automatically.',

    // Demo
    demoTitle: 'Try it now',
    demoSubtitle: 'Live demo — no API key, no setup',
    demoErrorLabel: 'Sample error',
    demoLevelLabel: 'Explanation level',
    demoAnalyze: 'Analyze this error',
    demoAnalyzing: 'Analyzing…',
    demoAgain: 'Try another',
    demoResultTitle: 'Result',
    levelNovato: 'Novice',
    levelMedio: 'Mid',
    levelExperto: 'Expert',
    explanation: 'Explanation',
    solution: 'Solution',
    terms: 'Key terms',
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BugIcon({ size = 32 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M11 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 16h3M22 16h3M10 11l-3-3M22 11l3-3M10 21l-3 3M22 21l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="13" cy="17" r="1.2" fill="currentColor" />
      <circle cx="19" cy="17" r="1.2" fill="currentColor" />
    </svg>
  )
}

function HeroStep({ lang }: { lang: UILang }): JSX.Element {
  const t = T[lang]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 28, padding: '32px 24px' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%, var(--accent-soft) 0%, transparent 70%)',
          border: '2px solid var(--accent-border)',
          display: 'grid', placeItems: 'center',
          color: 'var(--accent)',
          boxShadow: '0 0 32px var(--accent-soft)',
          animation: 'pulse-glow 3s ease-in-out infinite',
        }}>
          <BugIcon size={44} />
        </div>
        <div style={{
          position: 'absolute', inset: -12, borderRadius: '50%',
          border: '1px solid var(--accent-border)', opacity: 0.4,
          animation: 'spin-slow 12s linear infinite',
        }} />
      </div>

      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 999,
          background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
          color: 'var(--accent)', fontSize: 'var(--fs-11)', fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 14,
        }}>
          <Zap size={10} /> {t.heroBadge}
        </span>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {t.heroTitle}
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 'var(--fs-16)', color: 'var(--text-2)', maxWidth: 440, lineHeight: 1.6 }}>
          {t.heroSubtitle}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { n: '10+', label: t.heroStat1 },
          { n: '3',   label: t.heroStat2 },
          { n: '100%', label: t.heroStat3 },
        ].map(({ n, label }) => (
          <div key={label} style={{
            padding: '10px 20px', borderRadius: 12,
            background: 'var(--bg-3)', border: '1px solid var(--border-1)',
            textAlign: 'center', minWidth: 100,
          }}>
            <div style={{ fontSize: 'var(--fs-22)', fontWeight: 800, color: 'var(--accent)' }}>{n}</div>
            <div style={{ fontSize: 'var(--fs-11)', color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeaturesStep({ lang }: { lang: UILang }): JSX.Element {
  const t = T[lang]
  const features = [
    { icon: <Layers size={20} />, title: t.feat1Title, body: t.feat1Body },
    { icon: <Brain size={20} />,  title: t.feat2Title, body: t.feat2Body },
    { icon: <BookOpen size={20} />, title: t.feat3Title, body: t.feat3Body },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '28px 24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--fs-22)', fontWeight: 800, color: 'var(--text-1)' }}>{t.featTitle}</h2>
        <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 'var(--fs-13)' }}>{t.featSubtitle}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {features.map(({ icon, title, body }, i) => (
          <div key={i} style={{
            padding: 16, borderRadius: 14,
            background: 'var(--bg-3)', border: '1px solid var(--border-1)',
            display: 'flex', flexDirection: 'column', gap: 10,
            transition: 'border-color .2s',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
              color: 'var(--accent)', display: 'grid', placeItems: 'center',
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--fs-14)', color: 'var(--text-1)', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-3)', lineHeight: 1.6 }}>{body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoStep({
  lang, errorIdx, onPrevError, onNextError,
  level, onLevelChange,
  demoState, demoResult,
  onAnalyze, onReset,
}: {
  lang: UILang
  errorIdx: number
  onPrevError: () => void
  onNextError: () => void
  level: Level
  onLevelChange: (l: Level) => void
  demoState: 'idle' | 'analyzing' | 'done'
  demoResult: AnalysisResult | null
  onAnalyze: () => void
  onReset: () => void
}): JSX.Element {
  const t = T[lang]
  const sample = SAMPLE_ERRORS[errorIdx]
  const levels: { id: Level; label: string }[] = [
    { id: 'novato',  label: t.levelNovato },
    { id: 'medio',   label: t.levelMedio },
    { id: 'experto', label: t.levelExperto },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 24px 20px' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--fs-20)', fontWeight: 800, color: 'var(--text-1)' }}>{t.demoTitle}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--fs-12)', color: 'var(--text-3)' }}>{t.demoSubtitle}</p>
      </div>

      {demoState !== 'done' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Error carousel */}
          <div style={{ border: '1px solid var(--border-1)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-3)' }}>
              <button
                className="icon-btn"
                onClick={onPrevError}
                disabled={demoState === 'analyzing'}
                style={{ width: 24, height: 24 }}
                aria-label="previous error"
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 'var(--fs-12)', fontWeight: 600, color: 'var(--text-2)' }}>
                {lang === 'es' ? sample.label : sample.labelEn}
                <span style={{ color: 'var(--text-4)', marginLeft: 8, fontWeight: 400 }}>
                  {errorIdx + 1}/{SAMPLE_ERRORS.length}
                </span>
              </span>
              <button
                className="icon-btn"
                onClick={onNextError}
                disabled={demoState === 'analyzing'}
                style={{ width: 24, height: 24 }}
                aria-label="next error"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <pre style={{
              margin: 0, padding: '10px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-2)', whiteSpace: 'pre-wrap',
              lineHeight: 1.7, maxHeight: 110, overflow: 'auto',
            }}>
              {sample.error}
            </pre>
          </div>

          {/* Level selector */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-3)', flexShrink: 0 }}>{t.demoLevelLabel}:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {levels.map(({ id, label }) => (
                <button
                  key={id}
                  className={`btn ghost${level === id ? ' active' : ''}`}
                  style={{
                    padding: '3px 10px', fontSize: 'var(--fs-12)',
                    background: level === id ? 'var(--accent-soft)' : undefined,
                    borderColor: level === id ? 'var(--accent-border)' : undefined,
                    color: level === id ? 'var(--accent)' : undefined,
                  }}
                  onClick={() => onLevelChange(id)}
                  disabled={demoState === 'analyzing'}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn primary"
            onClick={onAnalyze}
            disabled={demoState === 'analyzing'}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {demoState === 'analyzing' ? (
              <>
                <span style={{ width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                {t.demoAnalyzing}
              </>
            ) : (
              <><Play size={13} /> {t.demoAnalyze}</>
            )}
          </button>
        </div>
      ) : (
        /* Result */
        demoResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 6,
                  background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
                  color: 'var(--accent)', fontSize: 'var(--fs-11)', fontWeight: 700,
                }}>
                  {demoResult.language}
                </span>
                <span style={{ fontSize: 'var(--fs-12)', fontWeight: 600, color: 'var(--text-1)' }}>{demoResult.errorType}</span>
              </div>
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={onReset} title={t.demoAgain}>
                <RotateCcw size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 'var(--fs-11)', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{t.explanation}</div>
                <p style={{ margin: 0, fontSize: 'var(--fs-12)', color: 'var(--text-2)', lineHeight: 1.65 }}>{demoResult.explanation}</p>
              </div>

              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 'var(--fs-11)', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{t.solution}</div>
                <p style={{ margin: 0, fontSize: 'var(--fs-12)', color: 'var(--text-2)', lineHeight: 1.65 }}>{demoResult.solution}</p>
              </div>

              {demoResult.terms.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {demoResult.terms.map((term) => (
                    <span key={term} style={{
                      padding: '2px 8px', borderRadius: 6,
                      background: 'var(--bg-3)', border: '1px solid var(--border-1)',
                      fontSize: 'var(--fs-11)', color: 'var(--text-3)',
                    }}>
                      {term}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function OnboardingPage({ lang, onFinish }: OnboardingPageProps): JSX.Element {
  const t = T[lang]
  const TOTAL_STEPS = 3

  const [step, setStep]               = useState(0)
  const [errorIdx, setErrorIdx]       = useState(0)
  const [level, setLevel]             = useState<Level>('medio')
  const [demoState, setDemoState]     = useState<'idle' | 'analyzing' | 'done'>('idle')
  const [demoResult, setDemoResult]   = useState<AnalysisResult | null>(null)

  // Reset demo when error or level changes
  useEffect(() => {
    setDemoState('idle')
    setDemoResult(null)
  }, [errorIdx, level])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onFinish(true)
      if (e.key === 'ArrowRight' && step < TOTAL_STEPS - 1) setStep((s) => s + 1)
      if (e.key === 'ArrowLeft'  && step > 0)               setStep((s) => s - 1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onFinish, step])

  async function handleAnalyze(): Promise<void> {
    setDemoState('analyzing')
    try {
      const result = await analyzeMock(SAMPLE_ERRORS[errorIdx].error, level)
      setDemoResult(result)
      setDemoState('done')
    } catch {
      setDemoState('idle')
    }
  }

  function handlePrevError(): void {
    setErrorIdx((i) => (i - 1 + SAMPLE_ERRORS.length) % SAMPLE_ERRORS.length)
  }

  function handleNextError(): void {
    setErrorIdx((i) => (i + 1) % SAMPLE_ERRORS.length)
  }

  const isLast = step === TOTAL_STEPS - 1

  return (
    <>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 24px var(--accent-soft); }
          50%       { box-shadow: 0 0 48px var(--accent-soft), 0 0 80px var(--accent-soft); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--bg-1)' }}>
        <section style={{
          width: 'min(700px, 100%)',
          background: 'var(--bg-2)',
          border: '1px solid var(--border-1)',
          borderRadius: 18, overflow: 'hidden',
          animation: 'fade-in-up .25s ease',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Header */}
          <header style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderBottom: '1px solid var(--border-1)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
              color: 'var(--accent)', display: 'grid', placeItems: 'center',
            }}>
              <BugIcon size={14} />
            </div>
            <strong style={{ fontSize: 'var(--fs-13)', color: 'var(--text-1)' }}>Debuggle</strong>
            <span style={{ fontSize: 'var(--fs-11)', color: 'var(--text-4)' }}>
              {t.stepOf(step + 1, TOTAL_STEPS)}
            </span>
            <div style={{ flex: 1 }} />
            <button
              className="icon-btn"
              style={{ width: 26, height: 26 }}
              onClick={() => onFinish(true)}
              title={t.skipHint}
            >
              <X size={12} />
            </button>
          </header>

          {/* Step content */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {step === 0 && <HeroStep lang={lang} />}
            {step === 1 && <FeaturesStep lang={lang} />}
            {step === 2 && (
              <DemoStep
                lang={lang}
                errorIdx={errorIdx}
                onPrevError={handlePrevError}
                onNextError={handleNextError}
                level={level}
                onLevelChange={setLevel}
                demoState={demoState}
                demoResult={demoResult}
                onAnalyze={handleAnalyze}
                onReset={() => { setDemoState('idle'); setDemoResult(null) }}
              />
            )}
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '4px 0' }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 24 : 7, height: 7,
                  borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: i === step ? 'var(--accent)' : 'var(--border-2)',
                  padding: 0, transition: 'all .2s',
                }}
                aria-label={`step ${i + 1}`}
              />
            ))}
          </div>

          {/* Footer */}
          <footer style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px', borderTop: '1px solid var(--border-1)',
          }}>
            <button className="btn ghost" style={{ fontSize: 'var(--fs-12)' }} onClick={() => onFinish(true)}>
              {t.skip}
            </button>
            <div style={{ flex: 1 }} />
            <button
              className="btn ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft size={13} /> {t.back}
            </button>
            {isLast ? (
              <button
                className="btn primary"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => onFinish(false)}
              >
                {t.start} <ArrowRight size={13} />
              </button>
            ) : (
              <button
                className="btn primary"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setStep((s) => s + 1)}
              >
                {t.next} <ArrowRight size={13} />
              </button>
            )}
          </footer>
        </section>
      </div>
    </>
  )
}
