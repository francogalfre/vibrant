import type { Rule } from "../core/types.js";

import noExplicitAny from "./no-explicit-any.js";
import consoleLogDebugging from "./console-log-debugging.js";
import emptyFunctionBody from "./empty-function-body.js";
import unimplementedError from "./unimplemented-error.js";
import hardcodedCredentials from "./hardcoded-credentials.js";
import emptyCatchBlock from "./empty-catch-block.js";
import noSqlInjection from "./no-sql-injection.js";
import noUnsafeInnerHtml from "./no-unsafe-inner-html.js";
import noAwaitInLoop from "./no-await-in-loop.js";
import noUnreachable from "./no-unreachable.js";
import useIsnan from "./use-isnan.js";
import aiCommentEmojis from "./ai-comment-emojis.js";
import magicNumbers from "./magic-numbers.js";
import aiTodoComments from "./ai-todo-comments.js";

/**
 * ALL RULES - Only real bugs and security issues
 * 
 * These rules detect actual problems that cause:
 * - Runtime crashes
 * - Security vulnerabilities
 * - Performance issues
 * - Confusing behavior
 */
export const rules: Record<string, Rule> = {
  // ===== TYPE SAFETY =====
  "no-explicit-any": noExplicitAny,

  // ===== INCOMPLETE CODE (will crash) =====
  "unimplemented-error": unimplementedError,
  "empty-function-body": emptyFunctionBody,

  // ===== ERROR HANDLING =====
  "empty-catch-block": emptyCatchBlock,

  // ===== SECURITY =====
  "hardcoded-credentials": hardcodedCredentials,
  "no-sql-injection": noSqlInjection,
  "no-unsafe-inner-html": noUnsafeInnerHtml,

  // ===== PERFORMANCE =====
  "no-await-in-loop": noAwaitInLoop,

  // ===== POSSIBLE BUGS =====
  "no-unreachable": noUnreachable,
  "use-isnan": useIsnan,

  // ===== CODE QUALITY (warnings) =====
  "console-log-debugging": consoleLogDebugging,

  // ===== AI TELLTALES =====
  "ai-comment-emojis": aiCommentEmojis,
  "ai-todo-comments": aiTodoComments,

  // ===== BEST PRACTICES =====
  "magic-numbers": magicNumbers,
};

export default rules;

// Human-readable descriptions
export const ruleDescriptions: Record<string, { 
  description: string; 
  why: string;
  severity: "error" | "warning";
  category: string;
}> = {
  // ===== TYPE SAFETY =====
  "no-explicit-any": {
    description: "Using 'any' defeats TypeScript's type checking",
    why: "Can cause runtime crashes. Use 'unknown' or proper types.",
    severity: "error",
    category: "Type Safety",
  },

  // ===== INCOMPLETE CODE =====
  "unimplemented-error": {
    description: "Code throws 'not implemented' error",
    why: "Will crash when executed. Complete or remove the code.",
    severity: "error",
    category: "Incomplete Code",
  },
  "empty-function-body": {
    description: "Function has no implementation",
    why: "Returns undefined unexpectedly. Add logic or remove.",
    severity: "error",
    category: "Incomplete Code",
  },

  // ===== ERROR HANDLING =====
  "empty-catch-block": {
    description: "Catch block silently ignores errors",
    why: "Errors disappear silently. Handle them or remove try-catch.",
    severity: "error",
    category: "Error Handling",
  },

  // ===== SECURITY =====
  "hardcoded-credentials": {
    description: "Potential secrets in code",
    why: "Security risk. Use environment variables.",
    severity: "error",
    category: "Security",
  },
  "no-sql-injection": {
    description: "Potential SQL injection vulnerability",
    why: "User input concatenated into SQL queries can be exploited. Use parameterized queries.",
    severity: "error",
    category: "Security",
  },
  "no-unsafe-inner-html": {
    description: "Potential XSS vulnerability",
    why: "Using unsanitized user input in HTML can lead to XSS attacks.",
    severity: "error",
    category: "Security",
  },

  // ===== PERFORMANCE =====
  "no-await-in-loop": {
    description: "Using 'await' inside a loop",
    why: "Causes sequential execution instead of parallel. Use Promise.all() for better performance.",
    severity: "error",
    category: "Performance",
  },

  // ===== POSSIBLE BUGS =====
  "no-unreachable": {
    description: "Unreachable code after return/throw",
    why: "Dead code that will never execute. Remove it.",
    severity: "error",
    category: "Possible Bugs",
  },
  "use-isnan": {
    description: "Using ===/!== to compare with NaN",
    why: "NaN === NaN returns false. Use Number.isNaN() instead.",
    severity: "error",
    category: "Possible Bugs",
  },

  // ===== CODE QUALITY =====
  "console-log-debugging": {
    description: "Debug console statements",
    why: "Should not be in production code, use proper logging.",
    severity: "warning",
    category: "Code Quality",
  },

  // ===== AI TELLTALES =====
  "ai-comment-emojis": {
    description: "Emojis in code comments",
    why: "Common pattern in AI-generated code. Use plain text comments.",
    severity: "warning",
    category: "AI Telltales",
  },
  "ai-todo-comments": {
    description: "Excessive TODO/FIXME comments",
    why: "AI often leaves many incomplete TODOs. Complete or remove them.",
    severity: "warning",
    category: "AI Telltales",
  },

  // ===== BEST PRACTICES =====
  "magic-numbers": {
    description: "Unnamed numeric constants",
    why: "Magic numbers hurt readability. Extract to named constants.",
    severity: "warning",
    category: "Best Practices",
  },
};
