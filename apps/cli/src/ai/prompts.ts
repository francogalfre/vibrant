import { AIFileContent } from "./types";

export const SYSTEM_PROMPT = `Security-focused code reviewer. Find ONLY serious issues: bugs, vulnerabilities, security.

Line format "123|code" means line 123. Extract EXACT line numbers.

Return ONLY JSON.`;

export const VIBECODE_DETECTION_PROMPT = `Report ONLY serious issues:

SECURITY: secrets, SQL injection, XSS, eval(), missing auth
BUGS: empty catch, unhandled promises, null access, race conditions
CRITICAL: functions >50 lines, deep nesting >4, dead code

Line format: "123|actual code" = line 123

{
  "issues": [{"file":"path","line":EXACT_LINE,"column":1,"severity":"error|warning|info","ruleId":"id","message":"problem","suggestion":"fix"}],
  "summary": "brief",
  "highlights": ["top issue"],
  "recommendations": ["fix"]
}

{files}`;

export function buildPrompt(files: AIFileContent[], _isSingleFile: boolean): string {
  const filesText = files.map((f) => {
    const lines = f.content.split("\n");
    const numbered = lines.map((line, i) => `${i + 1}|${line}`).join("\n");
    return `## ${f.path}\n${numbered}`;
  }).join("\n\n");
  
  return `${SYSTEM_PROMPT}\n\n${VIBECODE_DETECTION_PROMPT.replace("{files}", filesText)}`;
}

export function buildPromptWithFiles(files: { path: string; content: string }[]): string {
  const filesSection = files.map((f) => {
    const lines = f.content.split("\n");
    const numbered = lines.map((line, i) => `${i + 1}|${line}`).join("\n");
    return `## ${f.path}\n${numbered}`;
  }).join("\n\n");
  
  return VIBECODE_DETECTION_PROMPT.replace("{files}", filesSection);
}
