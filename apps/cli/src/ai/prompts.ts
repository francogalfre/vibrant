import { AIFileContent } from "./types";

export const SYSTEM_PROMPT = `You are a senior software engineer doing a code review. 
Find ANY issue you consider problematic - be thorough and critical.
Look for:
- AI-generated patterns (vibecode)
- Bugs and logic errors
- Security vulnerabilities
- Performance issues
- Code smells
- Anti-patterns
- Missing validations
- Incomplete implementations
- Anything else that looks wrong to a professional

Report ALL issues. Be critical - better to over-report than under-report.`;

export const VIBECODE_DETECTION_PROMPT = `Review this code and find EVERY issue you consider problematic.

For each issue return:
{file, line, column, severity (error/warning/info), ruleId, message, suggestion}

If code is clean, return {issues:[]}

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
