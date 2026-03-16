import type { VaultMeta } from '@/types/api'

export interface Stats {
  totalEntries:      number
  uniqueErrors:      number
  topError:          string | null
  topLanguage:       string | null
  errorFrequency:    Record<string, number>
  languageFrequency: Record<string, number>
  /** Tipos de error que aparecen más de una vez */
  repeatedErrors:    string[]
}

export function computeStats(entries: VaultMeta[]): Stats {
  const errorFreq: Record<string, number> = {}
  const langFreq:  Record<string, number> = {}

  for (const e of entries) {
    errorFreq[e.errorType] = (errorFreq[e.errorType] ?? 0) + 1
    langFreq[e.language]   = (langFreq[e.language]   ?? 0) + 1
  }

  const top = (obj: Record<string, number>): string | null =>
    Object.entries(obj).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

  const repeatedErrors = Object.entries(errorFreq)
    .filter(([, count]) => count > 1)
    .map(([type]) => type)

  return {
    totalEntries:      entries.length,
    uniqueErrors:      Object.keys(errorFreq).length,
    topError:          top(errorFreq),
    topLanguage:       top(langFreq),
    errorFrequency:    errorFreq,
    languageFrequency: langFreq,
    repeatedErrors,
  }
}
