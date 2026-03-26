/**
 * Main Process — Proceso principal de Debuggle
 *
 * Este es el proceso Node.js de Electron. Aquí vivem:
 *   1. La lógica de creación de ventanas
 *   2. Los handlers IPC que el renderer (React) llama vía window.api
 *
 * Handlers registrados:
 *   vault:save      — guarda una entrada como archivo .md con frontmatter YAML
 *   vault:list      — lista los metadatos de todas las entradas
 *   vault:read      — lee una entrada completa por id
 *   vault:delete    — elimina un archivo .md del vault
 *   config:get-key  — lee la API key del llavero del SO (keytar)
 *   config:set-key  — guarda la API key en el llavero del SO
 *   config:delete-key — elimina la API key del llavero
 *
 * Vault: los archivos se guardan en ~/Debuggle/vault/<id>.md
 * Formato: YAML frontmatter (metadatos) + cuerpo markdown (el error original)
 */
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import os from 'os'
import matter from 'gray-matter'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import type { VaultEntryInput, VaultMeta, VaultEntry } from '../src/types/api'

// ── Auto-updater ─────────────────────────────────────────────────────────────
// Solo activo en producción (no en dev).
// Flujo: checkForUpdates → update-available (banner) → update-downloaded → quitAndInstall
// Linux: funciona con AppImage. deb/rpm/flatpak usan sus propios gestores de paquetes.

autoUpdater.autoDownload          = true   // descarga en segundo plano
autoUpdater.autoInstallOnAppQuit  = true   // instala al cerrar si ya está descargada

function setupAutoUpdater(win: BrowserWindow): void {
  if (is.dev) return   // sin check en desarrollo

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update:available', { version: info.version })
  })

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('update:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater]', err.message)   // silencioso para el usuario
  })

  autoUpdater.checkForUpdates()
  setInterval(() => autoUpdater.checkForUpdates(), 2 * 60 * 60 * 1000)  // cada 2h
}

ipcMain.handle('update:install', () => autoUpdater.quitAndInstall())

// ── Directorio del vault ─────────────────────────────────────────────────────
// ~/Debuggle/vault/  — carpeta en el home del usuario
const VAULT_DIR = join(os.homedir(), 'Debuggle', 'vault')

/** Crea el directorio del vault si no existe (idempotente) */
async function ensureVaultDir(): Promise<void> {
  await fs.mkdir(VAULT_DIR, { recursive: true })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Genera un ID único para cada entrada: timestamp en base 36 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** Ruta completa al archivo .md de una entrada */
function entryPath(id: string): string {
  return join(VAULT_DIR, `${id}.md`)
}

/**
 * Serializa una entrada a formato .md con frontmatter YAML.
 *
 * El archivo resultante tiene este aspecto:
 *
 *   ---
 *   id: "k9x2mf4a"
 *   date: "2026-03-16T10:30:00.000Z"
 *   language: "Kotlin"
 *   errorType: "NullPointerException"
 *   severity: "high"
 *   level: "medio"
 *   terms: ["null", "referencia"]
 *   explanation: "Se lanzó una NPE porque..."
 *   solution: "Usa el operador ?. de Kotlin..."
 *   correctedCode: "val repo = ..."
 *   ---
 *
 *   # Error original
 *
 *   java.lang.NullPointerException: ...
 */
function serializeEntry(entry: VaultEntryInput, id: string): string {
  const frontmatter = {
    id,
    date:          new Date().toISOString(),
    language:      entry.language,
    errorType:     entry.errorType,
    severity:      entry.severity,
    level:         entry.level,
    terms:         entry.terms,
    explanation:   entry.explanation,
    solution:      entry.solution,
    ...(entry.correctedCode ? { correctedCode: entry.correctedCode } : {}),
  }

  const body = `# Error original\n\n${entry.input}`
  return matter.stringify(body, frontmatter)
}

/**
 * Deserializa un archivo .md a un objeto VaultEntry.
 * Usa gray-matter para separar el frontmatter del cuerpo.
 */
function deserializeEntry(raw: string): VaultEntry {
  const { data, content } = matter(raw)

  // El cuerpo es "# Error original\n\ninput..." — extraemos el input
  const inputMatch = content.match(/# Error original\n\n([\s\S]*)/)
  const input = inputMatch ? inputMatch[1].trim() : ''

  return {
    id:            data.id,
    date:          data.date,
    language:      data.language,
    errorType:     data.errorType,
    severity:      data.severity,
    level:         data.level,
    terms:         data.terms ?? [],
    explanation:   data.explanation,
    solution:      data.solution,
    input,
    correctedCode: data.correctedCode,
  }
}

// ── Handlers IPC del vault ────────────────────────────────────────────────────

/** vault:save — guarda una entrada nueva, devuelve el id */
ipcMain.handle('vault:save', async (_event, entry: VaultEntryInput): Promise<string> => {
  await ensureVaultDir()
  const id = generateId()
  const content = serializeEntry(entry, id)
  await fs.writeFile(entryPath(id), content, 'utf-8')
  return id
})

/** vault:list — devuelve los metadatos de todas las entradas */
ipcMain.handle('vault:list', async (): Promise<VaultMeta[]> => {
  await ensureVaultDir()

  const files = await fs.readdir(VAULT_DIR)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  const metas = await Promise.all(
    mdFiles.map(async (filename): Promise<VaultMeta | null> => {
      try {
        const raw = await fs.readFile(join(VAULT_DIR, filename), 'utf-8')
        const { data } = matter(raw)
        return {
          id:        data.id,
          date:      data.date,
          language:  data.language,
          errorType: data.errorType,
          severity:  data.severity,
          level:     data.level,
        }
      } catch {
        return null  // archivo corrupto — lo ignoramos
      }
    })
  )

  // Filtrar nulls y ordenar por fecha desc (más reciente primero)
  return (metas.filter(Boolean) as VaultMeta[])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

/** vault:read — lee una entrada completa por id */
ipcMain.handle('vault:read', async (_event, id: string): Promise<VaultEntry | null> => {
  try {
    const raw = await fs.readFile(entryPath(id), 'utf-8')
    return deserializeEntry(raw)
  } catch {
    return null  // el archivo no existe
  }
})

/** vault:delete — elimina el archivo .md de una entrada */
ipcMain.handle('vault:delete', async (_event, id: string): Promise<void> => {
  try {
    await fs.unlink(entryPath(id))
  } catch {
    // Si no existe, no hacemos nada (idempotente)
  }
})

// ── Handlers IPC de preferencias (prefs.json en userData) ────────────────────
// Las preferencias son datos NO sensibles: proveedor activo, modelo elegido, etc.
// Se guardan en un JSON en el directorio de datos de la app (gestionado por Electron).
// Las API keys (sí sensibles) van en keytar, justo después.

async function getPrefsPath(): Promise<string> {
  return join(app.getPath('userData'), 'prefs.json')
}

async function readPrefs(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(await getPrefsPath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}  // si el archivo no existe o está corrupto, devolvemos vacío
  }
}

async function writePrefs(prefs: Record<string, string>): Promise<void> {
  await fs.writeFile(await getPrefsPath(), JSON.stringify(prefs, null, 2), 'utf-8')
}

/** config:get-pref — lee una preferencia del archivo prefs.json */
ipcMain.handle('config:get-pref', async (_event, key: string): Promise<string | null> => {
  const prefs = await readPrefs()
  return prefs[key] ?? null
})

/** config:set-pref — guarda una preferencia en prefs.json */
ipcMain.handle('config:set-pref', async (_event, key: string, value: string): Promise<void> => {
  const prefs = await readPrefs()
  prefs[key] = value
  await writePrefs(prefs)
})

// ── Handlers IPC de config (API keys via keytar) ──────────────────────────────
// keytar guarda secretos en el llavero nativo del sistema operativo:
//   Windows → Windows Credential Manager
//   macOS   → Keychain
//   Linux   → libsecret / GNOME Keyring
//
// Es mucho más seguro que guardar la key en un archivo de texto plano
// o en localStorage, porque el SO cifra y protege las credenciales.

// Importamos keytar de forma lazy para evitar problemas si no está disponible
async function getKeytar() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('keytar')
  } catch {
    console.warn('[keytar] No disponible — las API keys no se podrán guardar de forma segura')
    return null
  }
}

const KEYTAR_ACCOUNT = 'debuggle-api-key'

/** config:get-key — lee la API key del llavero del SO */
ipcMain.handle('config:get-key', async (_event, service: string): Promise<string | null> => {
  const keytar = await getKeytar()
  if (!keytar) return null
  return keytar.getPassword(service, KEYTAR_ACCOUNT)
})

/** config:set-key — guarda la API key en el llavero del SO */
ipcMain.handle('config:set-key', async (_event, service: string, key: string): Promise<void> => {
  const keytar = await getKeytar()
  if (!keytar) throw new Error('keytar no disponible')
  await keytar.setPassword(service, KEYTAR_ACCOUNT, key)
})

/** config:delete-key — elimina la API key del llavero del SO */
ipcMain.handle('config:delete-key', async (_event, service: string): Promise<void> => {
  const keytar = await getKeytar()
  if (!keytar) return
  await keytar.deletePassword(service, KEYTAR_ACCOUNT)
})

// ── Ventana principal ────────────────────────────────────────────────────────

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 900,
    minHeight: 580,
    show: false,
    autoHideMenuBar: true,
    title: 'Debuggle',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,   // el renderer NO puede acceder a Node.js directamente
      nodeIntegration: false    // refuerza la separación: sin require() en React
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Inicia el ciclo de comprobación de actualizaciones
  setupAutoUpdater(mainWindow)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('dev.d4vram.debuggle')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
