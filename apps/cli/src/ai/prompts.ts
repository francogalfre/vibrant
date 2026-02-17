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

Return ONLY JSON: {"issues":[]} if no issues. Each issue needs: file, line, column, severity, ruleId, message.

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
