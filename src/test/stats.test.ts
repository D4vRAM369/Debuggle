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
