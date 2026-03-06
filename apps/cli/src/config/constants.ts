export const RULE_META: Record<
  string,
  { description: string; severity: "error" | "warning" | "info" }
> = {
  // ===== AI TELLTALES =====
  "ai-todo-comments": {
    description: "Excessive TODO/FIXME comments - common in AI code",
    severity: "warning",
  },
  "ai-comment-emojis": {
    description: "Emojis in code comments - AI telltale",
    severity: "warning",
  },

  // ===== INCOMPLETE CODE =====
  "unimplemented-error": {
    description: "Placeholder errors (not implemented, TODO, etc.)",
    severity: "error",
  },

  // ===== ERROR HANDLING =====
  "empty-catch-block": {
    description: "Empty catch block - silently swallows errors",
    severity: "warning",
  },

  // ===== SECURITY =====
  "hardcoded-credentials": {
    description: "Potential hardcoded secrets/credentials",
    severity: "error",
  },
  "no-sql-injection": {
    description: "Potential SQL injection vulnerability",
    severity: "error",
  },
  "no-unsafe-inner-html": {
    description: "Potential XSS vulnerability (unsafe innerHTML)",
    severity: "error",
  },

  // ===== TYPE SAFETY =====
  "no-explicit-any": {
    description: "Explicit use of the `any` type",
    severity: "warning",
  },

  // ===== CODE QUALITY =====
  "console-log-debugging": {
    description: "Debug console statements in code",
    severity: "warning",
  },
  "magic-numbers": {
    description: "Unnamed numeric constants (magic numbers)",
    severity: "warning",
  },

  // ===== BEST PRACTICES =====
  "no-await-in-loop": {
    description: "Using await inside loops - performance issue",
    severity: "warning",
  },
  "no-unreachable": {
    description: "Unreachable code after return/throw",
    severity: "warning",
  },
  "use-isnan": {
    description: "Using ===/!== to compare with NaN",
    severity: "warning",
  },
};
