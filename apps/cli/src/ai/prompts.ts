import { AIFileContent } from "./types";

export const SYSTEM_PROMPT = `You are Vibrant, a security-focused code reviewer detecting "vibecoding" (AI-generated, unreviewed code).

CRITICAL: Extract EXACT line numbers from "L123|code" format (123 = line number).

IMPORTANT DISTINCTIONS:
- console.log in CLI tools is CORRECT - they NEED it for output. Only flag console.log in libraries/backend code.
- Regex patterns like /debugger/ or /TODO/ inside strings are NOT code issues - they're detection patterns.
- Focus on REAL problems, not every console.log statement.

Return ONLY valid JSON.`;

export const VIBECODE_DETECTION_PROMPT = `Analyze for REAL vibecoding issues. Use judgment - not every pattern is a problem.

DETECT (only if ACTUALLY problematic):

SECURITY (always report):
- Hardcoded API keys, passwords, tokens, secrets
- SQL injection, XSS vulnerabilities  
- eval(), Function() with user input
- Missing authentication on sensitive routes
- Exposed sensitive data

BUGS (always report):
- Empty catch blocks: catch (e) {} that swallow errors
- Unhandled promise rejections
- Null/undefined without checks
- Race conditions
- Memory leaks

CODE QUALITY (only if significant):
- Empty function bodies (not just signatures)
- throw new Error("not implemented") in production code
- @ts-ignore or as any (but NOT in regex patterns)
- Deeply nested code (5+ levels)
- Functions over 50 lines doing multiple things

IGNORE (these are OK):
- console.log/console.error in CLI applications (they need it!)
- Regex patterns like /TODO/ or /console/ inside strings
- Generic variable names unless causing actual confusion
- TODO comments (unless critical)
- Type annotations that are correct

Line format: "L123|code" = line 123. Extract EXACT line numbers.

{
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": EXACT_LINE_NUMBER,
      "column": 1,
      "severity": "error|warning|info",
      "ruleId": "descriptive-id",
      "message": "What's wrong",
      "suggestion": "How to fix"
    }
  ],
  "summary": "1-2 sentences about code quality",
  "highlights": ["Most important finding"],
  "recommendations": ["Top priority fix"]
}

Files:
{files}`;

export function buildPrompt(files: AIFileContent[], _isSingleFile: boolean): string {
  const filesText = files.map((f) => {
    const lines = f.content.split("\n");
    const numbered = lines.map((line, i) => `L${i + 1}|${line}`).join("\n");
    return `## ${f.path}\n${numbered}`;
  }).join("\n\n");
  
  return `${SYSTEM_PROMPT}\n\n${VIBECODE_DETECTION_PROMPT.replace("{files}", filesText)}`;
}

export function buildPromptWithFiles(files: { path: string; content: string }[]): string {
  const filesSection = files.map((f) => {
    const lines = f.content.split("\n");
    const numbered = lines.map((line, i) => `L${i + 1}|${line}`).join("\n");
    return `## ${f.path}\n${numbered}`;
  }).join("\n\n");
  
  return VIBECODE_DETECTION_PROMPT.replace("{files}", filesSection);
}
