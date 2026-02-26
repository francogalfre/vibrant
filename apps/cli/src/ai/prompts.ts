import { AIFileContent } from "./types";

const LANGUAGE_PATTERNS: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript/React",
  js: "JavaScript",
  jsx: "JavaScript/React",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  c: "C",
  cpp: "C++",
  cs: "C#",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  scala: "Scala",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sql: "SQL",
  sh: "Shell/Bash",
  yaml: "YAML",
  json: "JSON",
  md: "Markdown",
};

const LANGUAGE_AI_TELLTALES: Record<string, string> = {
  ts: `- AI telltale patterns in TypeScript:
  - Excessive use of 'any' type instead of proper typing
  - @ts-ignore or @ts-expect-error without clear reason
  - Generic variable names: data, item, temp, result, response
  - Console.log/debug statements in production code
  - TODO comments with "implement" or "fix later"
  - Imports that aren't used (unused imports)
  - Empty catch blocks or catch (e) {} without handling`,
  js: `- AI telltale patterns in JavaScript:
  - console.log/debug statements in production
  - Generic variable names: data, item, temp, result
  - TODO comments
  - Unused variables
  - Magic numbers without constants`,
  py: `- AI telltale patterns in Python:
  - print() statements in production (use logging)
  - Bare except: or except Exception: pass
  - Generic variable names: data, result, temp, item
  - TODO comments
  - Unused imports
  - Excessive docstrings for simple functions`,
  html: `- AI telltale patterns in HTML:
  - Excessive use of inline styles
  - Non-semantic HTML (div soup)
  - Missing alt attributes on images
  - Inline event handlers (onclick, etc.)
  - Table-based layouts
  - Duplicate IDs`,
  css: `- AI telltale patterns in CSS:
  - Excessive use of !important
  - Very long selectors
  - Duplicate properties
  - Magic numbers in values
  - Non-responsive designs`,
  sql: `- AI telltale patterns in SQL:
  - SELECT * (without limiting columns)
  - No WHERE clause on DELETE/UPDATE
  - String concatenation for queries (SQL injection risk)
  - Missing indexes on foreign keys`,
  default: `- AI telltale patterns:
  - Console.log/debug statements in production
  - Generic variable names: data, result, temp, item
  - TODO comments
  - Empty error handling
  - Magic numbers without constants`,
};

export const SYSTEM_PROMPT = `You are Vibrant, a security-focused code reviewer specializing in detecting "vibecoding" (AI-generated code that wasn't properly reviewed).

CRITICAL: Extract EXACT line numbers from "L123|code" format (123 = line number).
CRITICAL: Always respond with valid JSON only - no markdown, no explanations outside JSON.

IMPORTANT DISTINCTIONS:
- console.log in CLI tools, scripts, or test files is CORRECT - only flag in libraries/backend API code
- Regex patterns like /debugger/ or /TODO/ inside strings are NOT issues - they're just patterns
- Focus on REAL problems that would cause bugs or security issues
- Be selective - not every minor issue deserves reporting`;

export const VIBECODE_DETECTION_PROMPT = `Analyze this code for vibecoding issues. DETECT THE PROGRAMMING LANGUAGE from the file extension and apply language-specific rules.

{detectedLanguage}

{detectedTellTales}

REPORT (only if ACTUALLY problematic):

1. SECURITY (always report - critical):
- Hardcoded API keys, passwords, tokens, secrets
- SQL injection vulnerabilities
- XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML)
- eval(), Function() with user input
- Missing authentication/authorization checks
- Exposed sensitive data in responses
- Hardcoded URLs to internal services
- Insecure random number generation

2. BUGS (always report):
- Empty catch blocks: catch (e) {} that swallow errors silently
- Unhandled promise rejections
- Null/undefined access without checks
- Race conditions
- Memory leaks
- Returning incorrect types
- Infinite loops

3. CODE QUALITY (only if significant):
- Functions over 100 lines doing too much
- Deeply nested code (6+ levels)
- Empty function bodies (not just signatures)
- throw new Error("not implemented") in production
- @ts-ignore or as any (but NOT in type definitions or generics)
- Unused imports or variables
- Duplicate code

4. AI TELLTALES (report if excessive - 3+ occurrences):
- console.log/console.error/console.debug in non-CLI code
- Generic variable names used repeatedly: data, item, temp, result, response, val
- TODO/FIXME/HACK comments
- Comments in unusual places
- Very similar patterns repeated

IGNORE (these are OK):
- console.log in CLI applications, scripts, tests
- console.log in files named "cli.ts", "script.ts", "test*.ts"
- Regex patterns inside strings (they're not executing)
- Generic names in type definitions
- TypeScript utility types
- Empty lines or whitespace
- Copyright headers

Feel free to find other vibecoding patterns and report them as issues. Report any code that might cause future problems, but explain why and provide a solution.

Line format: "L123|code" where 123 is the EXACT line number.

Respond with this JSON structure:
{
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": EXACT_LINE_NUMBER,
      "column": 1,
      "severity": "error|warning|info",
      "ruleId": "descriptive-rule-id",
      "message": "What's wrong with this code",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "Overall code quality assessment in 1-2 sentences",
  "highlights": ["Most important finding", "Second most important"],
  "recommendations": ["Top priority fix", "Second priority"]
}

Files to analyze:
{files}`;

export function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return LANGUAGE_PATTERNS[ext] || "Unknown";
}

export function getLanguageTellTales(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return LANGUAGE_AI_TELLTALES[ext] || LANGUAGE_AI_TELLTALES.default;
}

export function buildPrompt(
  files: AIFileContent[],
  isSingleFile: boolean,
): string {
  const filesText = files
    .map((f) => {
      const lines = f.content.split("\n");
      const numbered = lines.map((line, i) => `L${i + 1}|${line}`).join("\n");
      return `## ${f.path}\n${numbered}`;
    })
    .join("\n\n");

  const language =
    isSingleFile && files.length === 1
      ? detectLanguage(files[0].path)
      : "Multiple files - analyze each for its language type";

  const tellTales =
    isSingleFile && files.length === 1
      ? getLanguageTellTales(files[0].path)
      : "Apply general vibecoding detection across all file types";

  const prompt = VIBECODE_DETECTION_PROMPT.replace(
    "{detectedLanguage}",
    language,
  )
    .replace("{detectedTellTales}", tellTales)
    .replace("{files}", filesText);

  return `${SYSTEM_PROMPT}\n\n${prompt}`;
}

export function buildPromptWithFiles(
  files: { path: string; content: string }[],
): string {
  const isSingleFile = files.length === 1;

  const filesSection = files
    .map((f) => {
      const lines = f.content.split("\n");
      const numbered = lines.map((line, i) => `L${i + 1}|${line}`).join("\n");
      return `## ${f.path}\n${numbered}`;
    })
    .join("\n\n");

  const language = isSingleFile
    ? detectLanguage(files[0].path)
    : "Multiple files";
  const tellTales = isSingleFile
    ? getLanguageTellTales(files[0].path)
    : "General vibecoding detection";

  const prompt = VIBECODE_DETECTION_PROMPT.replace(
    "{detectedLanguage}",
    language,
  )
    .replace("{detectedTellTales}", tellTales)
    .replace("{files}", filesSection);

  return `${SYSTEM_PROMPT}\n\n${prompt}`;
}
