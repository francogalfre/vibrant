<div align="center">
  <img src="https://raw.githubusercontent.com/francogalfre/vibrant/main/assets/logo-512.png" alt="Vibrant Logo" width="120" height="120">
 
  <br />

  <h1 align="center">Vibrant CLI</h1>

  <p align="center">
    <strong>The AI-Powered Code Analyzer That Detects Vibecoding Patterns</strong>
    <br />
    Stop shipping AI-generated bugs. Catch hardcoded secrets, empty catch blocks, and suspicious patterns before they reach production.
  </p>

  <p align="center">
    <a href="https://www.npmjs.com/package/vibrant-cli">
      <img src="https://img.shields.io/npm/v/vibrant-cli.svg?style=for-the-badge&color=8b5cf6" alt="npm version">
    </a>
    <a href="https://www.npmjs.com/package/vibrant-cli">
      <img src="https://img.shields.io/npm/dm/vibrant-cli.svg?style=for-the-badge&color=8b5cf6" alt="npm downloads">
    </a>
    <a href="https://github.com/francogalfre/vibrant/stargazers">
      <img src="https://img.shields.io/github/stars/francogalfre/vibrant?style=for-the-badge&color=8b5cf6" alt="Stars">
    </a>
  </p>
</div>

---

## Table of Contents

- [Why Vibrant?](#why-vibrant)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [AI Providers](#ai-providers)
- [Detection Rules](#detection-rules)
- [Output Formats](#output-formats)
- [Configuration](#configuration)
- [CLI Reference](#cli-reference)
- [How It Works](#how-it-works)
- [CI/CD Integration](#cicd-integration)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Why Vibrant?

You're using AI to write code. It's fast. It's convenient. But sometimes it ships bugs, hardcoded secrets, and patterns that scream "I wasn't reviewed by a human."

**Vibrant catches what AI misses.**

### The Problem

```typescript
// AI generated this. Looks fine, right?
const API_KEY = "sk-proj-abc123..."; // Oops, hardcoded secret

async function fetchUser(id) {
  console.log("Fetching user:", id); // Debug code left in
  try {
    const res = await fetch(`/users/${id}`);
    return res.json();
  } catch (e) {} // Silent failure - bugs waiting to happen
}
```

### The Solution

Vibrant analyzes your codebase and catches:

- 🔐 **Hardcoded secrets** - API keys, passwords, tokens
- 🐛 **Silent failures** - Empty catch blocks, unhandled errors
- 🤖 **AI telltales** - `console.log`, TODO comments, generic names
- ⚡ **Security issues** - SQL injection, XSS vulnerabilities

---

## Features

### ✅ **Static Analysis**

Fast, offline detection using TypeScript's AST. No API keys required.

### 🧠 **AI-Powered Deep Analysis**

Optional AI analysis for patterns static analysis can't catch. Works with OpenAI, Claude, Gemini, Ollama, and OpenRouter.

### 📡 **Real-Time Feedback**

See issues as they're detected. No more waiting for the full analysis to complete.

### 🛡️ **Security First**

Built-in detection for hardcoded credentials, SQL injection, XSS, and other security vulnerabilities.

### 📊 **Multiple Output Formats**

Pretty output for humans, JSON for CI/CD, Plan format for AI agents to auto-fix.

### 🔧 **Auto-Fix**

Some issues can be automatically fixed with `--fix`.

### 🚀 **Fast**

~200ms for 100 files (static analysis). Incremental caching for AI analysis.

### 📦 **Zero Config**

Works out of the box. Configure only what you need.

### 🎯 **AI Telltale Detection**

Detects patterns common in AI-generated code: emojis in comments, excessive TODOs, magic numbers, generic variable names.

### 💬 **Fun Feedback**

Humorous messages when issues are found. Because code review shouldn't be boring!

### 🙈 **Selective Ignoring**

Ignore specific lines or files with `// vibrant ignore` comments or configuration.

### 🌐 **Cross-Platform**

Works on Windows, macOS, and Linux.

---

## Installation

### Using npx (No Installation)

```bash
npx vibrant-cli .
```

### Global Installation

```bash
npm install -g vibrant-cli
vibrant .
```

### Using Bun

```bash
bun install -g vibrant-cli
vibrant .
```

### Configuration

Vibrant automatically loads API keys from a `.env` file in your project directory:

```bash
# Create a .env file in your project
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENROUTER_API_KEY=sk-or-...
# or
GOOGLE_GENERATIVE_AI_API_KEY=AI...
```

The `.env` file should be in the same directory where you run `vibrant .`.

---

## Quick Start

### Step 1: Basic Analysis

Run static analysis on your codebase:

```bash
vibrant .
```

Output:

```
  🔮 Vibrant Analysis
  ─────────────────────

  ✔ Analysis complete

  ✕ src/api.ts:24:5
    └─ hardcoded-credentials
       API key hardcoded in source code

       24|   const API_KEY = "sk-abc123...";

       → Use environment variables instead

  ⚠ src/utils.ts:85:1
    └─ empty-catch-block
       Empty catch block swallows errors

       85|   } catch (e) {}

       → Log or handle the error properly

  ✕ 1 error · ⚠ 1 warning · 48 files · 200ms
```

### Step 2: Analyze Specific Paths

```bash
# Analyze a specific file
vibrant src/api.ts

# Analyze with glob pattern
vibrant "src/**/*.ts"

# Ignore certain paths
vibrant . --ignore "dist,coverage,*.test.ts"
```

### Step 3: AI-Powered Analysis

Enable AI for deeper code understanding:

```bash
# Requires an API key (see AI Providers section)
vibrant . --ai

# Use a specific provider
vibrant . --ai --provider openrouter
```

AI analysis provides:

- 📋 **Summary** - Overall code health assessment
- 🔍 **Key Findings** - Most important issues to address
- 💡 **Recommendations** - Actionable next steps

### Step 4: Auto-Fix Issues

Some issues can be automatically fixed:

```bash
vibrant . --fix
```

---

## AI Providers

Vibrant supports multiple AI providers for deep code analysis:

| Provider       | Environment Variable           | Free Tier      | Recommended Model                  |
| -------------- | ------------------------------ | -------------- | ---------------------------------- |
| **OpenRouter** | `OPENROUTER_API_KEY`           | ✅ Free models | `google/gemini-2.0-flash-lite-001` |
| **Gemini**     | `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ Free tier   | `gemini-2.0-flash-lite`            |
| **OpenAI**     | `OPENAI_API_KEY`               | ❌ Paid        | `gpt-4o-mini`                      |
| **Claude**     | `ANTHROPIC_API_KEY`            | ❌ Paid        | `claude-3-haiku-20240307`          |
| **Ollama**     | `OLLAMA_HOST`                  | ✅ Local, free | `llama3.2`                         |

### Setup Options

**Option 1: Environment Variable**

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
vibrant . --ai
```

**Option 2: .env File**

```bash
echo 'OPENROUTER_API_KEY="sk-or-v1-..."' > .env
vibrant . --ai
```

**Option 3: Config File**

```bash
vibrant init
# Edit vibrant.config.js
vibrant . --ai
```

### Provider-Specific Setup

```bash
# OpenRouter (recommended - free models available)
export OPENROUTER_API_KEY="sk-or-v1-..."
vibrant . --ai --provider openrouter

# Google Gemini (free tier)
export GOOGLE_GENERATIVE_AI_API_KEY="AIza..."
vibrant . --ai --provider gemini

# OpenAI
export OPENAI_API_KEY="sk-..."
vibrant . --ai --provider openai

# Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-..."
vibrant . --ai --provider claude

# Ollama (local, requires Ollama installed)
ollama pull llama3.2
export OLLAMA_HOST="http://localhost:11434"
vibrant . --ai --provider ollama
```

---

## Detection Rules

### Security Rules

| Rule                    | Description                                 | Severity | Auto-fix |
| ----------------------- | ------------------------------------------- | -------- | -------- |
| `hardcoded-credentials` | Detects API keys, passwords, tokens in code | Error    | No       |
| `no-sql-injection`      | Detects SQL injection vulnerabilities       | Error    | No       |
| `no-unsafe-inner-html`  | Detects XSS via `innerHTML`                 | Error    | No       |

### Bug Prevention Rules

| Rule                  | Description                          | Severity | Auto-fix |
| --------------------- | ------------------------------------ | -------- | -------- |
| `empty-catch-block`   | Empty catch blocks swallow errors    | Error    | Yes      |
| `unimplemented-error` | `throw new Error('not implemented')` | Error    | No       |
| `empty-function-body` | Functions with no implementation     | Error    | No       |
| `no-unreachable`      | Unreachable code after return/throw  | Error    | No       |
| `no-ex-assign`        | Assigning to exception variable      | Error    | No       |
| `use-isnan`           | Using === to compare with NaN        | Error    | No       |

### Code Quality Rules

| Rule                    | Description                | Severity | Auto-fix |
| ----------------------- | -------------------------- | -------- | -------- |
| `console-log-debugging` | `console.log` left in code | Warning  | Yes      |
| `no-explicit-any`       | Usage of `any` type        | Warning  | No       |
| `no-await-in-loop`      | Sequential awaits in loops | Warning  | No       |

### AI Telltale Rules

| Rule                | Description                   | Severity | Why                                        |
| ------------------- | ----------------------------- | -------- | ------------------------------------------ |
| `ai-comment-emojis` | Emojis in comments            | Warning  | AI often adds decorative emojis            |
| `ai-todo-comments`  | Excessive TODO/FIXME comments | Warning  | AI leaves many incomplete TODOs            |
| `magic-numbers`     | Unnamed numeric constants     | Warning  | AI uses magic numbers instead of constants |

### Ignoring Rules

You can ignore specific lines or files:

```typescript
// Vibrant ignore - ignores this line
const apiKey = "secret"; // vibrant ignore

// Vibrant ignore-next-line - ignores the next line
const secret = "password";
```

Or ignore files in configuration:

```javascript
// vibrant.config.js
module.exports = {
  ignore: ["*.test.ts", "dist/", "coverage/"],
};
```

### List All Rules

```bash
vibrant rules
```

Output:

```
📋 Available Detection Rules

Security
──────────────────────────────────────────────────────
hardcoded-credentials    Hardcoded API keys, passwords
no-sql-injection        SQL injection vulnerabilities
no-unsafe-inner-html    XSS via innerHTML

Bugs
──────────────────────────────────────────────────────
empty-catch-block        Empty catch blocks
unimplemented-error     Unimplemented code
empty-function-body     Empty functions
no-unreachable          Unreachable code
no-ex-assign            Assigning to exception variable
use-isnan               Using === with NaN

Code Quality
──────────────────────────────────────────────────────
console-log-debugging   Debug console.log
no-explicit-any         Any type usage
no-await-in-loop        Sequential awaits in loops

AI Telltales
──────────────────────────────────────────────────────
ai-comment-emojis       Emojis in code comments
ai-todo-comments        Excessive TODO/FIXME comments
magic-numbers           Unnamed numeric constants
```

---

## Output Formats

### Pretty (Default)

Human-readable output with colors:

```bash
vibrant .
```

### JSON

For CI/CD pipelines and tooling:

```bash
vibrant . --format json
```

```json
{
  "summary": {
    "filesAnalyzed": 48,
    "errorCount": 1,
    "warningCount": 2,
    "duration": 10234
  },
  "results": [
    {
      "file": "src/api.ts",
      "diagnostics": [
        {
          "line": 24,
          "column": 5,
          "severity": "error",
          "ruleId": "hardcoded-credentials",
          "message": "API key hardcoded in source code"
        }
      ]
    }
  ]
}
```

### Plan

Generate `vibrant-report.md` with detailed analysis for AI assistants:

```bash
vibrant . --format plan
```

The plan format includes:

- 📋 Complete issue list with code snippets
- 💡 Suggested fixes for each issue
- 📊 Priority ordering (errors first)

Perfect for feeding to AI agents that can auto-fix your code.

### Compact

Single-line output for CI pipelines:

```bash
vibrant . --format compact
```

```
src/api.ts:24:5 error hardcoded-credentials API key in source
src/utils.ts:85:1 warning empty-catch-block Swallows errors
```

---

## Configuration

### Create Config File

```bash
vibrant init
```

### Configuration Options

```javascript
// vibrant.config.js
module.exports = {
  // Directories to ignore during analysis
  ignore: ["node_modules", ".git", "dist", ".next", "build", "coverage"],

  // Output format: 'pretty', 'compact', 'plan', or 'json'
  format: "pretty",

  // Default AI provider (optional)
  // provider: 'openrouter',
};
```

### Rule Configuration

```javascript
module.exports = {
  rules: {
    // Security - Always error
    "hardcoded-credentials": "error",
    "no-sql-injection": "error",

    // Bugs - Always error
    "empty-catch-block": "error",
    "unimplemented-error": "error",

    // Code Quality - Warnings
    "console-log-debugging": "warn",
    "no-explicit-any": "warn",

    // Disable specific rules
    "no-await-in-loop": "off",
  },
};
```

---

## CLI Reference

### Commands

```bash
vibrant [path]           # Analyze code (default: current directory)
vibrant init             # Create vibrant.config.js
vibrant rules            # List all detection rules
vibrant --help           # Show help
vibrant --version        # Show version
```

### Options

| Option                | Short | Description                                              |
| --------------------- | ----- | -------------------------------------------------------- |
| `--ai`                |       | Enable AI-powered analysis                               |
| `--provider <name>`   | `-p`  | AI provider (openai, claude, gemini, ollama, openrouter) |
| `--format <type>`     | `-f`  | Output format (pretty, compact, json, plan)              |
| `--fix`               |       | Auto-fix fixable issues                                  |
| `--ignore <patterns>` |       | Comma-separated patterns to ignore                       |

### Examples

```bash
# Basic analysis
vibrant .

# AI analysis with specific provider
vibrant . --ai --provider openrouter

# JSON output for CI
vibrant . --format json > report.json

# Auto-fix issues
vibrant . --fix

# Analyze specific files
vibrant "src/**/*.ts" --ignore "*.test.ts"

# Compact output
vibrant . --format compact
```

---

## How It Works

### 1. Smart Summarizer

Before sending code to AI, Vibrant summarizes it:

```
## src/api.ts

Suspicious:
L24|const API_KEY = "sk-abc";  // secret detected
L45|console.log("debug");      // console.log
L89|} catch (e) {}             // empty catch

Functions:
L10|async fn fetchData(url: string)
L60|fn processResult(data: any)
```

**Benefits:**

- 50-60% token reduction
- Maintains detection accuracy
- Focuses AI on suspicious code

### 2. Static Analysis

Vibrant runs built-in rules using TypeScript's AST:

1. Parse source files with TypeScript
2. Walk the AST tree
3. Apply each rule's visitor functions
4. Collect and report diagnostics

### 3. AI Analysis

When `--ai` is enabled:

1. Summarize all files with the Smart Summarizer
2. Send to configured AI provider
3. Parse structured response
4. Merge with static analysis results

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Vibrant
        run: npm install -g vibrant-cli

      - name: Run Analysis
        run: vibrant . --format compact
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

### GitLab CI

```yaml
code-quality:
  image: node:20
  script:
    - npm install -g vibrant-cli
    - vibrant . --format compact
  variables:
    OPENROUTER_API_KEY: $OPENROUTER_API_KEY
```

### Exit Codes

| Code | Meaning                        |
| ---- | ------------------------------ |
| `0`  | No issues found                |
| `1`  | Issues found or error occurred |

---

## API Reference

### Programmatic Usage

```typescript
import { lintFiles, loadConfig } from "vibrant-cli";

const config = await loadConfig();
const results = await lintFiles("./src", config);

console.log(results);
// {
//   summary: { filesAnalyzed: 48, errorCount: 1, warningCount: 2 },
//   results: [...]
// }
```

### With AI Analysis

```typescript
import { lintFiles, loadConfig, analyzeWithAI } from "vibrant-cli";

const config = await loadConfig();

// Static analysis
const staticResults = await lintFiles("./src", config);

// AI analysis
const aiResults = await analyzeWithAI("./src", {
  provider: "openrouter",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Merge results
const allResults = mergeResults(staticResults, aiResults);
```

---

## Performance

| Scenario                      | Time   |
| ----------------------------- | ------ |
| Static analysis (100 files)   | ~200ms |
| Static analysis (500 files)   | ~800ms |
| AI analysis (48 files)        | ~10s   |
| AI analysis (100 files)       | ~15s   |
| Token savings with Summarizer | 50-60% |

---

## Requirements

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0 (optional, for type checking)

---

## What's Next?

### 📚 Learn More

- [Detection Rules](#detection-rules) - All available rules
- [AI Providers](#ai-providers) - Setup each provider
- [Output Formats](#output-formats) - Choose your format

### 🚀 Get Started

1. Install: `npm install -g vibrant-cli`
2. Run: `vibrant .`
3. Fix issues: `vibrant . --fix`
4. Enable AI: `vibrant . --ai`

### 💡 Best Practices

- **Run before commits** - Catch issues early
- **Enable AI for PRs** - Deep analysis on important changes
- **Use in CI/CD** - Automate code quality checks
- **Configure rules** - Customize for your project

---

## Contributing

Contributions are welcome! Please see the [GitHub repository](https://github.com/francogalfre/vibrant) for more details.

```bash
git clone https://github.com/francogalfre/vibrant.git
cd vibrant/apps/cli
bun install
bun run dev
```

---

## License

MIT License - see the [LICENSE](./LICENSE) file for details.

---

## Links

- 📦 **NPM**: [vibrant-cli](https://www.npmjs.com/package/vibrant-cli)
- 🐙 **GitHub**: [francogalfre/vibrant](https://github.com/francogalfre/vibrant)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/francogalfre/vibrant/issues)

---

<div align="center">

**Built with ❤️ for developers who care about code quality**

Made by [@francogalfre](https://github.com/francogalfre)

</div>
