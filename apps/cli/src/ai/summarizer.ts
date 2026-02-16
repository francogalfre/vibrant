import ts from "typescript";

/**
 * Code Summarizer - Reduces token usage by sending summaries instead of full code
 * Extracts: function signatures, class definitions, imports, exports
 * Removes: implementation details, comments, whitespace
 */

export interface CodeSummary {
  path: string;
  summary: string;
  complexity: number;
  functions: FunctionSummary[];
  imports: string[];
  exports: string[];
  estimatedTokens: number;
  originalTokens: number;
}

export interface FunctionSummary {
  name: string;
  signature: string;
  params: string;
  returnType?: string;
  line: number;
  isAsync: boolean;
  hasImplementation: boolean;
}

interface SummarizeOptions {
  maxTokensPerFile?: number;
  includeImplementations?: boolean;
  includeComments?: boolean;
  includeTypes?: boolean;
}

const DEFAULT_OPTIONS: SummarizeOptions = {
  maxTokensPerFile: 500,
  includeImplementations: false,
  includeComments: false,
  includeTypes: true,
};

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 chars)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Summarize a single TypeScript file
 */
export function summarizeFile(
  filePath: string,
  content: string,
  options: SummarizeOptions = {}
): CodeSummary {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalTokens = estimateTokens(content);
  
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  const functions: FunctionSummary[] = [];
  const imports: string[] = [];
  const exports: string[] = [];
  let complexity = 0;
  
  function visit(node: ts.Node) {
    // Track complexity
    if (
      ts.isIfStatement(node) ||
      ts.isForStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isSwitchStatement(node)
    ) {
      complexity++;
    }
    
    // Extract imports
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, "");
      const importClause = node.importClause;
      if (importClause) {
        const imports_list: string[] = [];
        if (importClause.name) {
          imports_list.push(importClause.name.text);
        }
        if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
          importClause.namedBindings.elements.forEach(el => {
            imports_list.push(el.name.text);
          });
        }
        imports.push(`${imports_list.join(", ")} from "${moduleSpecifier}"`);
      } else {
        imports.push(`import "${moduleSpecifier}"`);
      }
    }
    
    // Extract exports
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        const names = node.exportClause.elements.map(el => el.name.text);
        exports.push(...names);
      }
    }
    
    if (ts.isExportAssignment(node)) {
      const name = ts.isIdentifier(node.expression) 
        ? node.expression.text 
        : "default";
      exports.push(name);
    }
    
    // Extract function summaries
    if (ts.isFunctionDeclaration(node) && node.name) {
      const signature = extractFunctionSignature(node, sourceFile);
      functions.push(signature);
    }
    
    if (ts.isArrowFunction(node)) {
      // Arrow functions in variable declarations
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        const signature = extractArrowFunctionSignature(parent.name.text, node, sourceFile);
        functions.push(signature);
      }
    }
    
    if (ts.isMethodDeclaration(node) && node.name) {
      const signature = extractMethodSignature(node, sourceFile);
      functions.push(signature);
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  
  // Build summary
  const summary = buildSummary(filePath, imports, exports, functions, opts);
  const estimatedTokens = estimateTokens(summary);
  
  return {
    path: filePath,
    summary,
    complexity,
    functions,
    imports,
    exports,
    estimatedTokens,
    originalTokens,
  };
}

function extractFunctionSignature(
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile
): FunctionSummary {
  const name = node.name?.text || "anonymous";
  const params = node.parameters
    .map(p => {
      const name = p.name.getText(sourceFile);
      const type = p.type ? `: ${p.type.getText(sourceFile)}` : "";
      return `${name}${type}`;
    })
    .join(", ");
  
  const returnType = node.type?.getText(sourceFile);
  const signature = `function ${name}(${params})${returnType ? `: ${returnType}` : ""}`;
  
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
  const hasImplementation = !!node.body && node.body.statements.length > 0;
  
  return {
    name,
    signature,
    params,
    returnType,
    line,
    isAsync,
    hasImplementation,
  };
}

function extractArrowFunctionSignature(
  name: string,
  node: ts.ArrowFunction,
  sourceFile: ts.SourceFile
): FunctionSummary {
  const params = node.parameters
    .map(p => {
      const paramName = p.name.getText(sourceFile);
      const type = p.type ? `: ${p.type.getText(sourceFile)}` : "";
      return `${paramName}${type}`;
    })
    .join(", ");
  
  const returnType = node.type?.getText(sourceFile);
  const signature = `const ${name} = (${params})${returnType ? `: ${returnType}` : ""} => {...}`;
  
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
  const hasImplementation = true; // Arrow functions always have implementation
  
  return {
    name,
    signature,
    params,
    returnType,
    line,
    isAsync,
    hasImplementation,
  };
}

function extractMethodSignature(
  node: ts.MethodDeclaration,
  sourceFile: ts.SourceFile
): FunctionSummary {
  const name = node.name.getText(sourceFile);
  const params = node.parameters
    .map(p => {
      const paramName = p.name.getText(sourceFile);
      const type = p.type ? `: ${p.type.getText(sourceFile)}` : "";
      return `${paramName}${type}`;
    })
    .join(", ");
  
  const returnType = node.type?.getText(sourceFile);
  const signature = `${name}(${params})${returnType ? `: ${returnType}` : ""}`;
  
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
  const hasImplementation = !!node.body && node.body.statements.length > 0;
  
  return {
    name,
    signature,
    params,
    returnType,
    line,
    isAsync,
    hasImplementation,
  };
}

function buildSummary(
  filePath: string,
  imports: string[],
  exports: string[],
  functions: FunctionSummary[],
  opts: SummarizeOptions
): string {
  const lines: string[] = [];
  
  lines.push(`// ${filePath}`);
  lines.push("");
  
  // Imports (abbreviated)
  if (imports.length > 0 && opts.includeTypes) {
    lines.push("// Imports:");
    imports.slice(0, 5).forEach(imp => lines.push(`//   ${imp}`));
    if (imports.length > 5) {
      lines.push(`//   ... and ${imports.length - 5} more`);
    }
    lines.push("");
  }
  
  // Functions (the meat)
  if (functions.length > 0) {
    lines.push("// Functions:");
    functions.forEach(fn => {
      const async = fn.isAsync ? "async " : "";
      const impl = fn.hasImplementation ? "" : " // TODO: implement";
      lines.push(`${async}${fn.signature}${impl}`);
    });
    lines.push("");
  }
  
  // Exports
  if (exports.length > 0) {
    lines.push(`// Exports: ${exports.join(", ")}`);
  }
  
  return lines.join("\n");
}

/**
 * Summarize multiple files
 */
export function summarizeFiles(
  files: { path: string; content: string }[],
  options?: SummarizeOptions
): CodeSummary[] {
  return files.map(file => summarizeFile(file.path, file.content, options));
}

/**
 * Smart chunking - split files into smaller analyzable chunks
 */
export function chunkFiles(
  summaries: CodeSummary[],
  maxChunkTokens: number = 1500
): string[] {
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  
  for (const summary of summaries) {
    if (summary.estimatedTokens > maxChunkTokens) {
      // File too big, add function by function
      for (const fn of summary.functions) {
        const fnText = `${summary.path}:${fn.line}\n${fn.signature}`;
        const fnTokens = estimateTokens(fnText);
        
        if (currentTokens + fnTokens > maxChunkTokens && currentChunk.length > 0) {
          chunks.push(currentChunk.join("\n\n"));
          currentChunk = [];
          currentTokens = 0;
        }
        
        currentChunk.push(fnText);
        currentTokens += fnTokens;
      }
    } else {
      if (currentTokens + summary.estimatedTokens > maxChunkTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.join("\n\n"));
        currentChunk = [];
        currentTokens = 0;
      }
      
      currentChunk.push(summary.summary);
      currentTokens += summary.estimatedTokens;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n\n"));
  }
  
  return chunks;
}

/**
 * Calculate total savings from summarization
 */
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
  
  return {
    originalTokens,
    summaryTokens,
    savings,
    savingsPercent,
  };
}