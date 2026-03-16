/**
 * Tipos compartidos del puente IPC entre Electron y React.
 *
 * Este archivo declara la forma de `window.api` para que TypeScript
 * en el renderer sepa exactamente qué puede llamar y qué tipos esperar.
 *
 * La implementación real está en:
 *   electron/preload.ts  — expone las funciones via contextBridge
 *   electron/main.ts     — registra los handlers en el proceso main
 */

// ── Tipos de dominio ─────────────────────────────────────────────────────────

export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type Level    = 'novato' | 'medio' | 'experto'

/** Datos que el renderer envía para guardar una entrada nueva */
export interface VaultEntryInput {
  language:       string
  errorType:      string
  severity:       Severity
  level:          Level
  input:          string      // el texto original pegado por el usuario
  explanation:    string
  solution:       string
  terms:          string[]
  correctedCode?: string
}

/** Metadatos de una entrada (para listar sin cargar todo el contenido) */
export interface VaultMeta {
  id:        string
  date:      string    // ISO 8601
  language:  string
  errorType: string
  severity:  Severity
  level:     Level
}

/** Entrada completa del vault (metadatos + contenido) */
export interface VaultEntry extends VaultMeta {
  input:          string
  explanation:    string
  solution:       string
  terms:          string[]
  correctedCode?: string
}

// ── API del puente IPC ───────────────────────────────────────────────────────

/**
 * Interfaz completa expuesta en `window.api`.
 *
 * Dos grupos de funciones:
 *   api.vault.*    — operaciones CRUD sobre el vault de archivos .md
 *   api.config.*   — gestión de la API key en el llavero del SO
 */
export interface DebuggleAPI {
  vault: {
    /** Guarda una entrada nueva. Devuelve el id generado. */
    save(entry: VaultEntryInput): Promise<string>

    /** Lista los metadatos de todas las entradas (sin contenido completo). */
    list(): Promise<VaultMeta[]>

    /** Lee una entrada completa por id. Devuelve null si no existe. */
    read(id: string): Promise<VaultEntry | null>

    /** Elimina una entrada por id. */
    delete(id: string): Promise<void>
  }

  config: {
    /** Lee la API key del llavero del sistema operativo. */
    getKey(service: string): Promise<string | null>

    /** Guarda la API key en el llavero del sistema operativo. */
    setKey(service: string, key: string): Promise<void>

    /** Elimina la API key del llavero del sistema operativo. */
    deleteKey(service: string): Promise<void>

    /**
     * Lee una preferencia de configuración (proveedor activo, modelo, etc.)
     * del archivo prefs.json en el directorio userData de Electron.
     * Devuelve null si la clave no existe.
     */
    getPref(key: string): Promise<string | null>

    /**
     * Guarda una preferencia de configuración en prefs.json.
     */
    setPref(key: string, value: string): Promise<void>
  }
}

// ── Augmentación del objeto window global ───────────────────────────────────

// Extiende Window para que `window.api` esté tipado en todo el renderer.
// Sin esto, TypeScript no sabe que contextBridge expuso `api`.
declare global {
  interface Window {
    api: DebuggleAPI
  }
}
