# 🚀 Vibrant AI - Plan de Implementación con Vercel AI SDK

**Fecha:** 6 de Febrero, 2026  
**Stack:** Vercel AI SDK + Programación Funcional + Multi-Provider  
**Filosofía:** Simple, Modular, Extensible

---

## 🎯 Por Qué Vercel AI SDK

### Ventajas vs SDKs Nativos

**Antes (SDKs individuales):**

```typescript
// Instalar 3-4 SDKs diferentes
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Cada uno con su propia API
const openai = new OpenAI({ apiKey: "..." });
const anthropic = new Anthropic({ apiKey: "..." });
const gemini = new GoogleGenerativeAI("...");
```

**Ahora (Vercel AI SDK):**

```typescript
// Un solo SDK para todos
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { ollama } from "ollama-ai-provider";

// Interfaz unificada
const result = await generateText({
  model: openai("gpt-4-turbo"),
  prompt: "...",
});
```

### Beneficios Clave

✅ **Interfaz Unificada:** Todos los providers usan la misma API  
✅ **Type-safe:** TypeScript first con tipos completos  
✅ **Structured Output:** JSON mode nativo con Zod  
✅ **Streaming:** Built-in support para todos  
✅ **Retry Logic:** Manejo automático de errores  
✅ **Token Counting:** Tracking de uso automático  
✅ **Menor Código:** ~50% menos código que SDKs nativos

---

## 📊 Arquitectura con AI SDK

### Flujo de Datos

```
CLI Input (vibrant . --ai)
    ↓
lintCommand(path, options)
    ↓
discoverFiles(path) → string[]
    ↓
Para cada archivo:
    ↓
    analyzeWithStaticRules(file) → Diagnostic[]
    ↓
    analyzeWithAI(file, providerModel) → Diagnostic[]
        ↓
        generateObject({
          model: openai("gpt-4-turbo"),
          schema: AIAnalysisSchema,
          prompt: buildPrompt(code, context)
        })
    ↓
formatOutput(diagnostics, format)
    ↓
    ├─ pretty → Console con colores
    ├─ json → Structured JSON
    ├─ compact → Una línea por issue
    └─ plan → vibrant-plan.md (para otras IAs)
    ↓
exit(hasErrors ? 1 : 0)
```

---

## 🔧 Implementación: Estructura del Proyecto

```
apps/cli/src/
├── ai/
│   ├── types.ts              # Tipos + Zod schemas
│   ├── models.ts             # Model configs por provider
│   ├── analyzer.ts           # analyzeWithAI() usando AI SDK
│   ├── prompts.ts            # Prompt templates
│   └── cache.ts              # File-based cache
├── linter/
│   ├── rules/                # Reglas estáticas
│   ├── parser.ts
│   ├── runner.ts
│   └── types.ts
├── formatters/
│   ├── pretty.ts
│   ├── json.ts
│   ├── compact.ts
│   └── plan.ts               # Markdown generator
├── utils/
│   ├── config.ts
│   ├── git.ts
│   └── env.ts
├── commands/
│   ├── lint.ts
│   ├── rules.ts
│   └── init.ts
├── cli.ts
├── bin.ts
└── types.ts
```

---

## 💻 Código: Implementación con AI SDK

### Paso 1: Instalación

```bash
cd apps/cli

# Instalar AI SDK y providers
bun add ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google ollama-ai-provider

# Instalar Zod para schemas
bun add zod
```

### Paso 2: Tipos con Zod Schemas

**Archivo:** `apps/cli/src/ai/types.ts`

```typescript
import { z } from "zod";

// Providers disponibles
export type AIProvider = "openai" | "anthropic" | "google" | "ollama";

// Zod Schema para AIIssue
export const AIIssueSchema = z.object({
  type: z.enum(["semantic", "pattern", "best-practice", "security"]),
  severity: z.enum(["error", "warning", "info"]),
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  message: z.string().min(1),
  explanation: z.string().min(1),
  suggestion: z.string().min(1),
  confidence: z.number().min(0).max(1),
  codeSnippet: z.string().optional(),
});

// Zod Schema para AIAnalysis (response del LLM)
export const AIAnalysisSchema = z.object({
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  issues: z.array(AIIssueSchema),
  suggestions: z.array(z.string()),
});

// TypeScript types derivados de Zod
export type AIIssue = z.infer<typeof AIIssueSchema>;
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

// Context para análisis
export type AnalysisContext = {
  readonly filePath: string;
  readonly fileContent: string;
  readonly existingDiagnostics: ReadonlyArray<any>;
};
```

**Ventaja de Zod:**

- ✅ Validación automática del response del LLM
- ✅ Type-safety completo
- ✅ AI SDK usa Zod para structured output

---

### Paso 3: Models Configuration

**Archivo:** `apps/cli/src/ai/models.ts`

```typescript
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { ollama } from "ollama-ai-provider";
import type { AIProvider } from "./types.js";

export type ModelConfig = {
  model: any; // AI SDK LanguageModel
  provider: AIProvider;
  displayName: string;
  cost: "free" | "low" | "medium" | "high";
};

export const getModel = (
  provider: AIProvider,
  customModel?: string,
): ModelConfig => {
  switch (provider) {
    case "openai":
      return {
        model: openai(customModel || process.env.OPENAI_MODEL || "gpt-4-turbo"),
        provider: "openai",
        displayName: "OpenAI GPT-4",
        cost: "high",
      };

    case "anthropic":
      return {
        model: anthropic(
          customModel ||
            process.env.ANTHROPIC_MODEL ||
            "claude-3-5-sonnet-20241022",
        ),
        provider: "anthropic",
        displayName: "Anthropic Claude",
        cost: "medium",
      };

    case "google":
      return {
        model: google(
          customModel || process.env.GOOGLE_MODEL || "gemini-1.5-pro",
        ),
        provider: "google",
        displayName: "Google Gemini",
        cost: "free", // Free tier generoso
      };

    case "ollama":
      return {
        model: ollama(customModel || process.env.OLLAMA_MODEL || "llama3.1"),
        provider: "ollama",
        displayName: "Ollama (Local)",
        cost: "free", // 100% local
      };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
};

export const validateAPIKey = (provider: AIProvider): void => {
  const keyMap = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_GENERATIVE_AI_API_KEY",
    ollama: null, // No requiere API key
  };

  const envVar = keyMap[provider];

  if (envVar) {
    const key = process.env[envVar] || Bun.env[envVar];

    if (!key) {
      throw new Error(
        `❌ ${envVar} no encontrada.\n\n` +
          `Exporta la variable:\n` +
          `  export ${envVar}=your-key\n\n` +
          `O agrégala a .env:\n` +
          `  ${envVar}=your-key`,
      );
    }
  }
};
```

**Por qué esta estructura:**

- Configuración centralizada de modelos
- Fácil cambiar modelos con env vars
- Info útil (costo, nombre) para mostrar al usuario

---

### Paso 4: Prompts

**Archivo:** `apps/cli/src/ai/prompts.ts`

```typescript
import type { AnalysisContext } from "./types.js";

export const SYSTEM_PROMPT = `Eres un experto en análisis de código y detección de código generado por IA.

Tu trabajo es identificar:
1. Probabilidad de que el código fue generado por un LLM (0-1)
2. Problemas SEMÁNTICOS que no son detectables por análisis estático
3. Patrones típicos de código AI-generated

Características de código AI-generated:
- Nombres técnicamente correctos pero sin contexto de dominio
- Comentarios obvios que no aportan información
- Lógica genérica que funciona pero no es específica
- Exceso de abstracción innecesaria
- Try-catch genéricos sin manejo específico
- Falta de validaciones de dominio
- Código "perfecto" sin consideraciones prácticas
- Edge cases no contemplados

IMPORTANTE:
- Solo reporta problemas REALES, no inventes
- Sé específico: di exactamente qué línea y por qué
- Da sugerencias ACCIONABLES con ejemplos
- Explica el razonamiento pedagógicamente

Tu respuesta será validada contra un schema estricto.`;

export const buildPrompt = (code: string, context: AnalysisContext): string => {
  const { filePath, existingDiagnostics } = context;

  return `Analiza este archivo TypeScript/JavaScript:

Archivo: ${filePath}

Código:
\`\`\`typescript
${code}
\`\`\`

Issues ya detectados por reglas estáticas:
${JSON.stringify(existingDiagnostics, null, 2)}

Tareas:
1. Calcula confidence (0-1) de que es AI-generated
2. Encuentra problemas SEMÁNTICOS que las reglas estáticas NO detectan
3. Proporciona sugerencias concretas con ejemplos de código

IMPORTANTE: No repitas los issues estáticos. Busca problemas NUEVOS de semántica, lógica, y calidad.

Responde con un objeto JSON que contenga:
- confidence: número entre 0 y 1
- reasoning: string explicando por qué crees que es AI-generated
- issues: array de objetos con type, severity, line, column, message, explanation, suggestion, confidence
- suggestions: array de strings con mejoras generales`;
};
```

---

### Paso 5: Analyzer con AI SDK 🔥

**Archivo:** `apps/cli/src/ai/analyzer.ts`

```typescript
import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import type { AIAnalysis, AnalysisContext } from "./types.js";
import { AIAnalysisSchema } from "./types.js";
import { SYSTEM_PROMPT, buildPrompt } from "./prompts.js";
import { getCachedAnalysis, cacheAnalysis } from "./cache.js";
import type { Diagnostic } from "../types.js";

export const analyzeWithAI = async (
  filePath: string,
  fileContent: string,
  existingDiagnostics: ReadonlyArray<Diagnostic>,
  model: LanguageModel,
): Promise<ReadonlyArray<Diagnostic>> => {
  try {
    // Intentar caché primero
    const cached = getCachedAnalysis(fileContent);
    if (cached) {
      return convertAIAnalysisToDiagnostics(filePath, cached);
    }

    // Crear contexto
    const context: AnalysisContext = {
      filePath,
      fileContent,
      existingDiagnostics,
    };

    // Llamar al AI SDK con structured output
    const { object: analysis } = await generateObject({
      model,
      schema: AIAnalysisSchema,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(fileContent, context),
      temperature: 0.3,
      maxTokens: 4096,
    });

    // Cachear resultado
    cacheAnalysis(fileContent, analysis);

    // Convertir a Diagnostics
    return convertAIAnalysisToDiagnostics(filePath, analysis);
  } catch (error) {
    console.error(`Error analizando ${filePath} con AI:`, error);

    // Si es error de API key, re-throw
    if (error instanceof Error && error.message.includes("API")) {
      throw error;
    }

    // Para otros errores, retornar array vacío
    return [];
  }
};

const convertAIAnalysisToDiagnostics = (
  filePath: string,
  analysis: AIAnalysis,
): ReadonlyArray<Diagnostic> => {
  const diagnostics: Diagnostic[] = [];

  // Agregar confidence score si es alto
  if (analysis.confidence > 0.7) {
    diagnostics.push({
      file: filePath,
      line: 1,
      column: 1,
      severity: "info",
      ruleId: "ai:confidence-score",
      message: `Este archivo tiene ${Math.round(analysis.confidence * 100)}% de probabilidad de ser código AI-generated`,
      explanation: analysis.reasoning,
      confidence: analysis.confidence,
    });
  }

  // Convertir cada AIIssue a Diagnostic
  for (const issue of analysis.issues) {
    diagnostics.push({
      file: filePath,
      line: issue.line,
      column: issue.column,
      severity: issue.severity,
      ruleId: `ai:${issue.type}`,
      message: issue.message,
      explanation: issue.explanation,
      suggestion: issue.suggestion,
      confidence: issue.confidence,
      codeSnippet: issue.codeSnippet,
    });
  }

  return diagnostics;
};
```

**🔥 Ventajas del AI SDK:**

1. **Una sola función:** `generateObject()` para todos los providers
2. **Structured output automático:** Usa Zod schema, garantiza JSON válido
3. **Validación built-in:** Si el LLM devuelve algo inválido, AI SDK lo reintenta
4. **Retry logic:** Manejo automático de errores transitorios
5. **Type-safe:** El resultado ya está tipado correctamente

**Antes (sin AI SDK):**

```typescript
// 50+ líneas de código por provider
const response = await openai.chat.completions.create({...});
const content = response.choices[0].message.content;
const parsed = JSON.parse(content); // ❌ Puede fallar
const validated = AIAnalysisSchema.parse(parsed); // Validación manual
```

**Ahora (con AI SDK):**

```typescript
// 3 líneas
const { object: analysis } = await generateObject({
  model,
  schema,
  prompt,
}); // ✅ Validado automáticamente
```

---

### Paso 6: Cache (mismo que antes)

**Archivo:** `apps/cli/src/ai/cache.ts`

```typescript
import { createHash } from "crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";
import type { AIAnalysis } from "./types.js";

const CACHE_DIR = join(process.cwd(), ".vibrant-cache");
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export const getCachedAnalysis = (fileContent: string): AIAnalysis | null => {
  try {
    const hash = hashContent(fileContent);
    const cachePath = getCachePath(hash);

    if (!existsSync(cachePath)) {
      return null;
    }

    const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
    const age = Date.now() - cached.timestamp;

    if (age > MAX_AGE_MS) {
      return null;
    }

    return cached.analysis;
  } catch {
    return null;
  }
};

export const cacheAnalysis = (
  fileContent: string,
  analysis: AIAnalysis,
): void => {
  try {
    ensureCacheDir();
    const hash = hashContent(fileContent);
    const cachePath = getCachePath(hash);

    const data = {
      timestamp: Date.now(),
      analysis,
    };

    writeFileSync(cachePath, JSON.stringify(data), "utf-8");
  } catch (error) {
    console.warn("Warning: No se pudo cachear el análisis");
  }
};

export const clearCache = (): void => {
  try {
    if (existsSync(CACHE_DIR)) {
      const files = readdirSync(CACHE_DIR);
      for (const file of files) {
        unlinkSync(join(CACHE_DIR, file));
      }
      console.log("✅ Cache limpiado");
    }
  } catch (error) {
    console.error("Error limpiando caché:", error);
  }
};

export const getCacheStats = (): { files: number; size: number } => {
  try {
    if (!existsSync(CACHE_DIR)) {
      return { files: 0, size: 0 };
    }

    const files = readdirSync(CACHE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const stat = fs.statSync(join(CACHE_DIR, file));
      totalSize += stat.size;
    }

    return {
      files: files.length,
      size: totalSize,
    };
  } catch {
    return { files: 0, size: 0 };
  }
};

const hashContent = (content: string): string => {
  return createHash("sha256").update(content).digest("hex");
};

const getCachePath = (hash: string): string => {
  return join(CACHE_DIR, `${hash}.json`);
};

const ensureCacheDir = (): void => {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
};
```

---

### Paso 7: CLI Command

**Archivo:** `apps/cli/src/commands/lint.ts`

```typescript
import pc from "picocolors";
import { globFiles } from "../glob.js";
import { analyzeWithStaticRules } from "../linter/runner.js";
import { analyzeWithAI } from "../ai/analyzer.js";
import { getModel, validateAPIKey } from "../ai/models.js";
import { formatPretty } from "../formatters/pretty.js";
import { formatJSON } from "../formatters/json.js";
import { formatCompact } from "../formatters/compact.js";
import { formatPlan } from "../formatters/plan.js";
import { getChangedFiles } from "../utils/git.js";
import type { Diagnostic } from "../types.js";
import type { AIProvider } from "../ai/types.js";

type CommandOptions = {
  format: "pretty" | "json" | "compact" | "plan";
  ignore: string;
  ai: boolean;
  aiProvider: AIProvider;
  aiModel?: string;
  changedOnly: boolean;
  cache: boolean;
};

export const lintCommand = async (
  path: string,
  options: CommandOptions,
): Promise<void> => {
  const startTime = Date.now();

  try {
    // Descubrir archivos
    const files = options.changedOnly
      ? await getChangedFiles()
      : await globFiles(path, parseIgnorePatterns(options.ignore));

    if (files.length === 0) {
      console.log(
        pc.yellow("\n⚠️  No se encontraron archivos para analizar\n"),
      );
      process.exit(0);
    }

    // Configurar AI si está habilitado
    let aiModel = null;
    if (options.ai) {
      try {
        // Validar API key (throw si falta)
        validateAPIKey(options.aiProvider);

        // Obtener modelo configurado
        const modelConfig = getModel(options.aiProvider, options.aiModel);
        aiModel = modelConfig.model;

        // Mostrar info
        console.log(pc.green(`\n🤖 Análisis AI habilitado`));
        console.log(pc.dim(`   Provider: ${modelConfig.displayName}`));
        console.log(
          pc.dim(
            `   Costo: ${modelConfig.cost === "free" ? "GRATIS" : modelConfig.cost}`,
          ),
        );

        if (options.aiProvider === "ollama") {
          console.log(pc.dim(`   Corriendo localmente 🏠`));
        }

        console.log();
      } catch (error) {
        console.error(pc.red("\n❌ Error configurando AI:"));
        console.error(
          pc.yellow(error instanceof Error ? error.message : String(error)),
        );
        process.exit(1);
      }
    }

    // Analizar archivos
    console.log(pc.dim(`📂 Analizando ${files.length} archivos...\n`));

    const allDiagnostics: Diagnostic[] = [];
    let aiAnalyzedCount = 0;

    for (const file of files) {
      // 1. Análisis estático (siempre)
      const staticDiagnostics = await analyzeWithStaticRules(file);
      allDiagnostics.push(...staticDiagnostics);

      // 2. Análisis AI (opcional)
      if (aiModel) {
        try {
          const fileContent = await Bun.file(file).text();
          const aiDiagnostics = await analyzeWithAI(
            file,
            fileContent,
            staticDiagnostics,
            aiModel,
          );
          allDiagnostics.push(...aiDiagnostics);
          aiAnalyzedCount++;
        } catch (error) {
          console.error(pc.red(`\n❌ Error analizando ${file}:`), error);
        }
      }

      // Progress
      if (options.format === "pretty") {
        process.stdout.write(pc.dim("."));
      }
    }

    if (options.format === "pretty") {
      process.stdout.write("\n\n");
    }

    // Formatear output
    switch (options.format) {
      case "json":
        formatJSON(allDiagnostics, files.length, aiAnalyzedCount);
        break;
      case "compact":
        formatCompact(allDiagnostics);
        break;
      case "plan":
        formatPlan(allDiagnostics);
        break;
      case "pretty":
      default:
        formatPretty(allDiagnostics);
        break;
    }

    // Summary
    const duration = Date.now() - startTime;
    printSummary(files.length, allDiagnostics, aiAnalyzedCount, duration);

    // Exit code
    const hasErrors = allDiagnostics.some((d) => d.severity === "error");
    process.exit(hasErrors ? 1 : 0);
  } catch (error) {
    console.error(pc.red("\n❌ Error ejecutando análisis:"));
    console.error(error);
    process.exit(1);
  }
};

const parseIgnorePatterns = (ignore: string): string[] => {
  return ignore ? ignore.split(",").map((p) => p.trim()) : [];
};

const printSummary = (
  totalFiles: number,
  diagnostics: Diagnostic[],
  aiAnalyzed: number,
  duration: number,
): void => {
  const filesWithIssues = new Set(diagnostics.map((d) => d.file)).size;
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const info = diagnostics.filter((d) => d.severity === "info").length;

  console.log(pc.bold("\n📊 Resumen:\n"));
  console.log(`   Archivos analizados: ${totalFiles}`);

  if (aiAnalyzed > 0) {
    console.log(`   ${pc.cyan(`Archivos con AI:     ${aiAnalyzed}`)}`);
  }

  console.log(`   Archivos con issues: ${filesWithIssues}`);
  console.log();
  console.log(`   ${pc.red(`Errores:  ${errors}`)}`);
  console.log(`   ${pc.yellow(`Warnings: ${warnings}`)}`);
  console.log(`   ${pc.blue(`Info:     ${info}`)}`);
  console.log();
  console.log(pc.dim(`   Tiempo: ${duration}ms`));
  console.log();
};
```

---

### Paso 8: CLI Setup

**Archivo:** `apps/cli/src/cli.ts`

```typescript
import { Command } from "commander";
import { lintCommand } from "./commands/lint.js";
import { rulesCommand } from "./commands/rules.js";
import { initCommand } from "./commands/init.js";
import { clearCache, getCacheStats } from "./ai/cache.js";
import pc from "picocolors";

const program = new Command();

program
  .name("vibrant")
  .description("🎨 Linter CLI para detectar código vibecodeado (AI-generated)")
  .version("0.2.0");

program
  .command("lint")
  .alias("l")
  .description("Analiza archivos en busca de código vibecodeado")
  .argument("[path]", "Ruta a analizar", ".")
  .option(
    "-f, --format <type>",
    "Formato: pretty, json, compact, plan",
    "pretty",
  )
  .option("--ignore <patterns>", "Patrones a ignorar (separados por coma)", "")
  .option("--ai", "🤖 Habilita análisis profundo con IA")
  .option(
    "--ai-provider <provider>",
    "Provider: openai, anthropic, google, ollama",
    "openai",
  )
  .option("--ai-model <model>", "Modelo específico (ej: gpt-4o, claude-3-opus)")
  .option("--changed-only", "Solo analizar archivos modificados (Git)")
  .action(lintCommand);

program
  .command("rules")
  .description("Lista todas las reglas disponibles")
  .option("--ai", "Incluir información sobre análisis AI")
  .action(rulesCommand);

program
  .command("init")
  .description("Crea configuración inicial (vibrant.config.js)")
  .action(initCommand);

program
  .command("cache")
  .description("Gestionar caché de análisis AI")
  .option("--clear", "Limpiar caché completo")
  .option("--stats", "Mostrar estadísticas del caché")
  .action((options) => {
    if (options.clear) {
      clearCache();
    } else if (options.stats) {
      const stats = getCacheStats();
      console.log(pc.bold("\n📊 Estadísticas del Cache:\n"));
      console.log(`   Archivos: ${stats.files}`);
      console.log(`   Tamaño: ${(stats.size / 1024).toFixed(2)} KB\n`);
    } else {
      console.log(pc.yellow("Usa --clear o --stats"));
    }
  });

export default program;
```

---

### Paso 9: Formatters (mismo código que antes)

Los formatters no cambian, solo usan los `Diagnostic[]` que vienen del analyzer.

**Archivos:**

- `formatters/pretty.ts` - Output con colores
- `formatters/json.ts` - JSON estructurado
- `formatters/compact.ts` - Una línea por issue
- `formatters/plan.ts` - Markdown para otras IAs

(Código igual al documento anterior)

---

## 📦 Package.json

```json
{
  "name": "vibrant",
  "version": "0.2.0",
  "type": "module",
  "bin": {
    "vibrant": "./dist/bin.js"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "picocolors": "^1.0.0",
    "typescript": "^5.0.0",
    "ai": "^3.0.0",
    "@ai-sdk/openai": "^0.0.24",
    "@ai-sdk/anthropic": "^0.0.24",
    "@ai-sdk/google": "^0.0.24",
    "ollama-ai-provider": "^0.7.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^20.0.0"
  },
  "scripts": {
    "build": "bun build ./src/bin.ts --outdir ./dist --target bun --minify",
    "dev": "bun run ./src/bin.ts",
    "test": "bun test"
  }
}
```

---

## 🚀 Guía de Uso

### Instalación

```bash
cd vibrant/apps/cli

# Instalar dependencias
bun install

# Build
bun run build

# Instalar globalmente
bun install -g .
```

### Uso Básico

```bash
# Análisis estático (GRATIS)
vibrant .

# Con formato JSON
vibrant . --format json

# Solo archivos modificados
vibrant . --changed-only
```

### Uso con AI

**OpenAI (GPT-4):**

```bash
export OPENAI_API_KEY=sk-...
vibrant . --ai

# Con modelo específico
vibrant . --ai --ai-model gpt-4o
```

**Anthropic (Claude):**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
vibrant . --ai --ai-provider anthropic

# Claude Opus (más potente)
vibrant . --ai --ai-provider anthropic --ai-model claude-3-opus-20240229
```

**Google (Gemini) - GRATIS:**

```bash
export GOOGLE_GENERATIVE_AI_API_KEY=...
vibrant . --ai --ai-provider google
```

**Ollama (Local) - GRATIS:**

```bash
# Instalar Ollama
curl https://ollama.ai/install.sh | sh  # macOS/Linux
# O descargar de https://ollama.ai/download (Windows)

# Iniciar servidor
ollama serve

# Descargar modelo
ollama pull llama3.1

# Usar con Vibrant
vibrant . --ai --ai-provider ollama

# Con otro modelo
ollama pull codellama:13b
vibrant . --ai --ai-provider ollama --ai-model codellama:13b
```

### Generar Plan para IA Externa

```bash
# Analizar y generar plan
vibrant . --ai --format plan

# Esto crea: vibrant-plan.md
# Abre el archivo y copia el prompt del final
# Pégalo en Claude/ChatGPT para obtener los fixes
```

### CI/CD - GitHub Actions

**Archivo:** `.github/workflows/vibrant.yml`

```yaml
name: Vibrant Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install Vibrant
        run: |
          cd path/to/vibrant/apps/cli
          bun install
          bun run build
          bun link

      - name: Run Static Analysis
        run: vibrant . --format json > vibrant-results.json
        continue-on-error: true

      - name: Run AI Analysis (PRs only)
        if: github.event_name == 'pull_request'
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: vibrant . --ai --changed-only --format plan
        continue-on-error: true

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: vibrant-analysis
          path: |
            vibrant-results.json
            vibrant-plan.md

      - name: Fail if errors found
        run: |
          if [ $(jq '.summary.errors' vibrant-results.json) -gt 0 ]; then
            echo "❌ Errores encontrados"
            exit 1
          fi
```

### Pre-commit Hook (Husky)

```bash
# Instalar Husky
bun add -D husky
bunx husky init

# Crear hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
echo "🎨 Running Vibrant linter..."

vibrant . --changed-only --format compact

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Vibrant encontró issues. Por favor corrígelos antes de commitear."
  echo ""
  exit 1
fi

echo "✅ Vibrant check passed!"
EOF

chmod +x .husky/pre-commit
```

---

## 🧪 Testing

**Archivo:** `apps/cli/src/__tests__/ai-analyzer.test.ts`

```typescript
import { test, expect } from "bun:test";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { AIAnalysisSchema } from "../ai/types.js";
import { SYSTEM_PROMPT, buildPrompt } from "../ai/prompts.js";

test("AI SDK - structured output", async () => {
  const code = `
const data = fetchUser();
// TODO: implement this
function process(x: any) {
  return x;
}
`;

  const context = {
    filePath: "test.ts",
    fileContent: code,
    existingDiagnostics: [],
  };

  const { object: analysis } = await generateObject({
    model: openai("gpt-3.5-turbo"), // Más barato para tests
    schema: AIAnalysisSchema,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(code, context),
    temperature: 0.3,
  });

  // Validaciones
  expect(analysis.confidence).toBeGreaterThanOrEqual(0);
  expect(analysis.confidence).toBeLessThanOrEqual(1);
  expect(Array.isArray(analysis.issues)).toBe(true);
  expect(Array.isArray(analysis.suggestions)).toBe(true);

  // El schema Zod ya validó la estructura
  // Si llegamos aquí, el objeto es válido
});

test("AI SDK - mock provider", async () => {
  // Para tests sin API key, puedes mockear
  const mockProvider = {
    doGenerate: async () => ({
      text: JSON.stringify({
        confidence: 0.8,
        reasoning: "Test reasoning",
        issues: [],
        suggestions: ["Use better names"],
      }),
    }),
  };

  // Test con mock
  // ...
});
```

---

## 📊 Comparación: Con vs Sin AI SDK

### Código Necesario

**Sin AI SDK:**

```typescript
// ~300 líneas de código
// 4 archivos de providers
// Manejo manual de JSON parsing
// Validación manual con Zod
// Retry logic manual
// Error handling manual por provider
```

**Con AI SDK:**

```typescript
// ~100 líneas de código
// 1 archivo analyzer.ts
// JSON parsing automático
// Validación automática
// Retry built-in
// Error handling unificado
```

### Features Automáticos

| Feature        | Sin AI SDK               | Con AI SDK    |
| -------------- | ------------------------ | ------------- |
| JSON Mode      | Manual por provider      | ✅ Automático |
| Validación     | Manual con Zod           | ✅ Automático |
| Retry Logic    | Implementar manualmente  | ✅ Built-in   |
| Streaming      | Implementar por provider | ✅ Built-in   |
| Token Counting | Manual                   | ✅ Automático |
| Error Handling | Por provider             | ✅ Unificado  |
| Type Safety    | Parcial                  | ✅ Completo   |

### Ejemplo Real

**Sin AI SDK (OpenAI nativo):**

```typescript
const client = new OpenAI({ apiKey: "..." });

try {
  const response = await client.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error("Invalid JSON");
  }

  let validated;
  try {
    validated = AIAnalysisSchema.parse(parsed);
  } catch (e) {
    throw new Error("Schema validation failed");
  }

  return validated;
} catch (error) {
  // Manejar diferentes tipos de errores
  if (error.code === "rate_limit") {
    // Retry con backoff
  } else if (error.code === "invalid_api_key") {
    // ...
  }
  throw error;
}
```

**Con AI SDK:**

```typescript
const { object: analysis } = await generateObject({
  model: openai("gpt-4-turbo"),
  schema: AIAnalysisSchema,
  system: SYSTEM_PROMPT,
  prompt,
  temperature: 0.3,
});

// ✅ analysis ya está validado y tipado
return analysis;
```

---

## 💰 Comparación de Costos por Provider

### OpenAI

- **GPT-4 Turbo:** ~$0.01 por archivo (~1K tokens)
- **GPT-4o:** ~$0.005 por archivo
- **GPT-3.5 Turbo:** ~$0.001 por archivo

### Anthropic

- **Claude 3.5 Sonnet:** ~$0.003 por archivo
- **Claude 3 Haiku:** ~$0.001 por archivo

### Google Gemini

- **Gemini 1.5 Pro:** GRATIS hasta 50 req/día
- **Gemini 1.5 Flash:** GRATIS hasta 1500 req/día

### Ollama

- **Todos los modelos:** GRATIS (local)
- **Costo:** Solo electricidad (~$0.0001 por archivo)

### Recomendación

**Desarrollo:**

```bash
# Usa Ollama (gratis)
vibrant . --ai --ai-provider ollama
```

**CI/CD:**

```bash
# Usa Gemini (gratis con límites)
vibrant . --ai --ai-provider google --changed-only
```

**Producción (si tienes budget):**

```bash
# GPT-4o (balance precio/calidad)
vibrant . --ai --ai-provider openai --ai-model gpt-4o
```

---

## 🎯 Checklist de Implementación

```markdown
### Fase 1: Setup AI SDK (Semana 1)

- [ ] Instalar AI SDK y providers
- [ ] Crear tipos con Zod (ai/types.ts)
- [ ] Configurar modelos (ai/models.ts)
- [ ] Crear prompts (ai/prompts.ts)
- [ ] Implementar analyzer con generateObject (ai/analyzer.ts)
- [ ] Sistema de cache (ai/cache.ts)
- [ ] Tests básicos

### Fase 2: CLI Integration (Semana 1-2)

- [ ] Actualizar CLI con flags
- [ ] Comando lint con AI support
- [ ] Validación de API keys
- [ ] Error handling
- [ ] Progress indicators

### Fase 3: Formatters (Semana 2)

- [ ] Pretty formatter
- [ ] JSON formatter
- [ ] Compact formatter
- [ ] Plan formatter (markdown)

### Fase 4: Testing (Semana 2-3)

- [ ] Unit tests con AI SDK
- [ ] Integration tests
- [ ] Test con cada provider
- [ ] Test de cache
- [ ] Performance benchmarks

### Fase 5: Documentation (Semana 3)

- [ ] README completo
- [ ] Guía de providers
- [ ] CI/CD examples
- [ ] Troubleshooting
- [ ] Contributing guide

### Fase 6: Launch (Semana 4)

- [ ] Build y publish a npm
- [ ] Landing page
- [ ] Demo video/GIF
- [ ] Product Hunt
- [ ] Reddit/HN/Twitter
```

---

## 🚧 Troubleshooting

### Error: "API key not found"

```bash
# Verificar que la key está exportada
echo $OPENAI_API_KEY

# Si no está, exportar:
export OPENAI_API_KEY=sk-...

# O crear .env
cat > .env << EOF
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
EOF
```

### Error: "Schema validation failed"

Esto no debería pasar con AI SDK, pero si pasa:

```typescript
// Habilitar logs de debug
const { object, warnings } = await generateObject({
  model,
  schema,
  prompt,
  experimental_telemetry: { isEnabled: true },
});

console.log("Warnings:", warnings);
```

### Ollama no conecta

```bash
# Verificar que está corriendo
curl http://localhost:11434/api/tags

# Si no responde:
ollama serve &

# Verificar modelos
ollama list

# Descargar si falta
ollama pull llama3.1
```

### Rate limits

```bash
# Usa cache para reducir requests
vibrant . --ai  # Cache habilitado por defecto

# O usa Gemini (free tier generoso)
vibrant . --ai --ai-provider google
```

---

## 📝 Conclusión

### Ventajas del AI SDK

✅ **70% menos código** que SDKs nativos  
✅ **Type-safety completo** con Zod  
✅ **Structured output garantizado**  
✅ **Retry logic automático**  
✅ **Un SDK para todos los providers**  
✅ **Mantenido por Vercel** (updates constantes)  
✅ **Documentación excelente**

### Tu Stack Final

```
Vibrant CLI
    ↓
Vercel AI SDK (generateObject)
    ↓
Providers:
  ├─ OpenAI (premium)
  ├─ Anthropic (premium)
  ├─ Google Gemini (gratis)
  └─ Ollama (local, gratis)
    ↓
Zod Schemas (validación)
    ↓
Formatters:
  ├─ pretty (console)
  ├─ json (CI/CD)
  ├─ compact (grep-able)
  └─ plan (markdown para otras IAs)
```

### Next Steps

1. **Instala AI SDK:** `bun add ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google ollama-ai-provider zod`
2. **Copia los archivos:** Sigue el orden (types → models → analyzer → command)
3. **Testea con Ollama:** Más fácil para empezar (no requiere API key)
4. **Agrega otros providers:** OpenAI, Claude, Gemini
5. **Implementa formatters:** Especialmente `plan` (killer feature)
6. **Launch:** npm, Product Hunt, etc.

¿Empezamos a implementarlo? 🚀
