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

export function summarizeFile(
  filePath: string,
  content: string,
): CodeSummary {
  const originalTokens = estimateTokens(content);
  const lines = content.split("\n");
  
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  const elements: Array<{ line: number; text: string }> = [];
  
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const name = node.name.text;
      const params = node.parameters.map(p => p.name.getText(sourceFile)).join(", ");
      const async = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : "";
      elements.push({ line, text: `${async}fn ${name}(${params})` });
    }
    
    if (ts.isArrowFunction(node)) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const name = parent.name.text;
        const params = node.parameters.map(p => p.name.getText(sourceFile)).join(", ");
        const async = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : "";
        elements.push({ line, text: `${async}${name}(${params})` });
      }
    }
    
    if (ts.isClassDeclaration(node) && node.name) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      elements.push({ line, text: `class ${node.name.text}` });
    }
    
    if (ts.isInterfaceDeclaration(node)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      elements.push({ line, text: `interface ${node.name.text}` });
    }
    
    if (ts.isTypeAliasDeclaration(node)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      elements.push({ line, text: `type ${node.name.text}` });
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  
  const compactLines = elements.map(e => `L${e.line}:${e.text}`);
  const summary = `${filePath}\n${compactLines.join("\n")}`;
  
  return {
    path: filePath,
    summary,
    complexity: elements.length,
    estimatedTokens: estimateTokens(summary),
    originalTokens,
  };
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
