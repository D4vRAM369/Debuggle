import type { ReactNode } from 'react'

type ChipTone = 'err' | 'warn' | 'ok' | 'info' | 'purple' | ''

interface ChipProps {
  children: ReactNode
  tone?: ChipTone
  mono?: boolean
  lg?: boolean
  className?: string
}

export function Chip({ children, tone = '', mono = false, lg = false, className = '' }: ChipProps) {
  const cls = ['chip', tone, mono && 'mono', lg && 'lg', className].filter(Boolean).join(' ')
  return <span className={cls}>{children}</span>
}
