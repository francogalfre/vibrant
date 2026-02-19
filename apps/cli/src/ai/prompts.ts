import { AIFileContent } from "./types";

export const SYSTEM_PROMPT = `You are Vibrant, a code analyzer detecting "vibecoding" (AI-generated code patterns). Be opinionated but fair.

Respond ONLY with valid JSON. No markdown.`;

export const VIBECODE_DETECTION_PROMPT = `Analyze for vibecoding patterns:
- TODO/FIXME left in code
- Empty catch/function bodies
- Placeholder names: data, result, temp, item
- console.log in production
- Hardcoded credentials/URLs
- Magic numbers
- Missing error handling
- Type assertions (as any)
- Repeated patterns with slight variations
- Dead code

Return JSON:
{
  "issues": [{"file":"path", "line":1, "column":1, "severity":"error|warning|info", "ruleId":"name", "message":"what", "suggestion":"fix"}],
  "summary": "2-3 sentences about code quality",
  "highlights": ["finding 1", "finding 2"],
  "recommendations": ["fix 1", "fix 2"]
}

Files:
{files}`;

export function buildPrompt(files: AIFileContent[], isSingleFile: boolean): string {
  const filesText = files.map((f) => `[${f.path}]\n${f.content}`).join("\n\n");
  const note = isSingleFile 
    ? "\nNote: Single file analysis."
    : "\nNote: Full project analysis.";
  
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
