import type { Severity as AppSeverity } from '@/lib/analyze'

type SevLevel = 'low' | 'mid' | 'high'

function toLevel(s: AppSeverity | null): SevLevel | null {
  if (!s) return null
  if (s === 'low') return 'low'
  if (s === 'medium') return 'mid'
  return 'high'
}

const LABELS: Record<SevLevel, string> = { low: 'BAJO', mid: 'MEDIO', high: 'ALTO' }

interface SeverityProps {
  severity: AppSeverity | null
  dotOnly?: boolean
  label?: string
}

export function Severity({ severity, dotOnly = false, label }: SeverityProps) {
  const level = toLevel(severity)
  const lbl = label ?? (level ? LABELS[level] : '—')
  return (
    <span className={`sev${dotOnly ? ' dot-only' : ''}`} data-level={level ?? 'none'} title={`Severidad: ${lbl}`}>
      <span className="lamp g" />
      <span className="lamp y" />
      <span className="lamp r" />
      {!dotOnly && <span className="lbl">{lbl}</span>}
    </span>
  )
}
