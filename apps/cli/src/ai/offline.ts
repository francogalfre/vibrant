import type { AIFileContent, AIIssue, AIAnalysisResult } from "./types.js";

/**
 * Offline AI Analysis - Only REAL BUGS, no opinionated style rules
 * Works 100% without API calls - perfect for free tier
 */

interface Pattern {
  name: string;
  pattern: RegExp;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion: string;
}

// ONLY REAL BUGS - No opinionated style rules
// Removed: generic names, magic numbers, TODO comments, hardcoded URLs
const AI_PATTERNS: Pattern[] = [
  // CRITICAL: Type safety
  {
    name: "explicit-any",
    pattern: /:\s*any\b/,
    severity: "error",
    message: "Using 'any' defeats TypeScript's type safety",
    suggestion: "Use 'unknown' or a specific type instead",
  },
  
  // CRITICAL: Incomplete code that will crash
  {
    name: "not-implemented",
    pattern: /throw\s+new\s+Error\s*\(\s*["'][^"']*(not implemented|todo|fixme)["']/i,
    severity: "error",
    message: "Function throws 'not implemented' error - will crash when called",
    suggestion: "Implement the function or remove it",
  },
  {
    name: "empty-function",
    pattern: /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/,
    severity: "error",
    message: "Empty function body - returns undefined unexpectedly",
    suggestion: "Add implementation or remove the function",
  },
  
  // CRITICAL: Error handling bugs
  {
    name: "empty-catch",
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: "error",
    message: "Empty catch block silently swallows errors",
    suggestion: "Handle the error properly or remove the try-catch",
  },
  {
    name: "console-error-only",
    pattern: /catch\s*\([^)]*\)\s*\{\s*console\.(error|log|warn)\s*\([^)]*\)\s*;?\s*\}/,
    severity: "warning",
    message: "Catch block only logs to console without proper handling",
    suggestion: "Implement proper error handling or re-throw the error",
  },
  
  // CRITICAL: Security
  {
    name: "hardcoded-secret",
    pattern: /["'](?:api[_-]?key|token|password|secret)\s*[=:]\s*["'][^"']{8,}["']/i,
    severity: "error",
    message: "Potential hardcoded secret in code",
    suggestion: "Move secrets to environment variables",
  },
  
  // WARNING: Debug code (not critical, might be intentional)
  {
    name: "console-log",
    pattern: /console\.(log|debug)\s*\(/,
    severity: "warning",
    message: "Debug console statement found",
    suggestion: "Remove debug statements or use proper logging",
  },
  
  // Type safety issues
  {
    name: "type-assertion",
    pattern: /as\s+\w+/,
    severity: "warning",
    message: "Type assertion without validation",
    suggestion: "Add runtime validation before type assertion",
  },
  {
    name: "non-null-assertion",
    pattern: /\w+!\./,
    severity: "warning",
    message: "Non-null assertion used",
    suggestion: "Add proper null checks instead of using !",
  },
];

/**
 * Analyze files using offline patterns (no API calls)
 */
export function analyzeOffline(files: AIFileContent[]): AIAnalysisResult {
  const issues: AIIssue[] = [];
  
  for (const file of files) {
    const lines = file.content.split("\n");
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (const pattern of AI_PATTERNS) {
        if (pattern.pattern.test(line)) {
          // Find column (approximate)
          const match = line.match(pattern.pattern);
          const column = match ? line.indexOf(match[0]) + 1 : 1;
          
          issues.push({
            file: file.path,
            line: lineIndex + 1,
            column,
            severity: pattern.severity,
            ruleId: `ai-offline:${pattern.name}`,
            message: pattern.message,
            suggestion: pattern.suggestion,
            explanation: "Detected using offline pattern matching - no API call made",
          });
        }
      }
    }
  }
  
  return { issues };
}

/**
 * Check if offline mode should be used
 */
export function shouldUseOffline(provider?: string, error?: Error): boolean {
  // Use offline if explicitly requested
  if (provider === "offline") return true;
  
  // Use offline if we got quota/rate limit errors
  if (error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("quota") ||
      message.includes("429") ||
      message.includes("rate limit") ||
      message.includes("billing") ||
      message.includes("exceeded")
    );
  }
  
  return false;
}

/**
 * Get offline mode info
 */
export function getOfflineInfo(): {
  patterns: number;
  coverage: string;
  limitations: string[];
} {
  return {
    patterns: AI_PATTERNS.length,
    coverage: "Real bugs only (no opinionated rules)",
    limitations: [
      "Cannot detect complex contextual issues",
      "No semantic analysis",
      "Pattern-based only",
    ],
  };
}
