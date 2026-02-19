import { AIFileContent } from "./types";

export const SYSTEM_PROMPT = `You are Vibrant, an expert at detecting AI-generated code patterns ("vibecoding").

You have FULL FREEDOM to identify ANY issue. Trust your instincts.

CRITICAL: Extract EXACT line numbers from the format "L123|code" where 123 is the line number.

Return ONLY valid JSON.`;

export const VIBECODE_DETECTION_PROMPT = `Analyze this code for vibecoding patterns. You have freedom to detect any issue.

DETECT THESE PATTERNS (and any others you notice):

CODE QUALITY:
- console.log, console.error, console.warn, debugger
- TODO, FIXME, HACK, XXX comments
- Empty functions: function foo() {}, () => {}
- Empty catch blocks: catch (e) {}
- Generic names: data, result, item, temp, value, obj, arr, stuff
- throw new Error("not implemented"), throw new Error("TODO")
- Magic numbers: setTimeout(fn, 5000), if (x > 100)
- Unused imports or variables

SECURITY:
- Hardcoded URLs: "https://api...", "http://..."
- Hardcoded credentials: API keys, passwords, tokens
- any type: : any, as any
- @ts-ignore, @ts-nocheck
- Unsafe patterns: eval(), innerHTML

ARCHITECTURE:
- Functions that do too many things
- Deeply nested code (4+ levels)
- Copy-pasted patterns with minor changes
- Missing error handling

IMPORTANT: Line format is "L123|actual code" where 123 is the line number. Extract EXACT line numbers from this format.

Return JSON:

{
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": EXACT_LINE_NUMBER_FROM_FORMAT,
      "column": 1,
      "severity": "error|warning|info",
      "ruleId": "descriptive-rule-id",
      "message": "What is wrong and why it matters",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "1-2 sentences about overall code quality",
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
