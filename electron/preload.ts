/**
 * Preload — Context Bridge de Debuggle
 *
 * Este archivo es el "guardia de seguridad" entre el proceso main de Electron
 * (que tiene acceso a Node.js y al sistema operativo) y el renderer (React).
 *
 * ¿Por qué existe este archivo?
 * ─────────────────────────────
 * Electron tiene dos procesos separados:
 *   - Main:     Node.js completo. Puede leer archivos, acceder al sistema, etc.
 *   - Renderer: Un navegador (Chromium). Por seguridad, NO puede acceder a Node.js.
 *
 * El preload se ejecuta antes de que cargue React, en un contexto especial que
 * tiene acceso a AMBOS mundos. Su único trabajo es exponer funciones seguras al
 * renderer usando `contextBridge.exposeInMainWorld`.
 *
 * `contextBridge` garantiza que el renderer solo puede llamar las funciones
 * que nosotros explícitamente exponemos — nada más.
 *
 * Flujo de una llamada:
 *   React → window.api.vault.save(entry)
 *         → ipcRenderer.invoke('vault:save', entry)
 *         → [IPC] → ipcMain.handle('vault:save', ...)  en main.ts
 *         → escribe el archivo .md
 *         → devuelve el id
 *         → React recibe el id como resultado de la Promise
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { DebuggleAPI, VaultEntryInput } from '../src/types/api'

// ── Implementación del puente ─────────────────────────────────────────────────
// Cada función llama a ipcRenderer.invoke() que envía un mensaje al proceso main.
// El main responde con el resultado y la Promise se resuelve.

const api: DebuggleAPI = {

  vault: {
    save: (entry: VaultEntryInput) =>
      ipcRenderer.invoke('vault:save', entry),

    list: () =>
      ipcRenderer.invoke('vault:list'),

    read: (id: string) =>
      ipcRenderer.invoke('vault:read', id),

    delete: (id: string) =>
      ipcRenderer.invoke('vault:delete', id),
  },

  config: {
    getKey: (service: string) =>
      ipcRenderer.invoke('config:get-key', service),

    setKey: (service: string, key: string) =>
      ipcRenderer.invoke('config:set-key', service, key),

    deleteKey: (service: string) =>
      ipcRenderer.invoke('config:delete-key', service),

    getPref: (key: string) =>
      ipcRenderer.invoke('config:get-pref', key),

    setPref: (key: string, value: string) =>
      ipcRenderer.invoke('config:set-pref', key, value),
  },

}

// Expone `api` como `window.api` en el renderer
contextBridge.exposeInMainWorld('api', api)
