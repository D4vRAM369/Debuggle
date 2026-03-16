/**
 * Motor de chat conversacional — sendChatMessage()
 *
 * Reutiliza la infraestructura de proveedores de ai.ts pero en modo
 * conversacional: acepta un historial de mensajes (multi-turno) en lugar
 * de devolver un JSON estructurado.
 *
 * A diferencia de analyzeWithAI(), aquí no necesitamos un parser defensivo
 * porque la respuesta es texto libre, no JSON.
 */
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import type { ProviderId } from './providers'
import { getProvider } from './providers'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface ChatParams {
  messages:     ChatMessage[]   // historial completo incluyendo el nuevo mensaje del usuario
  systemPrompt: string
  provider:     ProviderId
  model:        string
  apiKey?:      string          // undefined cuando needsKey es false (Ollama)
}

// ── Llamada a proveedores OpenAI-compatibles ──────────────────────────────

async function chatOpenAICompat(params: ChatParams & { baseURL: string }): Promise<string> {
  const client = new OpenAI({
    apiKey:  params.apiKey ?? 'no-key-needed',
    baseURL: params.baseURL,
    dangerouslyAllowBrowser: true,
    defaultHeaders: params.provider === 'openrouter'
      ? { 'HTTP-Referer': 'https://github.com/d4vram/debuggle', 'X-Title': 'Debuggle' }
      : undefined,
  })

  const completion = await client.chat.completions.create({
    model:    params.model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      ...params.messages,
    ],
    // temperature 0.7: más alta que en análisis (0.3) porque aquí queremos
    // respuestas conversacionales y naturales, no JSON reproducible
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content ?? 'Sin respuesta.'
}

// ── Llamada a Anthropic ───────────────────────────────────────────────────

async function chatAnthropic(params: ChatParams): Promise<string> {
  const client = new Anthropic({
    apiKey: params.apiKey!,
    dangerouslyAllowBrowser: true,
  })

  const message = await client.messages.create({
    model:      params.model,
    max_tokens: 1024,
    system:     params.systemPrompt,
    messages:   params.messages,
  })

  return message.content[0]?.type === 'text' ? message.content[0].text : 'Sin respuesta.'
}

// ── Función principal ─────────────────────────────────────────────────────

/**
 * Envía el historial de mensajes a la IA y devuelve el texto de respuesta.
 *
 * El array `messages` debe incluir el mensaje del usuario que acaba de escribir
 * (ya añadido antes de llamar a esta función). La función solo devuelve
 * el texto del asistente; el llamador es responsable de añadirlo al historial.
 *
 * @throws Error si la llamada a la API falla
 */
export async function sendChatMessage(params: ChatParams): Promise<string> {
  const provider = getProvider(params.provider)

  if (provider.sdkType === 'anthropic') {
    return chatAnthropic(params)
  }

  return chatOpenAICompat({
    ...params,
    baseURL: provider.baseURL!,
  })
}
