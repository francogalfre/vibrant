import { AIFileContent } from "./types";

// Ultra-compact prompts - designed for minimum token usage
// Each prompt targets ~200-400 tokens instead of 800+

export const SYSTEM_PROMPT = 
  `Detect vibecoded patterns. Return JSON: {"issues":[{file,line,column,severity,ruleId,message,suggestion}]}`;

// Even more compact vibecode detection prompt
export const VIBECODE_DETECTION_PROMPT = 
  `Analyze for vibecoded patterns. Return JSON.

PATTERNS:
1.TODO/FIXME/XXX comments
2.Empty catch blocks
3.throw new Error('Not implemented')
4.Generic names: data,result,temp,item,obj,val,str,num
5.Missing validation
6.console.log in prod
7.Magic numbers
8.Hardcoded config
9.Commented code blocks
10.Obvious comments
11.Copy-paste code
12.Unsafe type assertions
13.Over-engineering

SEVERITY: error|warning|info

Files:
{files}`;

// Compact prompt builder
export function buildPrompt(files: AIFileContent[]): string {
  const filesText = files
    .map(f => `\n[${f.path}]\n${f.content}`)
    .join("\n");
  return `${SYSTEM_PROMPT}\n${VIBECODE_DETECTION_PROMPT.replace("{files}", filesText)}`;
}

export function buildPromptWithFiles(
  files: { path: string; content: string }[],
): string {
  const filesSection = files
    .map(f => `\n[${f.path}]\n${f.content}`)
    .join("\n");
  return VIBECODE_DETECTION_PROMPT.replace("{files}", filesSection);
}