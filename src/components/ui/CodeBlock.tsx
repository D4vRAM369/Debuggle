/**
 * CodeBlock — bloque de código con syntax highlighting y copia al portapapeles.
 *
 * Usa highlight.js para colorear el código. El tema (atom-one-dark) se carga
 * una sola vez en index.css. Este componente solo aplica el highlighting.
 *
 * Uso:
 *   <CodeBlock code="const x = 1" language="typescript" />
 */
import { useState, useEffect, useRef } from 'react'
import { Copy, Check } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import { cn } from '@/lib/utils'

// Registramos solo los lenguajes que Debuggle realmente usa.
// Esto evita importar los ~200 lenguajes de hljs (reduce el bundle ~400kb).
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import java       from 'highlight.js/lib/languages/java'
import python     from 'highlight.js/lib/languages/python'
import kotlin     from 'highlight.js/lib/languages/kotlin'
import cpp        from 'highlight.js/lib/languages/cpp'
import rust       from 'highlight.js/lib/languages/rust'
import go         from 'highlight.js/lib/languages/go'
import bash       from 'highlight.js/lib/languages/bash'
import xml        from 'highlight.js/lib/languages/xml'
import json       from 'highlight.js/lib/languages/json'
import sql        from 'highlight.js/lib/languages/sql'
import css        from 'highlight.js/lib/languages/css'

hljs.registerLanguage('javascript',  javascript)
hljs.registerLanguage('typescript',  typescript)
hljs.registerLanguage('java',        java)
hljs.registerLanguage('python',      python)
hljs.registerLanguage('kotlin',      kotlin)
hljs.registerLanguage('cpp',         cpp)
hljs.registerLanguage('c',           cpp)
hljs.registerLanguage('rust',        rust)
hljs.registerLanguage('go',          go)
hljs.registerLanguage('bash',        bash)
hljs.registerLanguage('shell',       bash)
hljs.registerLanguage('xml',         xml)
hljs.registerLanguage('html',        xml)
hljs.registerLanguage('json',        json)
hljs.registerLanguage('sql',         sql)
hljs.registerLanguage('css',         css)

// Mapeo de nombres de lenguaje que devuelve la IA → alias de highlight.js
const LANG_MAP: Record<string, string> = {
  'javascript': 'javascript',
  'typescript': 'typescript',
  'java':       'java',
  'python':     'python',
  'kotlin':     'kotlin',
  'c++':        'cpp',
  'c/c++':      'cpp',
  'c':          'c',
  'rust':       'rust',
  'go':         'go',
  'golang':     'go',
  'bash':       'bash',
  'shell':      'bash',
  'html':       'html',
  'xml':        'xml',
  'json':       'json',
  'sql':        'sql',
  'css':        'css',
}

function resolveLanguage(lang: string): string {
  return LANG_MAP[lang.toLowerCase()] ?? 'plaintext'
}

// ── Componente ────────────────────────────────────────────────────────────────

interface CodeBlockProps {
  code:     string
  language: string
  className?: string
}

export function CodeBlock({ code, language, className }: CodeBlockProps): JSX.Element {
  const [copied, setCopied]  = useState(false)
  const codeRef              = useRef<HTMLElement>(null)

  // Aplica el highlighting tras montar o cuando cambia el código/lenguaje
  useEffect(() => {
    if (!codeRef.current) return
    const resolved = resolveLanguage(language)
    try {
      const result = resolved !== 'plaintext'
        ? hljs.highlight(code, { language: resolved })
        : hljs.highlightAuto(code)
      codeRef.current.innerHTML = result.value
    } catch {
      // Si el lenguaje falla, mostramos el código sin coloreado
      codeRef.current.textContent = code
    }
  }, [code, language])

  function handleCopy(): void {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('overflow-hidden rounded-[18px] border border-white/7 bg-[rgba(8,10,18,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]', className)}>
      <div className="flex items-center justify-between border-b border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-3 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied
            ? <><Check className="size-3 text-emerald-500" /> Copiado</>
            : <><Copy className="size-3" /> Copiar</>
          }
        </button>
      </div>
      <pre className="m-0 overflow-x-auto bg-[#090b12] p-4">
        <code
          ref={codeRef}
          className="text-xs font-mono leading-relaxed hljs"
        />
      </pre>
    </div>
  )
}

export default CodeBlock
