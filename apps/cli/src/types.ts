export interface LintIssue {
  ruleId: string;
  message: string;
  severity: "error" | "warning" | "info";
  line: number;
  column: number;
  file: string;
  suggestion?: string;
}

export interface LinterOptions {
  path: string;
  format?: "pretty" | "stylish" | "compact" | "json" | "plan";
  ignore?: string[];
  ai?: boolean;
  aiProvider?: "openai" | "claude" | "gemini" | "ollama";
}

export interface LinterResult {
  issues: LintIssue[];
  filesAnalyzed: number;
  filesWithIssues: number;
  duration: number;
}
