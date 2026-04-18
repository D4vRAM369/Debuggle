/**
 * Pantalla Chat — asistente conversacional de debugging
 *
 * Dos modos de uso:
 *   1. Con contexto: el usuario viene desde AnalyzePage con un análisis cargado.
 *      La IA ya sabe de qué error se trata y puede responder preguntas específicas.
 *   2. Sin contexto: chat libre sobre cualquier tema de programación/debugging.
 *
 * Flujo de un mensaje:
 *   1. Usuario escribe → Enter o botón Enviar
 *   2. El mensaje se añade al historial inmediatamente (feedback visual)
 *   3. Se llama a sendChatMessage() con todo el historial
 *   4. La respuesta del asistente se añade al historial
 *   5. El área se hace scroll al final
 */
import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, Loader2, Bot, User, X, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AnalysisResult, Severity } from '@/lib/analyze'
import { sendChatMessage, type ChatMessage } from '@/lib/chat'
import { getProvider, DEFAULT_PROVIDER_ID, getDefaultModel, type ProviderId } from '@/lib/providers'

// ── Estilos de severidad (reutilizados de AnalyzePage) ────────────────────
const SEVERITY_STYLES: Record<Severity, string> = {
  low:      'bg-blue-500/15   text-blue-400   border-blue-500/30',
  medium:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  high:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15    text-red-400    border-red-500/30',
}

// ── System prompt ─────────────────────────────────────────────────────────
// Si hay contexto, le pasamos el análisis para que la IA pueda responder
// preguntas específicas. Si no, modo genérico de debugging.

function buildSystemPrompt(context: AnalysisResult | null): string {
  const base = `Eres un experto en debugging de código que ayuda a desarrolladores a entender y resolver errores. Eres conversacional, claro y pedagógico. Respondes siempre en español.`

  if (!context) return base

  return `${base}

El usuario acaba de analizar este error con Debuggle:
- Tipo de error: ${context.errorType}
- Lenguaje: ${context.language}
- Severidad: ${context.severity}
- Explicación: ${context.explanation}
- Solución sugerida: ${context.solution}
- Términos clave: ${context.terms.join(', ')}${context.correctedCode ? '\n- El usuario tiene acceso al código corregido.' : ''}

El usuario puede hacerte preguntas de seguimiento sobre este error. Responde de forma conversacional y clara.`
}

// ── Props ──────────────────────────────────────────────────────────────────

interface ChatPageProps {
  context:          AnalysisResult | null
  onClearContext:   () => void
}

// ── Componente de burbuja de mensaje ──────────────────────────────────────

interface MessageBubbleProps {
  msg: ChatMessage
}

function MessageBubble({ msg }: MessageBubbleProps): JSX.Element {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      {/* Avatar */}
      <span style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: isUser ? 'var(--bg-3)' : 'var(--accent-soft)',
        color: isUser ? 'var(--text-2)' : 'var(--accent)',
        border: `1px solid ${isUser ? 'var(--border-2)' : 'var(--accent-border)'}`,
        display: 'grid', placeItems: 'center',
      }}>
        {isUser
          ? <User style={{ width: 12, height: 12 }} />
          : <Bot  style={{ width: 12, height: 12 }} />
        }
      </span>
      {/* Burbuja */}
      <div style={{
        maxWidth: '78%',
        background: isUser ? 'var(--accent-soft)' : 'var(--bg-2)',
        border: `1px solid ${isUser ? 'var(--accent-border)' : 'var(--border-1)'}`,
        borderRadius: 12,
        padding: '10px 14px',
        color: 'var(--text-1)',
        fontSize: 'var(--fs-13)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-words',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

// ── Indicador de "escribiendo" ────────────────────────────────────────────

function TypingIndicator(): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: 'var(--accent-soft)', color: 'var(--accent)',
        border: '1px solid var(--accent-border)',
        display: 'grid', placeItems: 'center',
      }}>
        <Bot style={{ width: 12, height: 12 }} />
      </span>
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border-1)',
        borderRadius: 12, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 'var(--fs-12)', color: 'var(--text-3)',
      }}>
        <span className="animate-bounce [animation-delay:0ms]" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-4)', display: 'inline-block' }} />
        <span className="animate-bounce [animation-delay:150ms]" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-4)', display: 'inline-block' }} />
        <span className="animate-bounce [animation-delay:300ms]" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-4)', display: 'inline-block' }} />
        <span style={{ marginLeft: 4 }}>Escribiendo…</span>
      </div>
    </div>
  )
}

// ── Pantalla Chat principal ───────────────────────────────────────────────

export function ChatPage({ context, onClearContext }: ChatPageProps): JSX.Element {
  const [messages,       setMessages]       = useState<ChatMessage[]>([])
  const [input,          setInput]          = useState('')
  const [isSending,      setIsSending]      = useState(false)
  const [activeProvider, setActiveProvider] = useState<ProviderId>(DEFAULT_PROVIDER_ID)
  const [activeModel,    setActiveModel]    = useState<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Carga preferencias al montar
  useEffect(() => {
    async function loadPrefs(): Promise<void> {
      const [savedProvider, savedModel] = await Promise.all([
        window.api.config.getPref('activeProvider'),
        window.api.config.getPref('activeModel'),
      ])
      if (savedProvider) setActiveProvider(savedProvider as ProviderId)
      if (savedModel)    setActiveModel(savedModel)
    }
    loadPrefs()
  }, [])

  // Limpia el historial cuando cambia el contexto
  // (el usuario ha analizado un error nuevo → conversación nueva)
  useEffect(() => {
    setMessages([])
  }, [context])

  // Scroll al fondo cuando llegan mensajes nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  async function handleSend(): Promise<void> {
    const text = input.trim()
    if (!text || isSending) return

    const userMessage: ChatMessage = { role: 'user', content: text }
    const updatedMessages          = [...messages, userMessage]

    // Añade el mensaje del usuario inmediatamente para feedback visual
    setMessages(updatedMessages)
    setInput('')
    setIsSending(true)

    try {
      const provider   = getProvider(activeProvider)
      const modelToUse = activeModel || getDefaultModel(activeProvider)

      let apiKey: string | null = null
      if (provider.needsKey) {
        apiKey = await window.api.config.getKey(activeProvider)
      }

      if (!provider.needsKey || apiKey) {
        const response = await sendChatMessage({
          messages:     updatedMessages,
          systemPrompt: buildSystemPrompt(context),
          provider:     activeProvider,
          model:        modelToUse,
          apiKey:       apiKey ?? undefined,
        })
        setMessages(prev => [...prev, { role: 'assistant', content: response }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ No hay API key configurada. Ve a Config para añadir una clave y vuelve a intentarlo.',
        }])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error al contactar la IA: ${msg}`,
      }])
    } finally {
      setIsSending(false)
    }
  }

  // Enter envía, Shift+Enter hace salto de línea
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const providerName = getProvider(activeProvider).name

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Banner de contexto ── */}
      {context && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-border/80">
          <MessageSquare className="size-3.5 text-primary/60 shrink-0" />
          <span className="text-xs text-muted-foreground">Contexto del análisis:</span>
          <Badge variant="outline" className={cn('text-xs border', SEVERITY_STYLES[context.severity])}>
            {context.errorType}
          </Badge>
          <Badge variant="outline" className="text-xs">{context.language}</Badge>
          <button
            onClick={onClearContext}
            className="ml-auto p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded"
            title="Quitar contexto"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Área de mensajes ── */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-4">

        {/* Estado vacío */}
        {messages.length === 0 && !isSending && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
              <MessageSquare className="size-7 opacity-30" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium">
                {context
                  ? `Preguntas sobre "${context.errorType}"`
                  : 'Asistente de debugging'}
              </p>
              <p className="text-xs opacity-55 max-w-[240px] leading-relaxed">
                {context
                  ? 'Tengo el contexto del análisis. ¿Qué no quedó claro?'
                  : 'Pega un error, describe un problema o pregunta lo que necesites.'}
              </p>
            </div>
          </div>
        )}

        {/* Burbujas de mensaje */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {/* Indicador de escritura */}
        {isSending && <TypingIndicator />}

        {/* Ancla de scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Área de input ── */}
      <div style={{ borderTop: '1px solid var(--border-1)', background: 'var(--bg-1)', padding: '14px 24px 16px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            background: 'var(--bg-2)', border: '1px solid var(--border-2)',
            borderRadius: 12, padding: 8,
          }}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={context ? `¿Qué más quieres saber sobre ${context.errorType}?` : 'Escribe tu pregunta... (Enter para enviar)'}
              rows={1}
              disabled={isSending}
              style={{ border: 'none', background: 'transparent', flex: 1, minHeight: 44, resize: 'none', fontSize: 'var(--fs-13)', color: 'var(--text-1)', outline: 'none' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="btn primary"
              style={{ width: 38, height: 38, padding: 0, justifyContent: 'center', flexShrink: 0 }}
            >
              {isSending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Send style={{ width: 14, height: 14 }} />}
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 'var(--fs-11)', color: 'var(--text-4)', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
            <span>Enter para enviar · Shift+Enter nueva línea</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Cpu style={{ width: 10, height: 10 }} /> {providerName}
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
