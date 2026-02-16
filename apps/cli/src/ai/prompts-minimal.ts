import { AIFileContent } from "./types";

// ULTRA-compact prompts for free tier - minimal tokens
export const SYSTEM_PROMPT = 
  `Detect vibecode:TODO,empty catch,placeholder fn,generic vars,debug logs,magic nums,hardcoded secrets. Return JSON:{issues:[{file,line,column,severity,message,suggestion}]}`;

// Ultra-minimal vibecode detection
export const VIBECODE_DETECTION_PROMPT = 
  `Find vibecoded patterns. JSON output.

CHECK:
-TODO/FIXME comments
-empty catch blocks
-throw new Error('not implemented')
-generic names:data,result,temp,item
-console.log/debug
-magic numbers without consts
-hardcoded URLs/secrets
-type assertions (!,as)

OUT:{issues:[]}`;

// Minimal prompt builder
export function buildPrompt(files: AIFileContent[]): string {
  const filesText = files
    .map(f => `\n[${f.path}]\n${f.content}`)
    .join("\n");
  return `${SYSTEM_PROMPT}\n${VIBECODE_DETECTION_PROMPT}\n${filesText}`;
}

export function buildPromptWithFiles(
  files: { path: string; content: string }[],
): string {
  const filesSection = files
    .map(f => `\n[${f.path}]\n${f.content}`)
    .join("\n");
  return VIBECODE_DETECTION_PROMPT + filesSection;
}