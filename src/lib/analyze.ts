// Motor de análisis de errores
// Tarea 4: versión mock (respuesta simulada)
// Tarea 6: se reemplaza analyzeMock por analyzeWithAI usando la API real

export type Level = 'novato' | 'medio' | 'experto'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface AnalysisResult {
  errorType: string        // "NullPointerException"
  language: string         // "Kotlin" — detectado automáticamente
  severity: Severity       // para el color del badge
  explanation: string      // explicación adaptada al nivel elegido
  solution: string         // cómo solucionarlo
  terms: string[]          // términos clave para destacar
  correctedCode?: string   // ejemplo de código corregido (opcional)
}

// ── Detección de lenguaje ────────────────────────────────────────────────────
// Analiza el texto buscando patrones característicos de cada lenguaje.
// No es infalible, pero cubre el 90% de los casos comunes.
export function detectLanguage(text: string): string {
  const t = text.toLowerCase()

  if (t.includes('nullpointerexception') || t.includes('fun ') || t.includes('val ') || (t.includes('kotlin') )) return 'Kotlin'
  if (t.includes('typeerror') || t.includes('referenceerror') || t.includes('cannot read properties') || (t.includes('undefined') && (t.includes('const ') || t.includes('let ')))) return 'JavaScript'
  if (t.includes('traceback') || t.includes('attributeerror') || t.includes('indentationerror') || (t.includes('def ') && t.includes(':'))) return 'Python'
  if (t.includes('java.lang') || t.includes('public class') || t.includes('system.out.println')) return 'Java'
  if (t.includes('segmentation fault') || t.includes('#include') || t.includes('std::')) return 'C/C++'
  if (t.includes('error[e') || (t.includes('fn ') && t.includes('let mut'))) return 'Rust'
  if (t.includes('syntaxerror') && t.includes('unexpected token')) return 'JavaScript'
  if (t.includes('uncaught') || t.includes('at <anonymous>')) return 'JavaScript'
  if (t.includes('exception') || t.includes('stack trace') || t.includes('\tat ')) return 'Java/Kotlin'

  return 'Desconocido'
}

// ── Análisis mock ────────────────────────────────────────────────────────────
// Simula la respuesta de la IA con un delay realista.
// Será reemplazado por analyzeWithAI() en Tarea 6.
export async function analyzeMock(text: string, level: Level): Promise<AnalysisResult> {
  // Simula latencia de la API (1.2 segundos)
  await new Promise(resolve => setTimeout(resolve, 1200))

  const language = detectLanguage(text)

  // La misma información, explicada con diferente profundidad según el nivel
  const explanations: Record<Level, string> = {
    novato:
      'Tu programa intentó usar algo que no existe todavía. Imagina que tienes una caja registradora y quieres sacar dinero, pero la caja está vacía (null). El programa intentó "abrir la caja" sin comprobar primero si había algo dentro.',
    medio:
      'Se lanzó una NullPointerException porque intentaste acceder a una propiedad o llamar a un método sobre una referencia que es null en tiempo de ejecución. El objeto no fue inicializado antes de ser usado.',
    experto:
      'NPE en tiempo de ejecución: dereference de referencia nula. Revisar el stack trace para identificar el frame exacto. Posibles causas: inicialización lazy no completada, retorno null no comprobado, o race condition en contexto multihilo.',
  }

  const solutions: Record<Level, string> = {
    novato:
      'Antes de usar el objeto, comprueba que existe: `if (miObjeto != null) { ... }`. En Kotlin puedes usar el operador seguro: `miObjeto?.hazAlgo()` — si es null, simplemente no hace nada en lugar de romper.',
    medio:
      'Usa el operador de seguridad `?.` de Kotlin o añade una comprobación explícita. Si el null no debería ser posible, revisa el flujo de inicialización. Considera usar `requireNotNull()` o `checkNotNull()` para fallo rápido.',
    experto:
      'Implementar null-safety en el punto de entrada. Evaluar si corresponde un `lateinit var` con `::prop.isInitialized`, un `by lazy {}`, o refactorizar a tipo no-nullable con inicialización garantizada en el constructor.',
  }

  const correctedCode: Record<Level, string> = {
    novato:
`// ❌ Código con el error
val actividad = obtenerActividad()
actividad.hacerAlgo()  // Rompe si actividad es null

// ✅ Corrección opción 1 — comprobar antes de usar
if (actividad != null) {
    actividad.hacerAlgo()
}

// ✅ Corrección opción 2 — operador seguro ?.
actividad?.hacerAlgo()  // Si es null, no hace nada y sigue`,

    medio:
`// ❌ Antes — referencia no comprobada
val repo = getRepository()
repo.loadData()  // NPE si getRepository() devuelve null

// ✅ Opción A — operador seguro
repo?.loadData()

// ✅ Opción B — fallo rápido con mensaje claro
val repo = requireNotNull(getRepository()) {
    "getRepository() no debería devolver null aquí"
}
repo.loadData()`,

    experto:
`// ❌ Antes — lateinit no inicializado
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(...) {
        // binding nunca se inicializó → NPE
        binding.textView.text = "hola"
    }
}

// ✅ Corrección — inicializar antes de usar
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)
    binding.textView.text = "hola"  // seguro
}`,
  }

  return {
    errorType: 'NullPointerException',
    language,
    severity: 'high',
    explanation: explanations[level],
    solution: solutions[level],
    terms: ['null', 'referencia', 'inicialización', 'stack trace', 'operador ?.', 'dereference'],
    correctedCode: correctedCode[level],
  }
}
