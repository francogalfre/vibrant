import { AIFileContent } from "./types";

export const SYSTEM_PROMPT = `You are Vibrant, an expert code reviewer. Detect code quality issues, anti-patterns, and "vibecoding" (unreviewed AI-generated code).

IMPORTANT: You MUST find issues. Be critical and thorough. Even good code has minor issues.

Return ONLY valid JSON. No markdown. No explanation outside JSON.`;

export const VIBECODE_DETECTION_PROMPT = `Analyze this code and find issues. Be critical.

Look for ANY of these:
- console.log, console.error, console.warn (leftover debug code)
- TODO, FIXME, HACK, XXX comments
- Empty functions: function foo() {}, () => {}
- Empty catch: catch (e) {} or catch {}
- Generic names: data, result, item, obj, temp, value, thing, stuff, arr, list
- throw new Error("not implemented"), throw new Error("TODO")
- Magic numbers: setTimeout(fn, 5000), if (x > 100)
- Hardcoded URLs: "https://api...", "http://..."
- any type: : any, as any, @ts-ignore
- Unused imports or variables
- Repeated code patterns
- Missing error handling
- Inconsistent naming (mix of camelCase and snake_case)

Return JSON with issues found. If code seems clean, look harder for minor issues.

{
  "issues": [
    {"file":"path", "line":1, "column":1, "severity":"error|warning|info", "ruleId":"rule-name", "message":"what's wrong", "suggestion":"how to fix"}
  ],
  "summary": "1-2 sentences about code quality",
  "highlights": ["main concern"],
  "recommendations": ["top fix"]
}

Files:
{files}`;

export function buildPrompt(files: AIFileContent[], isSingleFile: boolean): string {
  const filesText = files.map((f) => `[${f.path}]\n${f.content}`).join("\n\n");
  const note = isSingleFile 
    ? "\nFocus on this specific file."
    : "\nAnalyze across all files for patterns.";
  
  return `${SYSTEM_PROMPT}\n\n${VIBECODE_DETECTION_PROMPT.replace("{files}", filesText)}${note}`;
}

export function buildPromptWithFiles(
  files: { path: string; content: string }[],
): string {
  const filesSection = files
    .map((f) => `[${f.path}]\n${f.content}`)
    .join("\n\n");
  return VIBECODE_DETECTION_PROMPT.replace("{files}", filesSection);
}
