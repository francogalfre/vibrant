import { AIFileContent } from "./types";

export const SYSTEM_PROMPT = `You are Vibrant, a security-focused code reviewer. Find REAL problems: bugs, vulnerabilities, security issues, and code that will break in production.

You have FULL FREEDOM to identify ANY serious issue. Ignore minor style issues - focus on things that MATTER.

IMPORTANT: Every issue MUST include the EXACT line and column numbers from the code. Look at the line numbers provided and find where each issue actually occurs.

Return ONLY valid JSON. No markdown.`;

export const VIBECODE_DETECTION_PROMPT = `Find SERIOUS problems in this code. Focus on things that will cause bugs, security issues, or production failures.

LINE NUMBERS ARE CRITICAL:
- Each line is prefixed with "N|" where N is the line number
- Example: "5| const x = 1" means line 5
- Find the EXACT line where each issue occurs
- Count carefully - do NOT guess or default to line 1

ONLY REPORT IMPORTANT ISSUES:

SECURITY (always report):
- Hardcoded API keys, passwords, secrets, tokens
- SQL injection, XSS vulnerabilities
- Unsafe deserialization (eval, JSON.parse on user input)
- Missing authentication/authorization checks
- Exposed sensitive data in logs or responses
- CORS misconfigurations
- Unsafe regex (ReDoS)

BUGS (always report):
- Empty catch blocks that swallow errors
- Unhandled promise rejections
- Race conditions
- Memory leaks (event listeners not cleaned up)
- Infinite loops or recursion without base case
- Off-by-one errors
- Null/undefined access without checks
- Type coercion bugs (== instead of ===)

CODE QUALITY (only if serious):
- Functions doing 10+ things
- 500+ line files
- Deeply nested code (4+ levels)
- Dead code (unreachable, unused exports)
- Circular dependencies
- Missing error handling on critical paths

DO NOT REPORT (these are minor):
- Generic variable names (unless causing bugs)
- Console.log statements (unless in production paths)
- TODO comments (unless critical)
- Minor style inconsistencies
- Missing types (unless causing bugs)

Return JSON:

{
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": EXACT_LINE_NUMBER_FROM_CODE,
      "column": 1,
      "severity": "error",
      "ruleId": "descriptive-rule-id",
      "message": "What is wrong and why it matters",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "1-2 sentences about overall code health",
  "highlights": ["Most important finding"],
  "recommendations": ["Top priority fix"]
}

Files:
{files}`;

export function buildPrompt(files: AIFileContent[], isSingleFile: boolean): string {
  const filesText = files.map((f) => {
    const lines = f.content.split("\n");
    const numberedLines = lines.map((line, i) => `${i + 1}|${line}`).join("\n");
    return `[${f.path}]\n${numberedLines}`;
  }).join("\n\n");
  
  const note = isSingleFile 
    ? "\nFind all serious issues in this file. Report exact line numbers."
    : "\nFind serious issues across these files. Focus on security and bugs. Report exact line numbers.";
  
  return `${SYSTEM_PROMPT}\n\n${VIBECODE_DETECTION_PROMPT.replace("{files}", filesText)}${note}`;
}

export function buildPromptWithFiles(
  files: { path: string; content: string }[],
): string {
  const filesSection = files.map((f) => {
    const lines = f.content.split("\n");
    const numberedLines = lines.map((line, i) => `${i + 1}|${line}`).join("\n");
    return `[${f.path}]\n${numberedLines}`;
  }).join("\n\n");
  
  return VIBECODE_DETECTION_PROMPT.replace("{files}", filesSection);
}
