/**
 * Motor de análisis real — analyzeWithAI()
 *
 * Reemplaza a analyzeMock() de analyze.ts usando la IA real.
 * Soporta 6 proveedores: Groq, Anthropic, OpenRouter, OpenAI, VeniceAI, Ollama.
 *
 * Arquitectura:
 *   - 5 de los 6 proveedores son compatibles con la API de OpenAI
 *     → un solo cliente `OpenAI` con `baseURL` distinto cubre todos
 *   - Anthropic usa su propio formato de API y su SDK
 *
 * El renderer (React) llama a analyzeWithAI() directamente.
 * La API key se obtiene previamente de keytar via window.api.config.getKey().
 * Los SDKs de IA pueden ejecutarse en el renderer con dangerouslyAllowBrowser: true,
 * que en Electron es seguro porque no es un navegador público.
 */
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import type { Level, AnalysisResult, Severity } from './analyze'
import { detectLanguage } from './analyze'
import type { ProviderId } from './providers'
import { getProvider } from './providers'

// ── Parámetros de la llamada ─────────────────────────────────────────────────

export interface AnalyzeParams {
  input:    string
  level:    Level
  provider: ProviderId
  model:    string
  apiKey?:  string   // undefined cuando needsKey es false (Ollama)
}

// ── Prompt del sistema ───────────────────────────────────────────────────────
// Instruye a la IA para que devuelva JSON con la estructura exacta de AnalysisResult.
// Pedir JSON explícitamente en el system prompt + response_format: json_object
// garantiza que siempre podemos parsear la respuesta.

const SYSTEM_PROMPT = `Eres un experto en debugging de código que ayuda a desarrolladores a entender y solucionar errores.

Cuando el usuario te pega un error, log o snippet de código, debes analizarlo y responder ÚNICAMENTE con un JSON válido (sin markdown, sin bloques de código, solo el objeto JSON puro) con esta estructura exacta:

{
  "errorType": "nombre técnico del error (ej: NullPointerException, TypeError: Cannot read properties)",
  "language": "lenguaje detectado (Kotlin, JavaScript, Python, Java, C/C++, Rust, etc.)",
  "severity": "low | medium | high | critical",
  "explanation": "explicación adaptada al nivel del usuario",
  "solution": "pasos concretos y claros para solucionar el error",
  "terms": ["array", "de", "términos", "técnicos", "clave", "del", "error"],
  "correctedCode": "código corregido con comentarios — OMITIR este campo si no aplica. IMPORTANTE: usa saltos de línea reales (\\n) en el código, nunca pongas todo en una sola línea"
}

Criterios de severidad:
  low      = warning, deprecation, estilo — no rompe la app
  medium   = error manejable, funcionalidad parcial afectada
  high     = excepción no capturada, crash en flujo principal
  critical = pérdida de datos, fallo de seguridad, corrupción de estado

Niveles de explicación según el campo "nivel" que el usuario indica:
  novato   = sin jerga técnica, analogías del mundo físico, pasos muy concretos y simples
  medio    = terminología técnica básica, referencias al stack trace o framework
  experto  = análisis profundo, causas raíz, edge cases, patrones de solución, trade-offs`

function buildUserMessage(input: string, level: Level): string {
  return `Nivel del usuario: ${level}

Error a analizar:
\`\`\`
${input}
\`\`\``
}

// ── Parser de respuesta ──────────────────────────────────────────────────────
// Extrae y valida el JSON aunque la IA lo envuelva en markdown (```json ... ```)

function parseAIResponse(raw: string, fallbackInput: string): AnalysisResult {
  try {
    // Intento 1: parsear directamente
    let json: Record<string, unknown>
    try {
      json = JSON.parse(raw)
    } catch {
      // Intento 2: extraer el primer objeto JSON del texto
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No se encontró JSON en la respuesta')
      json = JSON.parse(match[0])
    }

    return {
      errorType:    (json.errorType    as string)   ?? 'Error desconocido',
      language:     (json.language     as string)   ?? detectLanguage(fallbackInput),
      severity:     (json.severity     as Severity) ?? 'medium',
      explanation:  (json.explanation  as string)   ?? 'Sin explicación disponible.',
      solution:     (json.solution     as string)   ?? 'Sin solución disponible.',
      terms:        (json.terms        as string[]) ?? [],
      correctedCode:(json.correctedCode as string)  ?? undefined,
    }
  } catch (err) {
    // Si todo falla, lanzamos un error descriptivo con el fragmento de respuesta
    throw new Error(
      `La IA devolvió una respuesta inesperada (no es JSON válido).\n` +
      `Primeros 300 caracteres: ${raw.slice(0, 300)}`
    )
  }
}

// ── Llamada a proveedores OpenAI-compatibles ─────────────────────────────────
// Groq, OpenRouter, VeniceAI, Ollama y OpenAI usan el mismo formato de API.

async function callOpenAICompat(params: AnalyzeParams & { baseURL: string }): Promise<AnalysisResult> {
  const client = new OpenAI({
    apiKey:  params.apiKey ?? 'no-key-needed',  // Ollama acepta cualquier string
    baseURL: params.baseURL,
    // dangerouslyAllowBrowser: en Electron el renderer NO es un navegador público,
    // es una ventana controlada por nosotros. Esta flag es segura aquí.
    dangerouslyAllowBrowser: true,
    defaultHeaders: params.provider === 'openrouter'
      ? { 'HTTP-Referer': 'https://github.com/d4vram/debuggle', 'X-Title': 'Debuggle' }
      : undefined,
  })

  const completion = await client.chat.completions.create({
    model:    params.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: buildUserMessage(params.input, params.level) },
    ],
    temperature: 0.3,  // baja temperatura = respuestas más consistentes y predecibles
    // response_format: json_object garantiza JSON puro si el proveedor lo soporta.
    // Lo omitimos para Ollama y Venice porque no todos los modelos lo implementan.
    ...(['groq', 'openai'].includes(params.provider)
      ? { response_format: { type: 'json_object' as const } }
      : {}
    ),
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  return parseAIResponse(raw, params.input)
}

// ── Llamada a Anthropic (Claude) ─────────────────────────────────────────────
// Anthropic tiene su propio formato: messages API con system separado

async function callAnthropic(params: AnalyzeParams): Promise<AnalysisResult> {
  const client = new Anthropic({
    apiKey: params.apiKey!,
    dangerouslyAllowBrowser: true,
  })

  const message = await client.messages.create({
    model:      params.model,
    max_tokens: 1024,
    system:     SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserMessage(params.input, params.level) },
    ],
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
  return parseAIResponse(raw, params.input)
}

// ── Función principal ────────────────────────────────────────────────────────

/**
 * Analiza un error usando la IA real del proveedor configurado.
 *
 * @throws Error si la llamada a la API falla o la respuesta no es parseable
 */
export async function analyzeWithAI(params: AnalyzeParams): Promise<AnalysisResult> {
  const provider = getProvider(params.provider)

  if (provider.sdkType === 'anthropic') {
    return callAnthropic(params)
  }

  return callOpenAICompat({
    ...params,
    baseURL: provider.baseURL!,
  })
}
