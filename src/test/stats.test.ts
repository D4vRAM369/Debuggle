import { describe, it, expect } from 'vitest'
import { computeStats } from '../lib/stats'
import type { VaultMeta } from '../types/api'

const make = (errorType: string, language: string, date = '2026-03-16T10:00:00Z'): VaultMeta => ({
  id: Math.random().toString(36).slice(2),
  date,
  language,
  errorType,
  severity: 'medium',
  level: 'medio',
})

const entries: VaultMeta[] = [
  make('NullPointerException', 'Java'),
  make('NullPointerException', 'Java'),
  make('NullPointerException', 'Java'),
  make('CORS Error',           'JavaScript'),
  make('CORS Error',           'JavaScript'),
  make('TypeError',            'TypeScript'),
]

describe('computeStats', () => {
  it('cuenta el total de entradas', () => {
    expect(computeStats(entries).totalEntries).toBe(6)
  })

  it('detecta el error más frecuente', () => {
    expect(computeStats(entries).topError).toBe('NullPointerException')
  })

  it('detecta el lenguaje con más errores', () => {
    expect(computeStats(entries).topLanguage).toBe('Java')
  })

  it('cuenta tipos únicos de error', () => {
    expect(computeStats(entries).uniqueErrors).toBe(3)
  })

  it('devuelve frecuencia de errores', () => {
    const { errorFrequency } = computeStats(entries)
    expect(errorFrequency['NullPointerException']).toBe(3)
    expect(errorFrequency['CORS Error']).toBe(2)
    expect(errorFrequency['TypeError']).toBe(1)
  })

  it('devuelve frecuencia de lenguajes', () => {
    const { languageFrequency } = computeStats(entries)
    expect(languageFrequency['Java']).toBe(3)
    expect(languageFrequency['JavaScript']).toBe(2)
  })

  it('maneja vault vacío sin explotar', () => {
    const s = computeStats([])
    expect(s.totalEntries).toBe(0)
    expect(s.topError).toBeNull()
    expect(s.topLanguage).toBeNull()
    expect(s.uniqueErrors).toBe(0)
  })

  it('marca como repetido cualquier error con frecuencia > 1', () => {
    const { repeatedErrors } = computeStats(entries)
    expect(repeatedErrors).toContain('NullPointerException')
    expect(repeatedErrors).toContain('CORS Error')
    expect(repeatedErrors).not.toContain('TypeError')
  })
})

// ── formatDate i18n ────────────────────────────────────────────────────────────
// Pure-function copy for testing. If this breaks after a VaultPage refactor,
// export formatDate from VaultPage and update the import here.
function formatDate(iso: string, lang: 'es' | 'en' = 'es'): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (lang === 'en') {
    if (mins < 1)  return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days  = Math.floor(hours / 24)
    if (days < 7)  return `${days}d ago`
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  }
  if (mins < 1)  return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days  = Math.floor(hours / 24)
  if (days < 7)  return `hace ${days}d`
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

describe('formatDate', () => {
  it('returns Spanish for lang=es', () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatDate(recent, 'es')).toBe('hace 5 min')
  })

  it('returns English for lang=en', () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatDate(recent, 'en')).toBe('5m ago')
  })

  it('handles just now in English', () => {
    const now = new Date().toISOString()
    expect(formatDate(now, 'en')).toBe('just now')
  })

  it('handles ahora mismo in Spanish', () => {
    const now = new Date().toISOString()
    expect(formatDate(now, 'es')).toBe('ahora mismo')
  })
})
