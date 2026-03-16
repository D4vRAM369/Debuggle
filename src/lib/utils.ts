import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn (classNames) — fusiona clases Tailwind de forma segura.
 *
 * Problema que resuelve:
 *   Si tienes "p-4" y luego quieres sobreescribir con "p-2",
 *   CSS no sabe cuál gana. twMerge lo resuelve: siempre gana la última.
 *
 * Ejemplo:
 *   cn("p-4 text-white", isError && "text-red-500")
 *   → "p-4 text-red-500"  (text-white fue reemplazado correctamente)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
