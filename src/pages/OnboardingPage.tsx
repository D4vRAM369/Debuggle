import { useEffect, useState } from 'react'
import { Sparkles, Compass, PlayCircle, BookOpen, ArrowRight, ArrowLeft, X, type LucideIcon } from 'lucide-react'
import type { UILang } from '@/App'

interface OnboardingPageProps {
  lang: UILang
  onFinish: (skipped: boolean) => void
}

interface StepDef {
  icon: LucideIcon
  title: Record<UILang, string>
  body: Record<UILang, string>
}

const STEPS: StepDef[] = [
  {
    icon: Sparkles,
    title: { es: 'Bienvenido a Debuggle', en: 'Welcome to Debuggle' },
    body: {
      es: 'Tu asistente para entender errores de programación con claridad y guardar aprendizajes reutilizables.',
      en: 'Your assistant to understand programming errors clearly and save reusable learnings.',
    },
  },
  {
    icon: Compass,
    title: { es: 'Cómo funciona', en: 'How it works' },
    body: {
      es: '1) Pega un error. 2) Obtén explicación + solución por nivel. 3) Guarda la entrada en tu Guía para no repetirlo.',
      en: '1) Paste an error. 2) Get explanation + fix by level. 3) Save the entry to your Vault to avoid repeating it.',
    },
  },
  {
    icon: PlayCircle,
    title: { es: 'Prueba rápida', en: 'Quick trial' },
    body: {
      es: 'Haz una prueba con un error real y mira cómo se ve el flujo de análisis antes de configurar todo.',
      en: 'Try a real error and preview the analysis flow before configuring everything.',
    },
  },
  {
    icon: BookOpen,
    title: { es: 'Primer objetivo', en: 'First milestone' },
    body: {
      es: 'Analiza un error y guarda el resultado. Ese será tu primer bloque de conocimiento en Debuggle.',
      en: 'Analyze one error and save the result. That becomes your first knowledge block in Debuggle.',
    },
  },
]

const SAMPLE_ERROR = `TypeError: Cannot read properties of undefined (reading 'map')
at UserList (UserList.tsx:18:21)
at renderWithHooks (react-dom.development.js:16305:18)`

export function OnboardingPage({ lang, onFinish }: OnboardingPageProps): JSX.Element {
  const [step, setStep] = useState(0)
  const [showDemo, setShowDemo] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onFinish(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onFinish])

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-1)' }}>
      <section style={{ width: 'min(760px, 100%)', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 16, overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border-1)' }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
            <Icon size={14} />
          </span>
          <strong style={{ fontSize: 'var(--fs-14)', color: 'var(--text-1)' }}>Debuggle</strong>
          <span style={{ color: 'var(--text-4)', fontSize: 'var(--fs-12)' }}>
            {lang === 'es' ? `Paso ${step + 1} de ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`}
          </span>
          <div style={{ flex: 1 }} />
          <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => onFinish(true)} title={lang === 'es' ? 'Saltar onboarding' : 'Skip onboarding'}>
            <X size={13} />
          </button>
        </header>

        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-22)', color: 'var(--text-1)' }}>{current.title[lang]}</h2>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>{current.body[lang]}</p>

          {step === 2 && (
            <div className="card" style={{ marginTop: 4 }}>
              <div className="card-head">
                <h3 style={{ margin: 0, color: 'var(--text-1)' }}>{lang === 'es' ? 'Error de ejemplo' : 'Sample error'}</h3>
              </div>
              <div className="card-body" style={{ display: 'grid', gap: 10 }}>
                <pre style={{ margin: 0, padding: 10, fontFamily: 'var(--font-mono)', fontSize: 12, borderRadius: 10, background: 'var(--bg-1)', border: '1px solid var(--border-1)', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{SAMPLE_ERROR}</pre>
                <button className="btn ghost" style={{ width: 'fit-content' }} onClick={() => setShowDemo((v) => !v)}>
                  {showDemo
                    ? (lang === 'es' ? 'Ocultar vista previa' : 'Hide preview')
                    : (lang === 'es' ? 'Ver vista previa de análisis' : 'Preview analysis')
                  }
                </button>
                {showDemo && (
                  <div style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--text-1)', borderRadius: 10, padding: 10, fontSize: 'var(--fs-12)' }}>
                    {lang === 'es'
                      ? 'Vista previa: Debuggle explicará por qué falló el `.map`, cómo validarlo antes de usarlo, y te sugerirá el patrón seguro.'
                      : 'Preview: Debuggle explains why `.map` failed, how to guard it first, and suggests the safe pattern.'}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {STEPS.map((_, i) => (
              <span key={i} style={{ width: i === step ? 28 : 8, height: 8, borderRadius: 999, background: i === step ? 'var(--accent)' : 'var(--border-2)', transition: 'all .16s' }} />
            ))}
          </div>
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--border-1)' }}>
          <button className="btn ghost" onClick={() => onFinish(true)}>
            {lang === 'es' ? 'Saltar' : 'Skip'}
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft size={14} /> {lang === 'es' ? 'Anterior' : 'Back'}
          </button>
          {isLast ? (
            <button className="btn primary" onClick={() => onFinish(false)}>
              {lang === 'es' ? 'Ir a Analizar' : 'Start analyzing'} <ArrowRight size={14} />
            </button>
          ) : (
            <button className="btn primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              {lang === 'es' ? 'Siguiente' : 'Next'} <ArrowRight size={14} />
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}
