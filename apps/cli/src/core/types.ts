export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: Severity;
  ruleId: string;
  suggestion?: string;
}

export interface LintResult {
  file: string;
  diagnostics: Diagnostic[];
}

export interface LintOptions {
  rules?: string[];
  severity?: Partial<Record<string, Severity>>;
}

export interface RuleContext {
  file: string;
  source: string;
}

export type Rule = (
  context: RuleContext,
  node: import("typescript").Node
) => Diagnostic[];
