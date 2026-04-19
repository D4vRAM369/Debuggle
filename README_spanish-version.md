# 🐛 Debuggle

> Tu asistente personal de debugging. Pega un error, entiéndelo a tu nivel, guárdalo, y no vuelvas a repetirlo.

![Banner de Debuggle](assets/branding/debuggle-readme-banner-1600x500.png)

[![Licencia: BUSL-1.1](https://img.shields.io/badge/Licencia-BUSL%201.1-orange.svg)](https://github.com/D4vRAM369/Debuggle/blob/main/LICENSE)
[![Construido con Claude Code](https://img.shields.io/badge/Construido%20con-Claude%20Code-orange?logo=anthropic)](https://claude.ai/claude-code)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)

---

## ¿Qué es Debuggle?

Debuggle es una aplicación de escritorio para desarrolladores que quieren **entender** sus errores, no solo arreglarlos. Pega cualquier stack trace o mensaje de error y obtén una explicación clara adaptada a tu nivel de experiencia — luego guárdala en tu bóveda personal para construir una base de conocimiento con tu propio historial de debugging.

**100% local. Tus errores no salen de tu máquina a menos que elijas un proveedor de IA en la nube.**

---

## Funcionalidades

### 🔍 Analizar
- Pega cualquier error (stack trace, error de compilación, excepción en tiempo de ejecución)
- Elige tu nivel: **Novato**, **Medio** o **Experto**
- Obtén: qué pasó, cómo solucionarlo, términos clave y código corregido
- Código con resaltado de sintaxis y copia con un clic

### 💬 Preguntar / Chat
- Tras analizar, pulsa **"Preguntar sobre esto"** para abrir una conversación sobre ese error concreto
- El contexto se precarga — no tienes que volver a explicar el problema
- Conversación multi-turno completa impulsada por tu proveedor de IA elegido

### 📖 Guía (Bóveda)
- Guarda cualquier análisis en tu bóveda personal
- Busca por tipo de error o lenguaje
- Layout maestro-detalle — navega tu historial sin perder el contexto
- Pregunta a la IA sobre cualquier entrada guardada

### 📊 Patrones
- Ve tus errores y lenguajes más frecuentes de un vistazo
- Identifica problemas recurrentes antes de que se conviertan en hábitos
- Las estadísticas se actualizan automáticamente a medida que crece tu bóveda

### ⚙️ Configuración
- Elige entre **6 proveedores de IA** — incluyendo tiers gratuitos
- Las API keys se guardan de forma segura en el **llavero del SO** (Administrador de credenciales de Windows / Keychain de macOS / GNOME Keyring en Linux)
- Las claves nunca se escriben en disco en texto plano

---

## Proveedores de IA

| Proveedor | Modelos gratuitos | Requiere clave |
|---|---|---|
| **Groq** | Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B, Gemma 2 9B | Sí (gratis en groq.com) |
| **OpenRouter** | Llama 3.3 70B, Gemma 3 27B, Mistral 7B | Sí (gratis en openrouter.ai) |
| **Ollama** | Cualquier modelo que tengas instalado localmente | No |
| **Anthropic** | — | Sí (de pago) |
| **OpenAI** | — | Sí (de pago) |
| **VeniceAI** | — | Sí |

**Para empezar gratis:** crea una cuenta en [console.groq.com](https://console.groq.com) → API Keys → Create Key → pégala en la Config de Debuggle.

---

## Primeros pasos

### Requisitos previos
- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io) 9+

### Instalar y ejecutar

```bash
git clone https://github.com/D4vRAM369/debuggle.git
cd debuggle
pnpm install
pnpm dev
```

### Ejecutar tests

```bash
pnpm test
```

### Generar instalador

```bash
pnpm build
pnpm pack:all
```

Resultados en `release/`:

| Plataforma | Formato | Notas |
|---|---|---|
| Windows | `.exe` (NSIS) | Instalador estándar |
| Windows | `.msi` | Instalador orientado a entornos empresariales |
| Windows | `.portable` | Ejecutable sin instalación |
| macOS | `.dmg` + `.zip` | x64 + Apple Silicon (arm64) |
| Linux | `.AppImage` | Universal, sin instalación |
| Linux | `.deb` | Ubuntu, Debian, Linux Mint |
| Linux | `.rpm` | Fedora, openSUSE, RHEL |
| Linux | `.flatpak` | Sandboxed, todas las distros — requiere `flatpak-builder` |

> **Notas para compilar en Linux:**
> - `.deb` requiere `fakeroot` → `sudo apt install fakeroot`
> - `.rpm` requiere `rpm-build` → `sudo dnf install rpm-build`
> - `.flatpak` requiere `flatpak-builder` + runtime `org.freedesktop.Platform//23.08`

---

## Estructura del proyecto

```
debuggle/
├── electron/
│   ├── main.ts          # Proceso principal: handlers IPC, vault (I/O de archivos), llavero
│   └── preload.ts       # Puente de contexto: expone window.api al renderer
├── src/
│   ├── pages/           # AnalyzePage, ChatPage, VaultPage, PatternsPage, ConfigPage
│   ├── components/      # AppShell, CodeBlock, componentes shadcn/ui
│   ├── lib/             # ai.ts, chat.ts, providers.ts, stats.ts, analyze.ts
│   ├── types/           # api.d.ts — declaraciones de tipos para window.api
│   └── test/            # Tests unitarios con Vitest
├── docs/
│   ├── plans/           # Plan de implementación
│   └── pbl/             # Notas de aprendizaje basado en proyectos (estudio personal)
└── package.json
```

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Shell de escritorio | Electron 33 |
| Sistema de build | electron-vite |
| Framework UI | React 18 + TypeScript |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| IA (multi-proveedor) | openai SDK + @anthropic-ai/sdk |
| Almacenamiento vault | Archivos Markdown con frontmatter YAML (gray-matter) |
| Almacenamiento seguro de claves | keytar (llavero del SO) |
| Tests | Vitest |

---

## Hoja de ruta

- [ ] Exportar bóveda a PDF / markdown
- [ ] OCR — pegar una captura de pantalla de un error
- [ ] Bóveda de equipo con base de conocimiento compartida
- [ ] Sugerencias de aprendizaje basadas en patrones
- [ ] Sistema de plugins para proveedores personalizados

---

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue antes de enviar un PR grande para que podamos discutir el enfoque.

Para bugs: incluye el tipo de error, tu SO y los pasos para reproducirlo.

---

## Licencia

Debuggle se distribuye bajo la **Business Source License 1.1 (BUSL-1.1)**. Uso personal y no comercial gratuito. El uso comercial requiere licencia separada.


Para **licencias comerciales**, contacta: d4vram369@proton.me

Consulta [LICENSE](LICENSE) para el texto completo.

---

## Agradecimientos

Construido con [Claude Code](https://claude.ai/claude-code) de Anthropic y GPT-5.3-Codex.
