# 📋 Análisis Profesional del Proyecto Vibrant + Plan de Implementación AI

**Fecha:** 6 de Febrero, 2026  
**Autor:** Análisis de Arquitectura de Software  
**Proyecto:** Vibrant CLI Linter

---

## 🎯 Resumen Ejecutivo

**Tu idea es EXCELENTE y muy viable.** Vibrant tiene una arquitectura sólida y bien pensada que facilita la adición de features AI. La estrategia de tener una versión gratuita con reglas básicas + una versión `--ai` premium es un modelo de negocio probado (similar a GitHub Copilot, Cursor, etc.).

**Potencial del proyecto:**
- ✅ Problema real: Detectar código generado por IA que puede tener issues sutiles
- ✅ Arquitectura limpia y extensible
- ✅ Tecnología moderna (Bun, TypeScript)
- ✅ Buen UX con múltiples formatos de salida
- ✅ Modelo de monetización claro

---

## 📊 Estado Actual del Proyecto

### Estructura General
```
vibrant/
├── apps/
│   ├── cli/              # El linter principal (tu producto core)
│   │   ├── src/
│   │   │   ├── linter/   # Motor de análisis
│   │   │   │   ├── rules/      # Reglas individuales (3 actualmente)
│   │   │   │   ├── parser.ts   # Parser de código TypeScript
│   │   │   │   ├── runner.ts   # Ejecutor de reglas
│   │   │   │   └── types.ts    # Tipos del sistema
│   │   │   ├── utils/
│   │   │   │   └── config.ts   # Configuración (no usado aún)
│   │   │   ├── bin.ts     # Entry point del CLI
│   │   │   ├── cli.ts     # Definición de comandos
│   │   │   ├── glob.ts    # Búsqueda de archivos
│   │   │   └── runner.ts  # Orquestador principal
│   │   └── package.json
│   └── web/              # Landing page (placeholder)
└── package.json          # Workspace config
```

### Cómo Funciona Actualmente

**Flujo de ejecución:**
```
Usuario ejecuta: vibrant .
    ↓
CLI parsea argumentos (cli.ts)
    ↓
Runner busca archivos TS/JS (glob.ts)
    ↓
Para cada archivo:
    ↓
    Parser crea AST con TypeScript Compiler API
    ↓
    Se ejecutan las 3 reglas:
        1. generic-comment      → Detecta // TODO: implement
        2. generic-variable-name → Detecta variables como "data", "temp"
        3. no-explicit-any      → Detecta uso de "any"
    ↓
    Colecta diagnósticos (errores/warnings/info)
    ↓
Formatea salida (pretty/json/compact)
    ↓
Imprime resultados en terminal
```

### Reglas Actuales (Versión Free)

#### 1. `generic-comment`
**Archivo:** `apps/cli/src/linter/rules/generic-comment.ts`

**Qué detecta:**
```typescript
// ❌ Detecta estos patrones:
// TODO: implement
// FIX: this
// Fix this
/* TODO: implement this later */
```

**Por qué es importante:**
Los LLMs (GPT, Claude) suelen dejar comentarios genéricos cuando no saben exactamente qué implementar.

**Output ejemplo:**
```
⚠ warning 15:3 Comentario genérico tipo "vibecode": "// TODO: implement..."
    💡 Reemplaza por un comentario concreto que describa qué hacer o por qué.
```

---

#### 2. `generic-variable-name`
**Archivo:** `apps/cli/src/linter/rules/generic-variable-name.ts`

**Qué detecta:**
```typescript
// ❌ Nombres muy genéricos:
const data = await fetch(...);
const result = calculate();
const temp = x;
const value = y;
const item = list[0];
const obj = {};
const arr = [];
const response = await api();
```

**Por qué es importante:**
Los LLMs tienden a usar nombres super genéricos porque no conocen el contexto de dominio de tu app.

**Output ejemplo:**
```
ℹ info 23:7 Nombre de variable muy genérico "data"
    💡 Considera un nombre más descriptivo para este ámbito.
```

---

#### 3. `no-explicit-any`
**Archivo:** `apps/cli/src/linter/rules/no-explicit-any.ts`

**Qué detecta:**
```typescript
// ❌ Uso explícito de any:
function process(data: any) { ... }
const result: any = await fetch();
```

**Por qué es importante:**
Los LLMs usan `any` cuando no están seguros del tipo, perdiendo type safety.

**Output ejemplo:**
```
⚠ warning 42:15 Uso explícito de `any`
    💡 Usa un tipo más específico o `unknown` si el tipo es realmente desconocido.
```

---

## 💡 Tu Idea: Versión AI con --ai Flag

### Concepto
```bash
# Versión FREE (reglas básicas)
$ vibrant .

# Versión AI (análisis profundo con LLM)
$ vibrant . --ai
```

### Por Qué Es Brillante

1. **Democratización:** La versión free ayuda a todos
2. **Upsell Natural:** Los usuarios ven valor y quieren más
3. **Costo Variable:** Solo pagas API cuando el usuario lo usa
4. **Diferenciación:** No solo patterns estáticos, sino análisis semántico real

### Modelo de Negocio Sugerido

**Opción 1: BYOK (Bring Your Own Key)**
```bash
# Usuario provee su API key
$ export OPENAI_API_KEY=sk-...
$ vibrant . --ai
```
- Pro: Sin costo para ti
- Pro: Sin billing complejo
- Con: Fricción para el usuario

**Opción 2: Créditos Propios**
```bash
# Usuario se registra y compra créditos
$ vibrant login
$ vibrant . --ai  # Consume tus créditos
```
- Pro: Mejor UX
- Pro: Puedes agregar markup
- Con: Requiere backend + billing

**Recomendación:** Empieza con BYOK (más simple), luego agrega créditos propios.

---

## 🔧 Plan de Implementación Técnica

### Fase 1: Arquitectura Base AI (1-2 semanas)

#### Paso 1.1: Crear Servicio AI
**Crear:** `apps/cli/src/ai/service.ts`

```typescript
// Abstracción para múltiples providers
export interface AIProvider {
  name: 'openai' | 'anthropic';
  analyze(code: string, context: AnalysisContext): Promise<AIAnalysis>;
}

export interface AnalysisContext {
  filePath: string;
  fileContent: string;
  existingDiagnostics: Diagnostic[];
  projectContext?: string;
}

export interface AIAnalysis {
  confidence: number; // 0-1 que tan seguro está que es AI-generated
  issues: AIIssue[];
  suggestions: string[];
}

export interface AIIssue {
  type: 'semantic' | 'pattern' | 'best-practice' | 'security';
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  explanation: string; // Por qué es un problema
  suggestedFix?: string; // Código corregido
  confidence: number; // Confianza en este issue específico
}

export class AIService {
  private provider: AIProvider;

  constructor(apiKey: string, providerType: 'openai' | 'anthropic') {
    this.provider = this.createProvider(apiKey, providerType);
  }

  private createProvider(apiKey: string, type: 'openai' | 'anthropic'): AIProvider {
    if (type === 'openai') {
      return new OpenAIProvider(apiKey);
    } else {
      return new AnthropicProvider(apiKey);
    }
  }

  async analyzeFile(context: AnalysisContext): Promise<AIAnalysis> {
    return await this.provider.analyze(context.fileContent, context);
  }
}
```

**Por qué esta estructura:**
- **Abstracción:** Soporta OpenAI y Claude con la misma interfaz
- **Extensible:** Fácil agregar más providers (Gemini, Llama, etc.)
- **Type-safe:** Todo con TypeScript

---

#### Paso 1.2: Implementar Provider OpenAI
**Crear:** `apps/cli/src/ai/providers/openai.ts`

```typescript
import OpenAI from 'openai';
import type { AIProvider, AnalysisContext, AIAnalysis } from '../service.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyze(code: string, context: AnalysisContext): Promise<AIAnalysis> {
    const prompt = this.buildPrompt(code, context);
    
    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview', // O gpt-4o
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }, // Structured output
      temperature: 0.3 // Más determinista
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return this.parseResponse(result);
  }

  private buildPrompt(code: string, context: AnalysisContext): string {
    return `
Analiza este código TypeScript/JavaScript y detecta si fue generado por IA.

Archivo: ${context.filePath}

Código:
\`\`\`typescript
${code}
\`\`\`

Issues ya detectados por reglas estáticas:
${JSON.stringify(context.existingDiagnostics, null, 2)}

Tareas:
1. Determina la probabilidad (0-1) de que este código fue generado por IA
2. Encuentra problemas SEMÁNTICOS que las reglas estáticas no detectan:
   - Lógica correcta sintácticamente pero incorrecta semánticamente
   - Nombres de variables técnicamente válidos pero sin sentido de dominio
   - Patrones que "huelen" a código generado (ej: exceso de abstracciones)
   - Comentarios que no aportan valor
   - Código innecesariamente complejo
3. Sugerencias concretas de mejora CON ejemplos de código

Responde en JSON con esta estructura:
{
  "confidence": 0.85,
  "issues": [
    {
      "type": "semantic",
      "severity": "warning",
      "line": 10,
      "column": 5,
      "message": "Nombre de variable no refleja el dominio del negocio",
      "explanation": "...",
      "suggestedFix": "const userProfile = ...",
      "confidence": 0.9
    }
  ],
  "suggestions": [
    "Considera usar nombres más específicos del dominio",
    "Simplifica la lógica de validación"
  ]
}
`;
  }

  private parseResponse(result: any): AIAnalysis {
    // Validación y parsing del response
    return {
      confidence: result.confidence,
      issues: result.issues,
      suggestions: result.suggestions
    };
  }
}

const SYSTEM_PROMPT = `
Eres un experto en detección de código generado por IA y análisis de calidad de código.
Tu trabajo es identificar patrones sutiles que indican que el código fue generado por un LLM.

Características comunes de código AI-generated:
- Nombres genéricos (data, result, temp, value)
- Comentarios obvios que no agregan información
- Exceso de try-catch sin manejo específico
- Lógica correcta pero sin contexto de dominio
- Abstracciones innecesarias
- Código excesivamente "perfecto" o estilizado
- Falta de edge cases específicos del dominio

Tu análisis debe ser:
- Preciso: Solo reporta problemas reales
- Contextual: Entiende el propósito del código
- Accionable: Da sugerencias concretas con ejemplos
- Educativo: Explica POR QUÉ es un problema
`;
```

**Por qué este approach:**
- **Structured Output:** JSON parsing confiable con `response_format`
- **Baja temperatura:** Análisis más consistente (menos creativo)
- **Contexto rico:** Le pasamos las reglas estáticas para evitar duplicados
- **System prompt claro:** Define exactamente qué buscar

---

#### Paso 1.3: Implementar Provider Anthropic (Claude)
**Crear:** `apps/cli/src/ai/providers/anthropic.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AnalysisContext, AIAnalysis } from '../service.js';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic' as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(code: string, context: AnalysisContext): Promise<AIAnalysis> {
    const prompt = this.buildPrompt(code, context);
    
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Último modelo
      max_tokens: 4096,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Claude puede devolver múltiples content blocks
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extraer JSON del response (Claude a veces lo envuelve en markdown)
    const jsonMatch = textContent.text.match(/```json\n([\s\S]*?)\n```/) || 
                      textContent.text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }

    const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    return this.parseResponse(result);
  }

  private buildPrompt(code: string, context: AnalysisContext): string {
    // Similar al de OpenAI, pero optimizado para Claude
    return `
<task>
Analiza este código para determinar si fue generado por IA y encuentra problemas semánticos.
</task>

<file>
Path: ${context.filePath}

\`\`\`typescript
${code}
\`\`\`
</file>

<existing_issues>
${JSON.stringify(context.existingDiagnostics, null, 2)}
</existing_issues>

<instructions>
1. Calcula la probabilidad (0-1) de que este código fue generado por IA
2. Identifica problemas SEMÁNTICOS que las reglas estáticas no pueden detectar
3. Proporciona sugerencias concretas con ejemplos de código

Enfócate en:
- Lógica correcta sintácticamente pero incorrecta para el dominio
- Nombres válidos pero sin sentido contextual
- Patrones típicos de LLMs (abstracciones excesivas, comentarios obvios)
- Manejo de errores genérico
- Falta de casos edge específicos del problema
</instructions>

<output_format>
Responde SOLO con un objeto JSON válido (sin markdown):
{
  "confidence": 0.85,
  "issues": [
    {
      "type": "semantic",
      "severity": "warning",
      "line": 10,
      "column": 5,
      "message": "...",
      "explanation": "...",
      "suggestedFix": "...",
      "confidence": 0.9
    }
  ],
  "suggestions": [
    "...",
    "..."
  ]
}
</output_format>
`;
  }

  private parseResponse(result: any): AIAnalysis {
    return {
      confidence: result.confidence,
      issues: result.issues,
      suggestions: result.suggestions
    };
  }
}

const SYSTEM_PROMPT = `
Eres un experto senior en análisis de código y detección de patrones de código generado por IA.

Tu tarea es realizar un análisis profundo y contextual del código, identificando:
1. Probabilidad de que fue generado por un LLM
2. Problemas semánticos que no son detectables por análisis estático
3. Mejoras concretas y accionables

Características de código AI-generated:
- Nombres técnicamente correctos pero sin contexto de dominio
- Comentarios que explican lo obvio
- Lógica genérica que funciona pero no es específica del problema
- Exceso de abstracción sin necesidad real
- Try-catch blocks genéricos sin manejo específico
- Falta de validaciones específicas del dominio
- Código "demasiado perfecto" sin consideraciones prácticas

Sé preciso, contextual y educativo en tus recomendaciones.
`;
```

**Diferencias con OpenAI:**
- Claude usa XML-style prompts (más efectivo para Claude)
- Parsing más robusto (Claude a veces envuelve JSON en markdown)
- Modelo más reciente (sonnet-3.5)

---

#### Paso 1.4: Actualizar CLI para Soportar --ai
**Modificar:** `apps/cli/src/cli.ts`

```typescript
import { Command } from "commander";
import { lintCommand } from "./commands/lint.js";
import { rulesCommand } from "./commands/rules.js";
import { initCommand } from "./commands/init.js";

const program = new Command();

program
  .name("vibrant")
  .description("Linter para detectar código vibecodeado (AI-generated)")
  .version("0.2.0");

// Comando principal de linting
program
  .command("lint")
  .description("Analiza archivos en busca de código vibecodeado")
  .argument("[path]", "Ruta a analizar", ".")
  .option("-f, --format <type>", "Formato de salida: pretty, json, compact", "pretty")
  .option("--ignore <patterns>", "Patrones a ignorar (separados por coma)", "")
  .option("--ai", "🤖 Habilita análisis profundo con IA", false) // NUEVA OPCIÓN
  .option("--ai-provider <provider>", "Provider de IA: openai, anthropic", "openai")
  .action(lintCommand);

// Comando para listar reglas
program
  .command("rules")
  .description("Lista todas las reglas disponibles")
  .option("--ai", "Incluye información sobre análisis AI")
  .action(rulesCommand);

// Comando para inicializar configuración
program
  .command("init")
  .description("Crea un archivo de configuración vibrant.config.js")
  .action(initCommand);

export default program;
```

---

#### Paso 1.5: Modificar el Runner para Soportar AI
**Modificar:** `apps/cli/src/commands/lint.ts` (crear si no existe)

```typescript
import { AIService } from "../ai/service.js";
import { lint } from "../runner.js";
import pc from "picocolors";

interface LintOptions {
  format: "pretty" | "json" | "compact";
  ignore: string;
  ai: boolean;
  aiProvider: "openai" | "anthropic";
}

export async function lintCommand(path: string, options: LintOptions) {
  let aiService: AIService | undefined;

  // Si --ai está activado, configurar el servicio
  if (options.ai) {
    const apiKey = getAPIKey(options.aiProvider);
    
    if (!apiKey) {
      console.error(pc.red("\n❌ Error: API Key no encontrada"));
      console.error(pc.yellow("\nPara usar --ai, configura tu API key:"));
      
      if (options.aiProvider === "openai") {
        console.error(pc.cyan("  export OPENAI_API_KEY=sk-..."));
      } else {
        console.error(pc.cyan("  export ANTHROPIC_API_KEY=sk-ant-..."));
      }
      
      console.error(pc.dim("\nO crea un archivo .env con:"));
      console.error(pc.cyan(`  ${options.aiProvider.toUpperCase()}_API_KEY=...`));
      process.exit(1);
    }

    console.log(pc.green(`\n🤖 Análisis AI habilitado (${options.aiProvider})`));
    console.log(pc.dim("Esto consumirá créditos de tu API key\n"));

    aiService = new AIService(apiKey, options.aiProvider);
  }

  // Ejecutar el linting
  const result = await lint(path, {
    format: options.format,
    ignore: options.ignore ? options.ignore.split(",") : [],
    aiService, // Pasar el servicio AI si está disponible
  });

  // Manejar exit code
  if (result.issues.length > 0) {
    process.exit(1);
  }
}

function getAPIKey(provider: "openai" | "anthropic"): string | undefined {
  const envVar = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  
  // Primero intentar desde env
  let apiKey = process.env[envVar];
  
  // Si no está, intentar desde .env file
  if (!apiKey) {
    try {
      // Bun tiene soporte nativo para .env
      apiKey = Bun.env[envVar];
    } catch {
      // Silently fail
    }
  }
  
  return apiKey;
}
```

---

#### Paso 1.6: Integrar AI en el Runner Principal
**Modificar:** `apps/cli/src/runner.ts`

```typescript
import { lintFile } from "./linter/runner.js";
import { globFiles } from "./glob.js";
import type { LinterOptions, LinterResult } from "./types.js";
import type { AIService } from "./ai/service.js";
import pc from "picocolors";

interface ExtendedLinterOptions extends LinterOptions {
  aiService?: AIService;
}

export async function lint(
  path: string,
  options: ExtendedLinterOptions
): Promise<LinterResult> {
  const startTime = Date.now();
  
  // Buscar archivos
  const files = await globFiles(path, options.ignore || []);
  
  if (files.length === 0) {
    console.log(pc.yellow("No se encontraron archivos para analizar"));
    return {
      issues: [],
      filesAnalyzed: 0,
      filesWithIssues: 0,
      duration: Date.now() - startTime,
    };
  }

  console.log(pc.dim(`Analizando ${files.length} archivos...\n`));

  // Analizar cada archivo
  const allIssues = [];
  let filesWithIssues = 0;

  for (const file of files) {
    // 1. Ejecutar reglas estáticas (siempre)
    const staticDiagnostics = await lintFile(file);
    
    // 2. Si hay AI service, ejecutar análisis AI
    let aiDiagnostics = [];
    if (options.aiService) {
      try {
        const fileContent = await Bun.file(file).text();
        
        const aiAnalysis = await options.aiService.analyzeFile({
          filePath: file,
          fileContent,
          existingDiagnostics: staticDiagnostics,
        });

        // Convertir AIIssue a Diagnostic
        aiDiagnostics = aiAnalysis.issues.map(issue => ({
          file,
          line: issue.line,
          column: issue.column,
          message: issue.message,
          severity: issue.severity,
          ruleId: `ai:${issue.type}`,
          suggestion: issue.suggestedFix,
          explanation: issue.explanation,
          confidence: issue.confidence,
        }));

        // Agregar el confidence score general como metadata
        if (aiAnalysis.confidence > 0.7) {
          aiDiagnostics.unshift({
            file,
            line: 1,
            column: 1,
            message: `Este archivo tiene ${Math.round(aiAnalysis.confidence * 100)}% de probabilidad de ser código AI-generated`,
            severity: "info",
            ruleId: "ai:confidence",
            confidence: aiAnalysis.confidence,
          });
        }

      } catch (error) {
        console.error(pc.red(`Error al analizar ${file} con AI:`), error);
      }
    }

    // Combinar diagnósticos
    const allDiagnostics = [...staticDiagnostics, ...aiDiagnostics];
    
    if (allDiagnostics.length > 0) {
      filesWithIssues++;
      allIssues.push(...allDiagnostics);
    }

    // Progress indicator
    if (options.format === "pretty") {
      process.stdout.write(pc.dim("."));
    }
  }

  if (options.format === "pretty") {
    process.stdout.write("\n\n");
  }

  // Formatear y mostrar resultados
  formatOutput(allIssues, options.format);

  const duration = Date.now() - startTime;
  printSummary(files.length, filesWithIssues, allIssues.length, duration);

  return {
    issues: allIssues,
    filesAnalyzed: files.length,
    filesWithIssues,
    duration,
  };
}

function formatOutput(issues: any[], format: string) {
  if (format === "json") {
    console.log(JSON.stringify(issues, null, 2));
  } else if (format === "compact") {
    for (const issue of issues) {
      console.log(
        `${issue.file}:${issue.line}:${issue.column} ${issue.severity} ${issue.message}`
      );
    }
  } else {
    // Pretty format
    const byFile = groupByFile(issues);
    
    for (const [file, fileIssues] of Object.entries(byFile)) {
      console.log(pc.bold(pc.cyan(file)));
      
      for (const issue of fileIssues as any[]) {
        const icon = getSeverityIcon(issue.severity);
        const color = getSeverityColor(issue.severity);
        
        console.log(
          `  ${color(icon)} ${issue.severity} ${pc.dim(`${issue.line}:${issue.column}`)} ${issue.message}`
        );
        
        if (issue.confidence) {
          console.log(
            pc.dim(`      Confianza: ${Math.round(issue.confidence * 100)}%`)
          );
        }
        
        if (issue.explanation) {
          console.log(pc.dim(`      ${issue.explanation}`));
        }
        
        if (issue.suggestion) {
          console.log(pc.green(`      💡 ${issue.suggestion}`));
        }
      }
      
      console.log(); // Blank line
    }
  }
}

function groupByFile(issues: any[]): Record<string, any[]> {
  return issues.reduce((acc, issue) => {
    if (!acc[issue.file]) {
      acc[issue.file] = [];
    }
    acc[issue.file].push(issue);
    return acc;
  }, {});
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "error": return "❌";
    case "warning": return "⚠️";
    case "info": return "ℹ️";
    default: return "•";
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "error": return pc.red;
    case "warning": return pc.yellow;
    case "info": return pc.blue;
    default: return pc.white;
  }
}

function printSummary(total: number, withIssues: number, issueCount: number, duration: number) {
  console.log(pc.bold("\n📊 Resumen:"));
  console.log(`  Archivos analizados: ${total}`);
  console.log(`  Archivos con issues: ${withIssues}`);
  console.log(`  Total de issues: ${issueCount}`);
  console.log(pc.dim(`  Tiempo: ${duration}ms`));
}
```

---

#### Paso 1.7: Actualizar Tipos
**Modificar:** `apps/cli/src/types.ts`

```typescript
import type { AIService } from "./ai/service.js";

export interface LintIssue {
  ruleId: string;
  message: string;
  severity: "error" | "warning" | "info";
  line: number;
  column: number;
  file: string;
  suggestion?: string;
  explanation?: string; // NUEVO: para explicaciones AI
  confidence?: number;  // NUEVO: confianza del AI (0-1)
}

export interface LinterOptions {
  path: string;
  format?: "pretty" | "json" | "compact";
  ignore?: string[];
  aiService?: AIService; // NUEVO
}

export interface LinterResult {
  issues: LintIssue[];
  filesAnalyzed: number;
  filesWithIssues: number;
  duration: number;
}
```

---

### Fase 2: Testing y Refinamiento (1 semana)

#### Paso 2.1: Tests Unitarios
**Crear:** `apps/cli/src/ai/__tests__/service.test.ts`

```typescript
import { test, expect, mock } from "bun:test";
import { AIService } from "../service.js";
import type { AnalysisContext } from "../service.js";

test("AIService - OpenAI provider", async () => {
  const mockAnalyze = mock(() => Promise.resolve({
    confidence: 0.85,
    issues: [],
    suggestions: ["Use más específicos nombres"]
  }));

  const service = new AIService("test-key", "openai");
  // @ts-ignore - override for testing
  service.provider.analyze = mockAnalyze;

  const context: AnalysisContext = {
    filePath: "test.ts",
    fileContent: "const data = 123;",
    existingDiagnostics: []
  };

  const result = await service.analyzeFile(context);
  
  expect(result.confidence).toBe(0.85);
  expect(mockAnalyze).toHaveBeenCalledTimes(1);
});

test("AIService - handles API errors gracefully", async () => {
  const service = new AIService("invalid-key", "openai");
  
  const context: AnalysisContext = {
    filePath: "test.ts",
    fileContent: "const x = 1;",
    existingDiagnostics: []
  };

  await expect(service.analyzeFile(context)).rejects.toThrow();
});
```

#### Paso 2.2: Integration Tests
**Crear:** `apps/cli/src/__tests__/integration.test.ts`

```typescript
import { test, expect } from "bun:test";
import { $ } from "bun";

test("CLI - basic linting works", async () => {
  const result = await $`bun run cli . --format json`.text();
  const parsed = JSON.parse(result);
  
  expect(Array.isArray(parsed)).toBe(true);
});

test("CLI - --ai requires API key", async () => {
  // Remover la key temporalmente
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  
  const proc = Bun.spawn(["bun", "run", "cli", ".", "--ai"]);
  const exitCode = await proc.exited;
  
  expect(exitCode).toBe(1);
  
  // Restaurar
  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  }
});
```

---

### Fase 3: Features Avanzadas (2-3 semanas)

#### Feature 3.1: Caching de Análisis AI
**Crear:** `apps/cli/src/ai/cache.ts`

```typescript
import { createHash } from "crypto";

export class AICache {
  private cache: Map<string, any> = new Map();
  private maxSize = 100; // Máximo 100 archivos en caché

  getCacheKey(fileContent: string): string {
    return createHash("sha256").update(fileContent).digest("hex");
  }

  get(fileContent: string): any | undefined {
    const key = this.getCacheKey(fileContent);
    return this.cache.get(key);
  }

  set(fileContent: string, analysis: any): void {
    const key = this.getCacheKey(fileContent);
    
    // Si el caché está lleno, borrar el más viejo
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, analysis);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

**Por qué:**
- Reduce costos de API (no re-analizar archivos sin cambios)
- Mejora performance en CI/CD

**Uso:**
```typescript
// En AIService
private cache = new AICache();

async analyzeFile(context: AnalysisContext): Promise<AIAnalysis> {
  const cached = this.cache.get(context.fileContent);
  if (cached) {
    return cached;
  }
  
  const result = await this.provider.analyze(context.fileContent, context);
  this.cache.set(context.fileContent, result);
  
  return result;
}
```

---

#### Feature 3.2: Auto-fix con AI
**Crear:** `apps/cli/src/commands/fix.ts`

```typescript
import { AIService } from "../ai/service.js";
import { globFiles } from "../glob.js";
import pc from "picocolors";

interface FixOptions {
  aiProvider: "openai" | "anthropic";
  dryRun: boolean;
}

export async function fixCommand(path: string, options: FixOptions) {
  const apiKey = getAPIKey(options.aiProvider);
  
  if (!apiKey) {
    console.error(pc.red("❌ API key requerida para auto-fix"));
    process.exit(1);
  }

  const aiService = new AIService(apiKey, options.aiProvider);
  const files = await globFiles(path, []);

  console.log(pc.green(`🔧 Auto-fixing ${files.length} archivos...\n`));

  for (const file of files) {
    const content = await Bun.file(file).text();
    
    const analysis = await aiService.analyzeFile({
      filePath: file,
      fileContent: content,
      existingDiagnostics: []
    });

    const fixes = analysis.issues
      .filter(issue => issue.suggestedFix)
      .sort((a, b) => b.line - a.line); // Aplicar de abajo hacia arriba

    if (fixes.length === 0) {
      console.log(pc.dim(`  ${file} - No fixes needed`));
      continue;
    }

    let fixedContent = content;
    const lines = content.split('\n');

    for (const fix of fixes) {
      // Aplicar el fix (simplificado, necesita lógica más robusta)
      lines[fix.line - 1] = fix.suggestedFix!;
    }

    fixedContent = lines.join('\n');

    if (options.dryRun) {
      console.log(pc.yellow(`  ${file} - Would apply ${fixes.length} fixes`));
    } else {
      await Bun.write(file, fixedContent);
      console.log(pc.green(`  ${file} - Applied ${fixes.length} fixes`));
    }
  }
}
```

**Agregar a CLI:**
```typescript
program
  .command("fix")
  .description("🔧 Auto-fix issues usando IA")
  .argument("[path]", "Ruta a analizar", ".")
  .option("--ai-provider <provider>", "Provider: openai, anthropic", "openai")
  .option("--dry-run", "Mostrar cambios sin aplicarlos", false)
  .action(fixCommand);
```

---

#### Feature 3.3: Análisis Incremental
**Crear:** `apps/cli/src/utils/git-diff.ts`

```typescript
import { $ } from "bun";

export async function getChangedFiles(): Promise<string[]> {
  try {
    // Archivos cambiados respecto a HEAD
    const result = await $`git diff --name-only HEAD`.text();
    
    // Archivos staged
    const staged = await $`git diff --cached --name-only`.text();
    
    const files = [...result.split('\n'), ...staged.split('\n')]
      .filter(f => f && (f.endsWith('.ts') || f.endsWith('.js')))
      .filter((f, i, arr) => arr.indexOf(f) === i); // Únicos
    
    return files;
  } catch {
    return [];
  }
}
```

**Agregar opción al CLI:**
```typescript
program
  .command("lint")
  // ... opciones existentes
  .option("--changed-only", "Analizar solo archivos modificados (Git)", false)
  .action(lintCommand);
```

**En el comando:**
```typescript
export async function lintCommand(path: string, options: LintOptions) {
  let files;
  
  if (options.changedOnly) {
    files = await getChangedFiles();
    if (files.length === 0) {
      console.log(pc.green("✅ No hay archivos modificados"));
      return;
    }
  } else {
    files = await globFiles(path, options.ignore);
  }
  
  // ... resto del código
}
```

**Por qué:**
- En repos grandes, analizar todo con AI es costoso
- `--changed-only` solo analiza lo modificado
- Perfecto para pre-commit hooks

---

### Fase 4: Monetización (1-2 semanas)

#### Feature 4.1: Sistema de Créditos Propio (Opcional)
**Crear:** Backend con servicio proxy

```typescript
// Backend: apps/api/src/proxy.ts
import express from "express";
import OpenAI from "openai";
import { verifyToken } from "./auth.js";
import { deductCredits } from "./billing.js";

const app = express();

app.post("/api/analyze", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  const user = await verifyToken(token);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Verificar créditos
  if (user.credits < 1) {
    return res.status(402).json({ error: "Insufficient credits" });
  }

  // Hacer el request a OpenAI/Claude
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await client.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: req.body.messages,
    response_format: { type: "json_object" }
  });

  // Deducir créditos
  await deductCredits(user.id, 1);

  res.json(response);
});
```

**CLI actualizado:**
```typescript
// Si usa tu servicio
if (process.env.VIBRANT_TOKEN) {
  const response = await fetch("https://api.vibrant.dev/analyze", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.VIBRANT_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages: [...] })
  });
  
  const result = await response.json();
}
```

---

## 🎓 Guía para Junior Devs: Cómo Implementar Esto

### Paso a Paso para Empezar

#### 1. Setup del Proyecto
```bash
cd C:\Users\FrancoGalfre\Desktop\vibrant

# Instalar dependencias AI
cd apps/cli
bun add openai @anthropic-ai/sdk

# Instalar tipos
bun add -d @types/node
```

#### 2. Crear Estructura de Carpetas
```bash
cd apps/cli/src
mkdir -p ai/providers
mkdir -p ai/__tests__
mkdir -p commands
```

#### 3. Implementar Providers (Uno por Uno)

**Empieza con OpenAI (más simple):**
1. Crea `ai/service.ts` con las interfaces
2. Crea `ai/providers/openai.ts`
3. Testea manualmente con un script:

```typescript
// test-ai.ts
import { OpenAIProvider } from "./ai/providers/openai.js";

const provider = new OpenAIProvider(process.env.OPENAI_API_KEY!);

const result = await provider.analyze(`
const data = fetchUser();
// TODO: implement this
function process(x: any) {
  return x;
}
`, {
  filePath: "test.ts",
  fileContent: "...",
  existingDiagnostics: []
});

console.log(JSON.stringify(result, null, 2));
```

Ejecuta:
```bash
export OPENAI_API_KEY=sk-...
bun run test-ai.ts
```

**Verifica que:**
- El response sea JSON válido
- `confidence` esté entre 0 y 1
- `issues` sea un array
- Cada issue tenga `line`, `column`, `message`

#### 4. Integrar en CLI (Incremental)

**4.1: Primero solo detectar la flag:**
```typescript
// En cli.ts
.option("--ai", "Enable AI analysis")
.action(async (path, options) => {
  if (options.ai) {
    console.log("AI mode enabled!");
  }
  // ... resto
});
```

Testea:
```bash
bun run cli . --ai
# Debería imprimir "AI mode enabled!"
```

**4.2: Agregar validación de API key:**
```typescript
if (options.ai) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }
  console.log("AI mode enabled with key:", apiKey.slice(0, 10) + "...");
}
```

**4.3: Crear instancia de AIService:**
```typescript
let aiService;
if (options.ai) {
  const apiKey = process.env.OPENAI_API_KEY!;
  aiService = new AIService(apiKey, "openai");
  console.log("AI service initialized");
}
```

**4.4: Pasar al runner:**
```typescript
const result = await lint(path, {
  format: options.format,
  ignore: options.ignore.split(","),
  aiService // Pasar aquí
});
```

**4.5: En el runner, analizar un archivo:**
```typescript
// En runner.ts
if (options.aiService) {
  console.log(`Analyzing ${file} with AI...`);
  
  const content = await Bun.file(file).text();
  const analysis = await options.aiService.analyzeFile({
    filePath: file,
    fileContent: content,
    existingDiagnostics: []
  });
  
  console.log("AI found:", analysis.issues.length, "issues");
}
```

#### 5. Testing Progresivo

**Test 1: Archivo simple**
```bash
# Crea un archivo de prueba
echo 'const data = 123; // TODO: implement' > test-ai.ts

# Analiza con AI
bun run cli test-ai.ts --ai --format pretty
```

**Debería mostrar:**
- Issues de reglas estáticas (generic-variable-name, generic-comment)
- Issues de AI (semantic issues)
- Confidence score

**Test 2: Proyecto real**
```bash
bun run cli apps/cli/src --ai
```

**Test 3: Performance**
```bash
time bun run cli . --ai
# Mide cuánto tarda
```

#### 6. Debugging Tips

**Si el AI no responde:**
1. Verifica la API key: `echo $OPENAI_API_KEY`
2. Prueba la key directamente:
```typescript
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const test = await openai.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [{ role: "user", content: "Test" }]
});
console.log(test.choices[0].message.content);
```

**Si el parsing falla:**
1. Imprime el response crudo:
```typescript
console.log("Raw response:", response.choices[0].message.content);
```
2. Verifica que sea JSON válido
3. Ajusta el prompt para pedir JSON más explícitamente

**Si es muy lento:**
1. Usa caché (ver Feature 3.1)
2. Reduce el tamaño del prompt
3. Usa modelos más rápidos (gpt-3.5-turbo)

---

## 💰 Estrategia de Monetización Recomendada

### Fase 1: BYOK (Bring Your Own Key) - Lanzamiento
```
Usuarios traen su propia API key de OpenAI/Claude
```

**Ventajas:**
- Zero overhead de billing
- Zero costos de infraestructura
- Focus en producto
- Valida la demanda

**Precio:** GRATIS (open source con flag --ai)

**Objetivo:** Conseguir primeros 100-1000 usuarios

---

### Fase 2: Freemium con Créditos - Crecimiento
```
- Free: 10 análisis AI/mes
- Pro: $9/mes - 500 análisis
- Team: $49/mes - 5000 análisis
```

**Ventajas:**
- Predictibilidad de ingresos
- Mejor UX (no necesitan API keys)
- Puedes agregar markup a los costos de API

**Desventajas:**
- Necesitas backend
- Necesitas billing (Stripe)
- Necesitas gestionar keys de API

**Objetivo:** $10k MRR (Monthly Recurring Revenue)

---

### Fase 3: Enterprise - Escala
```
- Self-hosted con licencia
- Soporte dedicado
- Custom rules con AI
- SLA garantizado
```

**Precio:** $500-5000/mes según tamaño

**Objetivo:** Grandes empresas

---

## 🚀 Roadmap Sugerido

### Q1 2026 (Ahora - Marzo)
- ✅ [DONE] Architecture AI base
- [ ] Implementar OpenAI provider
- [ ] Testing básico
- [ ] Lanzar en Product Hunt / Reddit
- [ ] Conseguir primeros 100 usuarios

### Q2 2026 (Abril - Junio)
- [ ] Agregar Claude provider
- [ ] Implementar caching
- [ ] Agregar 10 reglas estáticas más
- [ ] Auto-fix con AI
- [ ] 1000 usuarios activos

### Q3 2026 (Julio - Septiembre)
- [ ] Backend para créditos propios
- [ ] Sistema de billing con Stripe
- [ ] Landing page profesional
- [ ] Documentation completa
- [ ] Lanzar plan Pro

### Q4 2026 (Octubre - Diciembre)
- [ ] CI/CD integrations (GitHub Actions, GitLab CI)
- [ ] IDE extensions (VSCode, WebStorm)
- [ ] Team features
- [ ] $10k MRR

---

## 📚 Recursos para Aprender

### TypeScript Compiler API
- Docs oficiales: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
- Tutorial: https://ts-ast-viewer.com (visualiza ASTs)
- Libro: "TypeScript Deep Dive" (gratis)

### AI APIs
- OpenAI Docs: https://platform.openai.com/docs
- Anthropic Docs: https://docs.anthropic.com
- Prompt Engineering Guide: https://www.promptingguide.ai

### CLI Development
- Commander.js: https://github.com/tj/commander.js
- Ink (React for CLIs): https://github.com/vadimdemedes/ink
- Bun Guide: https://bun.sh/guides

### Testing
- Bun Test: https://bun.sh/docs/cli/test
- Vitest (alternativa): https://vitest.dev

---

## ⚠️ Posibles Problemas y Soluciones

### Problema 1: Costos de API se disparan
**Síntomas:** Facturas altas de OpenAI/Claude

**Soluciones:**
1. Implementar rate limiting (máximo N requests por minuto)
2. Caché agresivo (ver Feature 3.1)
3. Usar modelos más baratos (gpt-3.5-turbo en lugar de gpt-4)
4. Solo analizar archivos modificados (--changed-only)
5. Limitar tamaño de archivos (máx 500 líneas con AI)

### Problema 2: AI da false positives
**Síntomas:** Reporta código bueno como "AI-generated"

**Soluciones:**
1. Ajustar el prompt para ser más conservador
2. Subir el threshold de confidence (solo reportar si > 0.8)
3. Permitir que usuarios den feedback (👍👎)
4. Fine-tune del modelo con ejemplos

### Problema 3: Muy lento
**Síntomas:** Tarda minutos en analizar un proyecto

**Soluciones:**
1. Análisis paralelo (Promise.all en lugar de bucle secuencial)
2. Streaming de responses (OpenAI/Claude soportan streaming)
3. Caché
4. Batch API (analizar múltiples archivos en un solo request)

### Problema 4: Users no ponen la API key correctamente
**Síntomas:** Errores de autenticación

**Soluciones:**
1. Comando para validar key: `vibrant test-ai`
2. Mensajes de error claros y accionables
3. Link a tutorial de cómo conseguir key
4. .env template con ejemplo

---

## 🎯 Next Steps (Por Orden de Prioridad)

### 1. Implementar Provider OpenAI (1-2 días)
- Crear `ai/service.ts` con interfaces
- Implementar `ai/providers/openai.ts`
- Test manual con script

### 2. Integrar en CLI (1 día)
- Agregar flag `--ai`
- Validar API key
- Pasar AIService al runner

### 3. Modificar Runner (1 día)
- Llamar a AI para archivos
- Combinar diagnósticos estáticos + AI
- Formatear output

### 4. Testing Básico (1 día)
- Crear casos de test
- Validar que funciona end-to-end
- Fix bugs

### 5. Documentation (1 día)
- Actualizar README con --ai flag
- Tutorial de cómo conseguir API key
- Ejemplos de uso

### 6. Launch (1 día)
- Tweet sobre el lanzamiento
- Post en Reddit /r/programming, /r/typescript
- Post en Hacker News
- Product Hunt

---

## 📝 Checklist de Implementación

```markdown
## Fase 1: AI Core
- [ ] Instalar dependencias (openai, @anthropic-ai/sdk)
- [ ] Crear estructura de carpetas (ai/, ai/providers/)
- [ ] Implementar interfaces en ai/service.ts
- [ ] Implementar OpenAIProvider
- [ ] Test manual del provider
- [ ] Implementar AnthropicProvider
- [ ] Test manual del provider

## Fase 2: CLI Integration
- [ ] Agregar flag --ai al comando lint
- [ ] Agregar opción --ai-provider
- [ ] Implementar validación de API key
- [ ] Crear AIService instance en CLI
- [ ] Pasar AIService al runner
- [ ] Modificar runner para usar AI
- [ ] Actualizar formatters para mostrar AI issues

## Fase 3: Testing
- [ ] Unit tests para AIService
- [ ] Integration tests para CLI
- [ ] Test con archivo simple
- [ ] Test con proyecto real
- [ ] Performance testing
- [ ] Fix bugs encontrados

## Fase 4: Documentation
- [ ] Actualizar README.md
- [ ] Crear CONTRIBUTING.md
- [ ] Tutorial: Getting Started with --ai
- [ ] Tutorial: Getting API Keys
- [ ] Ejemplos de uso
- [ ] FAQ

## Fase 5: Launch
- [ ] Build final
- [ ] Publish a npm
- [ ] Crear landing page
- [ ] Post en Twitter
- [ ] Post en Reddit
- [ ] Post en Hacker News
- [ ] Submit a Product Hunt
```

---

## 🧠 Conclusión

Tu idea de Vibrant con `--ai` flag es **sólida y comercialmente viable**. Tienes:

1. ✅ **Problema real:** Detectar código AI-generated es cada vez más importante
2. ✅ **Arquitectura sólida:** Tu código está bien estructurado y es extensible
3. ✅ **Modelo de negocio claro:** Freemium -> Pro -> Enterprise
4. ✅ **Tecnología moderna:** Bun + TypeScript + AI APIs
5. ✅ **Timing perfecto:** El uso de AI para código está explotando

**Mi recomendación:**

1. Implementa la versión BYOK (Bring Your Own Key) AHORA
2. Lánzala en 1-2 semanas
3. Consigue feedback de usuarios reales
4. Itera basado en feedback
5. Una vez que tengas tracción (100-1000 usuarios), construye el backend para créditos propios

**No intentes hacer todo perfecto desde el inicio.** Lanza rápido, aprende rápido, itera rápido.

---

## 📞 Siguientes Pasos

¿Quieres que te ayude a:

1. **Implementar el código paso a paso?** Puedo escribir cada archivo contigo
2. **Revisar tu código actual?** Puedo hacer un code review detallado
3. **Diseñar la arquitectura del backend?** Para cuando quieras agregar créditos propios
4. **Escribir los tests?** Puedo ayudarte con testing
5. **Crear la landing page?** Puedo diseñar y desarrollar el sitio web

**Solo dime qué parte quieres tacklear primero y arrancamos. 🚀**

---

*Documento generado: 6 de Febrero, 2026*  
*Próxima revisión: Después de implementar Fase 1*
