/**
 * Definición de los 6 proveedores de IA soportados por Debuggle.
 *
 * Clave del diseño: Groq, OpenRouter, VeniceAI, Ollama y OpenAI tienen
 * APIs compatibles con OpenAI. Eso significa que con el mismo SDK
 * (paquete `openai`) y cambiando solo `baseURL` y `apiKey` cubrimos
 * 5 de 6 proveedores. Solo Anthropic necesita su propio SDK.
 *
 *   openai SDK → baseURL distinto → Groq / OpenRouter / Venice / Ollama / OpenAI
 *   @anthropic-ai/sdk              → Anthropic (Claude)
 */

export type ProviderId = 'groq' | 'anthropic' | 'openrouter' | 'openai' | 'venice' | 'ollama'

export interface ModelOption {
  id:      string
  label:   string
  free:    boolean   // true = sin coste para el usuario
  context: string    // tamaño de ventana de contexto: "8K", "128K"…
}

export interface ProviderDef {
  id:        ProviderId
  name:      string
  sdkType:   'openai-compat' | 'anthropic'  // qué SDK usar internamente
  baseURL?:  string                          // undefined para Anthropic (usa el suyo)
  needsKey:  boolean                         // false solo en Ollama (local, sin auth)
  docsURL:   string                          // dónde crear la API key
  keyLabel:  string                          // texto descriptivo para el input de la key
  models:    ModelOption[]
}

export const PROVIDERS: ProviderDef[] = [
  // ── Groq — recomendado para empezar: gratis y muy rápido ─────────────────
  {
    id:       'groq',
    name:     'Groq',
    sdkType:  'openai-compat',
    baseURL:  'https://api.groq.com/openai/v1',
    needsKey: true,
    docsURL:  'https://console.groq.com',
    keyLabel: 'API Key de Groq (console.groq.com)',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B',  free: true, context: '128K' },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B',   free: true, context: '128K' },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',   free: true, context: '32K'  },
      { id: 'gemma2-9b-it',            label: 'Gemma 2 9B',     free: true, context: '8K'   },
    ],
  },

  // ── Anthropic — Claude (modelos de pago, muy alta calidad) ───────────────
  {
    id:       'anthropic',
    name:     'Anthropic (Claude)',
    sdkType:  'anthropic',
    needsKey: true,
    docsURL:  'https://console.anthropic.com',
    keyLabel: 'API Key de Anthropic (console.anthropic.com)',
    models: [
      { id: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku',  free: false, context: '200K' },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', free: false, context: '200K' },
      { id: 'claude-3-haiku-20240307',    label: 'Claude 3 Haiku',    free: false, context: '200K' },
    ],
  },

  // ── OpenRouter — agrega 200+ proveedores, algunos modelos son gratis ─────
  {
    id:       'openrouter',
    name:     'OpenRouter',
    sdkType:  'openai-compat',
    baseURL:  'https://openrouter.ai/api/v1',
    needsKey: true,
    docsURL:  'https://openrouter.ai/keys',
    keyLabel: 'API Key de OpenRouter (openrouter.ai)',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (gratis)', free: true,  context: '128K' },
      { id: 'google/gemma-3-27b-it:free',             label: 'Gemma 3 27B (gratis)',   free: true,  context: '96K'  },
      { id: 'mistralai/mistral-7b-instruct:free',     label: 'Mistral 7B (gratis)',    free: true,  context: '32K'  },
      { id: 'anthropic/claude-3.5-haiku',             label: 'Claude 3.5 Haiku',       free: false, context: '200K' },
      { id: 'openai/gpt-4o-mini',                     label: 'GPT-4o mini',            free: false, context: '128K' },
    ],
  },

  // ── OpenAI — GPT (modelos de pago) ──────────────────────────────────────
  {
    id:       'openai',
    name:     'OpenAI',
    sdkType:  'openai-compat',
    baseURL:  'https://api.openai.com/v1',
    needsKey: true,
    docsURL:  'https://platform.openai.com/api-keys',
    keyLabel: 'API Key de OpenAI (platform.openai.com)',
    models: [
      { id: 'gpt-4o-mini',   label: 'GPT-4o mini',   free: false, context: '128K' },
      { id: 'gpt-4o',        label: 'GPT-4o',         free: false, context: '128K' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', free: false, context: '16K'  },
    ],
  },

  // ── VeniceAI — privacy-first, modelos open source ────────────────────────
  {
    id:       'venice',
    name:     'VeniceAI',
    sdkType:  'openai-compat',
    baseURL:  'https://api.venice.ai/api/v1',
    needsKey: true,
    docsURL:  'https://venice.ai/settings/api',
    keyLabel: 'API Key de Venice (venice.ai)',
    models: [
      { id: 'llama-3.3-70b',   label: 'Llama 3.3 70B',   free: true, context: '128K' },
      { id: 'mistral-31-24b',  label: 'Mistral 31 24B',  free: true, context: '128K' },
    ],
  },

  // ── Ollama — local, sin internet, sin API key ─────────────────────────────
  {
    id:       'ollama',
    name:     'Ollama (local)',
    sdkType:  'openai-compat',
    baseURL:  'http://localhost:11434/v1',
    needsKey: false,
    docsURL:  'https://ollama.com',
    keyLabel: 'No necesita API key — corre en tu máquina',
    models: [
      { id: 'llama3.2',   label: 'Llama 3.2 3B', free: true, context: '128K' },
      { id: 'llama3.1',   label: 'Llama 3.1 8B', free: true, context: '128K' },
      { id: 'mistral',    label: 'Mistral 7B',    free: true, context: '8K'   },
      { id: 'codellama',  label: 'Code Llama',    free: true, context: '16K'  },
      { id: 'gemma2',     label: 'Gemma 2 9B',    free: true, context: '8K'   },
    ],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export const DEFAULT_PROVIDER_ID: ProviderId = 'groq'

export function getProvider(id: ProviderId): ProviderDef {
  return PROVIDERS.find(p => p.id === id) ?? PROVIDERS[0]
}

export function getDefaultModel(providerId: ProviderId): string {
  return getProvider(providerId).models[0].id
}
