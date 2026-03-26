/**
 * Pantalla de Configuración — versión funcional (Tarea 6)
 *
 * Permite al usuario:
 *   1. Elegir el proveedor de IA activo
 *   2. Elegir el modelo dentro de ese proveedor
 *   3. Guardar la API key de forma segura (keytar → llavero del SO)
 *
 * La UI se pulirá en Tarea 10. Por ahora es funcional y suficiente
 * para poder probar la IA real desde la Tarea 6.
 */
import { useState, useEffect } from 'react'
import { Eye, EyeOff, Check, Loader2, ExternalLink, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  PROVIDERS,
  type ProviderId,
  DEFAULT_PROVIDER_ID,
  getProvider,
  getDefaultModel,
} from '@/lib/providers'

export function ConfigPage(): JSX.Element {
  const [activeProvider, setActiveProvider] = useState<ProviderId>(DEFAULT_PROVIDER_ID)
  const [activeModel,    setActiveModel]    = useState<string>('')
  const [apiKey,         setApiKey]         = useState('')
  const [showKey,        setShowKey]        = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)

  const provider = getProvider(activeProvider)

  // Carga las preferencias guardadas al montar
  useEffect(() => {
    async function load(): Promise<void> {
      const [savedProvider, savedModel] = await Promise.all([
        window.api.config.getPref('activeProvider'),
        window.api.config.getPref('activeModel'),
      ])
      if (savedProvider) setActiveProvider(savedProvider as ProviderId)
      if (savedModel)    setActiveModel(savedModel)
    }
    load()
  }, [])

  // Cuando cambia el proveedor, verifica si ya tiene una key guardada
  useEffect(() => {
    async function checkKey(): Promise<void> {
      setApiKey('')
      setHasExistingKey(false)
      if (!provider.needsKey) return
      const existing = await window.api.config.getKey(activeProvider)
      setHasExistingKey(!!existing)
    }
    checkKey()
  }, [activeProvider, provider.needsKey])

  async function handleSave(): Promise<void> {
    setSaving(true)
    setSaved(false)
    try {
      // Guardar proveedor y modelo activos en prefs.json
      await Promise.all([
        window.api.config.setPref('activeProvider', activeProvider),
        window.api.config.setPref('activeModel', activeModel || getDefaultModel(activeProvider)),
      ])

      // Guardar la API key en el llavero del SO (si la introdujo)
      if (provider.needsKey && apiKey.trim()) {
        await window.api.config.setKey(activeProvider, apiKey.trim())
        setHasExistingKey(true)
        setApiKey('')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteKey(): Promise<void> {
    await window.api.config.deleteKey(activeProvider)
    setHasExistingKey(false)
    setApiKey('')
  }

  return (
    <div className="flex flex-col h-full p-5 gap-4 overflow-y-auto">

      {/* Título */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Configuración</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Elige el proveedor de IA y configura tu API key
        </p>
      </div>

      <Separator />

      {/* ── Selector de proveedor ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Proveedor de IA
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProvider(p.id)
                setActiveModel('')
              }}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-md border text-left transition-colors',
                activeProvider === p.id
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:border-border/80 hover:bg-accent/50'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                {p.models.some(m => m.free) && (
                  <Badge variant="secondary" className="text-xs py-0">gratis</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {p.needsKey ? 'Requiere API key' : 'Sin API key — local'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Selector de modelo ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Modelo
        </p>
        <Select
          value={activeModel || getDefaultModel(activeProvider)}
          onValueChange={setActiveModel}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige un modelo..." />
          </SelectTrigger>
          <SelectContent>
            {provider.models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center gap-2">
                  <span>{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.context}</span>
                  {m.free && <Badge variant="secondary" className="text-xs py-0">gratis</Badge>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── API Key ── */}
      {provider.needsKey && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              API Key
            </p>
            <a
              href={provider.docsURL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.preventDefault(); window.open(provider.docsURL) }}
            >
              <ExternalLink className="size-3" />
              Obtener key
            </a>
          </div>

          {hasExistingKey && !apiKey && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="size-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-500">
                      API key guardada en el llavero del sistema
                    </span>
                  </div>
                  <button
                    onClick={handleDeleteKey}
                    className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasExistingKey ? 'Nueva key (dejar vacío para mantener la actual)' : provider.keyLabel}
              className={cn(
                'w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 pr-9',
                'text-sm shadow-sm transition-colors placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono'
              )}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="size-3 opacity-60" />
            La key se guarda cifrada en el llavero nativo del SO, nunca en texto plano.
          </p>
        </div>
      )}

      {/* Ollama: instrucciones especiales */}
      {!provider.needsKey && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Configuración de Ollama
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2 text-xs text-muted-foreground">
            <p>Ollama corre en tu máquina. No necesita API key ni internet.</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Instala Ollama desde <span className="text-foreground">ollama.com</span></li>
              <li>Descarga un modelo: <code className="text-foreground bg-muted px-1 rounded">ollama pull llama3.2</code></li>
              <li>Ollama arranca automáticamente en <code className="text-foreground bg-muted px-1 rounded">localhost:11434</code></li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Botón guardar */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="gap-2 mt-auto self-start"
      >
        {saving
          ? <><Loader2 className="size-4 animate-spin" /> Guardando...</>
          : saved
            ? <><Check className="size-4 text-emerald-400" /> ¡Guardado!</>
            : 'Guardar configuración'
        }
      </Button>

    </div>
  )
}
