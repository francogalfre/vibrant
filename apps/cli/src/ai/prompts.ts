import { AIFileContent } from "./types";

export const SYSTEM_PROMPT = `You are a code reviewer. Analyze code for vibecoded (AI-generated) patterns.
Respond ONLY with valid JSON. No explanations, no markdown, no text outside JSON.
Format: {"issues":[{file,line,column,severity,ruleId,message,suggestion}]}`;

export const VIBECODE_DETECTION_PROMPT = `Find ALL issues in this code:
- TODO/FIXME comments
- Empty catch blocks  
- throw new Error("Not implemented")
- Generic names: data,result,temp,item,obj
- console.log debugging
- Magic numbers
- Hardcoded credentials
- Empty function bodies
- Missing types (any)
- Unused variables

Use your judgment to find other code smells, anti-patterns, or signs of unreviewed AI code.

Return ONLY JSON with "issues" array and "summary" string. 
"summary" should be a 2-3 sentence analysis of overall code quality and main issues found.

Format: {"issues":[{"file","line","column","severity","ruleId","message","suggestion"}],"summary":"..."}

Files:
{files}`;

export function buildPrompt(files: AIFileContent[]): string {
  const filesText = files.map((f) => `\n[${f.path}]\n${f.content}`).join("\n");
  return `${SYSTEM_PROMPT}\n\n${VIBECODE_DETECTION_PROMPT.replace("{files}", filesText)}`;
}

export function buildPromptWithFiles(
  files: { path: string; content: string }[],
): string {
  const filesSection = files
    .map((f) => `\n[${f.path}]\n${f.content}`)
    .join("\n");
  return VIBECODE_DETECTION_PROMPT.replace("{files}", filesSection);
}
