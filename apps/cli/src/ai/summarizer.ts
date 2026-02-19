import ts from "typescript";

export interface CodeSummary {
  path: string;
  summary: string;
  complexity: number;
  estimatedTokens: number;
  originalTokens: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function hasVibecodingPattern(line: string): boolean {
  const patterns = [
    /console\.(log|error|warn|debug|info)/,
    /debugger\b/,
    /\/\/\s*(TODO|FIXME|HACK|XXX|BUG)/i,
    /\/\*[\s\S]*?(TODO|FIXME|HACK)/i,
    /throw\s+new\s+Error\s*\(\s*["'].*(?:not implemented|todo|fix)/i,
    /:\s*any\b/,
    /@ts-ignore/,
    /@ts-nocheck/,
    /as\s+any\b/,
    /["']https?:\/\/[^\s"']{10,}/,
    /(api[_-]?key|apikey|secret|password|passwd|pwd|token)\s*[=:]/i,
    /(["'])(?:sk-[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,}|ghp_[a-zA-Z0-9]{36,})\1/,
    /(?:password|passwd|pwd)\s*[=:]\s*["'][^"']+["']/,
    /\b(?:data|result|item|temp|value|obj|arr|stuff|thing)\s*[=:]/i,
    /function\s*\(\s*\)\s*\{\s*\}/,
    /\{\s*\}\s*$/,
    /catch\s*\([^)]*\)\s*\{\s*(\/\/|\/\*)?\s*\}/,
    /setTimeout\s*\([^,]+,\s*\d{3,}\)/,
    /setInterval\s*\([^,]+,\s*\d{3,}\)/,
  ];
  return patterns.some(p => p.test(line));
}

function getPatternType(line: string): string {
  if (/console\.(log|error|warn|debug|info)/.test(line)) return "console";
  if (/debugger/.test(line)) return "debugger";
  if (/(TODO|FIXME|HACK|XXX|BUG)/i.test(line)) return "todo";
  if (/throw\s+new\s+Error.*not implemented/i.test(line)) return "unimplemented";
  if (/:\s*any/.test(line)) return "any-type";
  if (/@ts-ignore/.test(line)) return "ts-ignore";
  if (/https?:\/\//.test(line)) return "hardcoded-url";
  if (/(api[_-]?key|secret|password|token)\s*[=:]/i.test(line)) return "secret";
  if (/\b(data|result|item|temp|value|obj)\s*[=:]/i.test(line)) return "generic-name";
  if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) return "empty-catch";
  return "pattern";
}

export function summarizeFile(
  filePath: string,
  content: string,
): CodeSummary {
  const originalTokens = estimateTokens(content);
  const lines = content.split("\n");
  
  const suspicious: Array<{ line: number; code: string; type: string }> = [];
  const functions: Array<{ line: number; signature: string }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    if (hasVibecodingPattern(line)) {
      const patternType = getPatternType(line);
      suspicious.push({
        line: lineNum,
        code: line.trim(),
        type: patternType,
      });
    }
  }
  
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const name = node.name.text;
      const params = node.parameters.map(p => p.name.getText(sourceFile)).join(", ");
      const async = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : "";
      functions.push({ line, signature: `${async}fn ${name}(${params})` });
    }
    
    if (ts.isArrowFunction(node) && ts.isVariableDeclaration(node.parent)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const name = (node.parent.name as ts.Identifier).text;
      const params = node.parameters.map(p => p.name.getText(sourceFile)).join(", ");
      const async = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : "";
      functions.push({ line, signature: `${async}${name}(${params})` });
    }
    
    if (ts.isClassDeclaration(node) && node.name) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      functions.push({ line, signature: `class ${node.name.text}` });
    }
    
    if (ts.isMethodDeclaration(node) && node.name) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const name = node.name.getText(sourceFile);
      const params = node.parameters.map(p => p.name.getText(sourceFile)).join(", ");
      const async = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : "";
      functions.push({ line, signature: `${async}${name}(${params})` });
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  
  const summary = buildSmartSummary(filePath, lines.length, suspicious, functions);
  
  return {
    path: filePath,
    summary,
    complexity: suspicious.length + functions.length,
    estimatedTokens: estimateTokens(summary),
    originalTokens,
  };
}

function buildSmartSummary(
  filePath: string,
  totalLines: number,
  suspicious: Array<{ line: number; code: string; type: string }>,
  functions: Array<{ line: number; signature: string }>
): string {
  const parts: string[] = [];
  
  parts.push(`### ${filePath}`);
  parts.push(`Lines: ${totalLines}`);
  parts.push("");
  
  if (suspicious.length > 0) {
    parts.push("Suspicious:");
    suspicious.forEach(s => {
      parts.push(`L${s.line}|${s.code}  // ${s.type}`);
    });
    parts.push("");
  }
  
  if (functions.length > 0) {
    parts.push("Functions:");
    functions.forEach(f => {
      parts.push(`L${f.line}|${f.signature}`);
    });
  }
  
  return parts.join("\n");
}

export function summarizeFiles(
  files: { path: string; content: string }[],
): CodeSummary[] {
  return files.map(file => summarizeFile(file.path, file.content));
}

export function calculateSavings(summaries: CodeSummary[]): {
  originalTokens: number;
  summaryTokens: number;
  savings: number;
  savingsPercent: number;
} {
  const originalTokens = summaries.reduce((sum, s) => sum + s.originalTokens, 0);
  const summaryTokens = summaries.reduce((sum, s) => sum + s.estimatedTokens, 0);
  const savings = originalTokens - summaryTokens;
  const savingsPercent = originalTokens > 0 ? (savings / originalTokens) * 100 : 0;
  
  return { originalTokens, summaryTokens, savings, savingsPercent };
}

export function chunkFiles(
  summaries: CodeSummary[],
  maxChunkTokens: number = 1500
): string[] {
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  
  for (const summary of summaries) {
    if (currentTokens + summary.estimatedTokens > maxChunkTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n\n"));
      currentChunk = [];
      currentTokens = 0;
    }
    currentChunk.push(summary.summary);
    currentTokens += summary.estimatedTokens;
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n\n"));
  }
  
  return chunks;
}
