# Vibrant - AI Code Detection CLI

## Project Context (Optimized for Token Efficiency)

**Type:** TypeScript CLI Monorepo  
**Runtime:** Bun  
**Build:** Turbo  
**Purpose:** Detect AI-generated code patterns before production

## Architecture

```
apps/cli/src/
├── bin.ts              # Entry point
├── cli.ts              # Commander setup
├── core/               # Linting engine
│   ├── linter.ts       # Main linter (TS AST)
│   ├── types.ts        # All types/interfaces
│   ├── parser.ts       # File parsing
│   └── glob.ts         # File discovery
├── ai/                 # AI integration
│   ├── prompts.ts      # Detection prompts
│   ├── provider.ts     # Provider abstraction
│   └── schemas.ts      # Zod validation
├── rules/              # Static analysis rules
│   ├── index.ts        # Rule registry
│   └── *.ts            # 9 detection rules
└── commands/           # CLI commands
    ├── lint.ts
    ├── rules.ts
    └── init.ts
```

## Key Patterns

### 1. Rule System
Rules implement `RuleModule` interface:
- `meta`: Rule metadata (type, docs, messages)
- `create(context)`: Returns `RuleListener` with AST handlers

### 2. AI Provider Pattern
Abstracted via `AIProvider` interface:
- `analyze(files)` → returns structured issues
- Supports: OpenAI, Claude, Gemini, Ollama
- Uses Zod schemas for response validation

### 3. Linting Flow
```
Files → Parser → Linter → Rules → Diagnostics → Formatter
```

## Static Rules (9 total)

| Rule | Detects |
|------|---------|
| no-explicit-any | TypeScript `any` usage |
| console-log-debugging | Leftover console statements |
| generic-variable-name | Vague names (data, result, temp) |
| magic-numbers | Unexplained numeric literals |
| unimplemented-error | `throw new Error("Not implemented")` |
| empty-function-body | Placeholder functions |
| hardcoded-credentials | Potential secrets |
| generic-comment | TODO/FIXME comments |
| empty-catch-block | Silent error swallowing |

## AI-Powered Detection

When `--ai` flag used, LLM analyzes for:
- Incomplete error handling
- Placeholder implementations  
- Missing validation
- Copy-paste patterns
- Over-engineering
- Type assertions without guards

## Configuration

**Files:** `vibrant.config.js` or `package.json`  
**Env:** `.env` for API keys  
**Cache:** `.vibrant/context-cache.json` (auto-generated)

## Development Commands

```bash
bun run dev:cli     # Run CLI in dev mode
bun run build       # Build all apps
bun run cli -- .    # Run linter on current dir
```

## Token Optimization (Automatic)

The system now includes **automatic token optimization**:

1. **Code Summarizer** - Sends function signatures instead of full code (~67% savings)
2. **Incremental Analysis** - Only analyzes changed files on subsequent runs
3. **Smart Chunking** - Splits large files automatically
4. **Compact Prompts** - Ultra-short prompts (~80% smaller)

**Result:** 70-85% token reduction without any configuration!

**Cache:** `.vibrant/analysis-cache.json` (auto-generated, stores file hashes only)

## Critical Implementation Details

1. **Linter uses TypeScript AST** - No ESLint dependency
2. **RuleContext** provides fixer API for auto-fixes
3. **Provider detection** via environment variables
4. **File filtering** via glob patterns with ignore support
5. **Output formats:** pretty (default), json, plan

## When Working With This Codebase

1. Check `context-cache.json` for structure overview
2. Rules live in `apps/cli/src/rules/`
3. AI prompts in `apps/cli/src/ai/prompts.ts`
4. Core types in `apps/cli/src/core/types.ts`
5. Run `bun run cli -- .` to test changes