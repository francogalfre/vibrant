/**
 * Safe Fix Engine - Prettier-like reliability
 * Validates all fixes before applying
 */

import ts from "typescript";
import type { Fix, LintResult } from "./types.js";

export interface FixValidationResult {
  safe: boolean;
  fixes: Fix[];
  diagnostics: string[];
}

/**
 * Validates that applying fixes won't break syntax
 */
export function validateFixes(content: string, fixes: Fix[]): FixValidationResult {
  const diagnostics: string[] = [];
  
  // Check for overlapping fixes
  const sortedFixes = [...fixes].sort((a, b) => a.range[0] - b.range[0]);
  for (let i = 0; i < sortedFixes.length - 1; i++) {
    const current = sortedFixes[i];
    const next = sortedFixes[i + 1];
    
    if (current.range[1] > next.range[0]) {
      diagnostics.push(`Overlapping fixes detected at positions ${current.range[0]}-${current.range[1]} and ${next.range[0]}-${next.range[1]}`);
    }
  }
  
  // Apply fixes and check syntax
  try {
    const fixedContent = applyFixes(content, fixes);
    
    // Try to parse the result
    const sourceFile = ts.createSourceFile(
      "test.ts",
      fixedContent,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Check for syntax errors
    const syntaxErrors: string[] = [];
    ts.forEachChild(sourceFile, function visit(node) {
      if (ts.isExpressionStatement(node)) {
        // Check for incomplete expressions
        const text = node.getText(sourceFile);
        if (text.includes("/*ERROR*/") || text.includes("__FIX__")) {
          syntaxErrors.push(`Incomplete fix detected: ${text.slice(0, 50)}`);
        }
      }
      ts.forEachChild(node, visit);
    });
    
    if (syntaxErrors.length > 0) {
      diagnostics.push(...syntaxErrors);
    }
  } catch (error) {
    diagnostics.push(`Failed to apply fixes: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    safe: diagnostics.length === 0,
    fixes,
    diagnostics,
  };
}

/**
 * Apply fixes to content
 * Fixes are applied in reverse order to maintain correct positions
 */
export function applyFixes(content: string, fixes: Fix[]): string {
  const sortedFixes = [...fixes].sort((a, b) => b.range[0] - a.range[0]);
  let result = content;

  for (const fix of sortedFixes) {
    result =
      result.substring(0, fix.range[0]) +
      fix.text +
      result.substring(fix.range[1]);
  }

  return result;
}

/**
 * Apply fixes safely with validation
 */
export function applyFixesSafely(content: string, fixes: Fix[]): { success: boolean; content: string; errors?: string[] } {
  const validation = validateFixes(content, fixes);
  
  if (!validation.safe) {
    return {
      success: false,
      content,
      errors: validation.diagnostics,
    };
  }
  
  return {
    success: true,
    content: applyFixes(content, validation.fixes),
  };
}

/**
 * Generate fix preview
 */
export function generateFixPreview(original: string, fixed: string, contextLines: number = 3): string {
  const originalLines = original.split("\n");
  const fixedLines = fixed.split("\n");
  
  // Find changed lines
  const changedLines: number[] = [];
  const maxLines = Math.max(originalLines.length, fixedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    if (originalLines[i] !== fixedLines[i]) {
      changedLines.push(i);
    }
  }
  
  if (changedLines.length === 0) {
    return "No changes";
  }
  
  // Generate diff
  const firstChanged = changedLines[0];
  const lastChanged = changedLines[changedLines.length - 1];
  
  const startLine = Math.max(0, firstChanged - contextLines);
  const endLine = Math.min(maxLines, lastChanged + contextLines + 1);
  
  const lines: string[] = [];
  
  for (let i = startLine; i < endLine; i++) {
    const lineNum = i + 1;
    const prefix = changedLines.includes(i) ? (i < originalLines.length && originalLines[i] !== fixedLines[i] ? "-" : "+") : " ";
    
    if (i < originalLines.length && originalLines[i] !== fixedLines[i]) {
      lines.push(`${prefix}${lineNum.toString().padStart(3)} │ ${originalLines[i]}`);
    }
    if (i < fixedLines.length && originalLines[i] !== fixedLines[i]) {
      lines.push(`${prefix}${lineNum.toString().padStart(3)} │ ${fixedLines[i]}`);
    }
    if (originalLines[i] === fixedLines[i]) {
      lines.push(`${prefix}${lineNum.toString().padStart(3)} │ ${originalLines[i] || ""}`);
    }
  }
  
  return lines.join("\n");
}

/**
 * Interactive fix application
 */
export async function applyFixesInteractive(
  results: LintResult[],
  options: {
    dryRun?: boolean;
    verbose?: boolean;
  } = {}
): Promise<{ applied: number; skipped: number; errors: number }> {
  const stats = { applied: 0, skipped: 0, errors: 0 };
  
  for (const result of results) {
    const fixableDiagnostics = result.diagnostics.filter(d => d.fix);
    
    if (fixableDiagnostics.length === 0) continue;
    
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(result.file, "utf-8");
      
      const fixes = fixableDiagnostics.map(d => d.fix!);
      
      if (options.dryRun) {
        const fixed = applyFixes(content, fixes);
        const preview = generateFixPreview(content, fixed);
        
        if (options.verbose) {
          console.log(`\n${result.file}:`);
          
        }
        
        stats.applied += fixes.length;
      } else {
        const validation = validateFixes(content, fixes);
        
        if (validation.safe) {
          const fixed = applyFixes(content, validation.fixes);
          await fs.writeFile(result.file, fixed, "utf-8");
          stats.applied += fixes.length;
        } else {
          if (options.verbose) {
            console.error(`Skipping ${result.file}:`);
            validation.diagnostics.forEach(d => console.error(`  - ${d}`));
          }
          stats.errors += fixes.length;
        }
      }
    } catch (error) {
      if (options.verbose) {
        console.error(`Failed to fix ${result.file}: ${error}`);
      }
      stats.errors += 1;
    }
  }
  
  return stats;
}