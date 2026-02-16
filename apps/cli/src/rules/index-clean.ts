/**
 * Vibrant Rules - Only Real Bugs
 * No opinionated style rules, only actual problems
 */

import type { Rule } from "../core/types.js";

// CRITICAL: These detect actual bugs
export const criticalRules: Record<string, Rule> = {
  // Type safety - using any defeats TypeScript
  "no-explicit-any": await import("./no-explicit-any.js").then(m => m.default),
  
  // Incomplete code that will crash
  "unimplemented-error": await import("./unimplemented-error.js").then(m => m.default),
  "empty-function-body": await import("./empty-function-body.js").then(m => m.default),
  
  // Error handling bugs
  "empty-catch-block": await import("./empty-catch-block.js").then(m => m.default),
  
  // Security
  "hardcoded-credentials": await import("./hardcoded-credentials.js").then(m => m.default),
};

// WARNINGS: These might be problems in production
export const warningRules: Record<string, Rule> = {
  // Debug code left in production
  "console-log-debugging": await import("./console-log-debugging.js").then(m => m.default),
};

// ALL RULES - Clean, minimal set
export const rules: Record<string, Rule> = {
  ...criticalRules,
  ...warningRules,
};

export default rules;

// Rule descriptions for CLI
export const ruleDescriptions: Record<string, { description: string; why: string }> = {
  "no-explicit-any": {
    description: "Using 'any' defeats TypeScript's type checking",
    why: "Causes runtime errors that TypeScript could have prevented",
  },
  "unimplemented-error": {
    description: "Function throws 'not implemented' error",
    why: "Code will crash when called, should be completed or removed",
  },
  "empty-function-body": {
    description: "Function has no implementation",
    why: "Will return undefined unexpectedly, causing bugs",
  },
  "empty-catch-block": {
    description: "Catch block ignores errors",
    why: "Errors are silently swallowed, making debugging impossible",
  },
  "hardcoded-credentials": {
    description: "Potential secrets in code",
    why: "Security risk - credentials should be in environment variables",
  },
  "console-log-debugging": {
    description: "Debug console statements",
    why: "Should not be in production code, use proper logging instead",
  },
};
