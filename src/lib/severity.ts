export type SevLevel = 'low' | 'mid' | 'high'

export function getSeverity(errorType: string): SevLevel {
  const t = errorType.toLowerCase()
  if (
    t.includes('fatal') ||
    t.includes('typeerror') ||
    t.includes('referenceerror') ||
    t.includes('nullpointer') ||
    t.includes('segmentation fault') ||
    t.includes('heap limit') ||
    t.includes('out of memory')
  ) return 'high'
  if (
    t.includes('warning') ||
    t.includes('warn') ||
    t.includes('lint') ||
    t.includes('deprecat') ||
    t.includes('notice')
  ) return 'low'
  return 'mid'
}
