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
  format?: "pretty" | "json" | "compact";
  ignore?: string[];
}

export interface LinterResult {
  issues: LintIssue[];
  filesAnalyzed: number;
  filesWithIssues: number;
  duration: number;
}
