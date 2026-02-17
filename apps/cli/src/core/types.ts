import type { Node, SourceFile } from "typescript";

export type Severity = "error" | "warn" | "off" | "info";

export type RuleType = "problem" | "suggestion" | "layout";

export interface RuleDocs {
  description: string;
  category?: string;
  recommended?: boolean;
  url?: string;
}

export interface RuleMeta {
  type: RuleType;
  docs: RuleDocs;
  fixable?: "code" | "whitespace";
  hasSuggestions?: boolean;
  schema?: JSONSchema[];
  deprecated?: boolean;
  replacedBy?: string[];
  messages?: Record<string, string>;
}

export interface JSONSchema {
  type?: string | string[];
  enum?: unknown[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  additionalProperties?: boolean | JSONSchema;
  required?: string[];
  description?: string;
  default?: unknown;
}

export interface Fix {
  range: [number, number];
  text: string;
}

export interface Suggestion {
  messageId: string;
  desc: string;
  fix: Fix;
  data?: Record<string, string>;
}

export interface ReportDescriptor {
  messageId?: string;
  message?: string;
  node?: Node;
  loc?: SourceLocation;
  data?: Record<string, string>;
  fix?(fixer: RuleFixer): Fix | Iterable<Fix> | null;
  suggest?: SuggestionDescriptor[];
}

export interface SuggestionDescriptor {
  messageId: string;
  data?: Record<string, string>;
  fix(fixer: RuleFixer): Fix | Iterable<Fix> | null;
}

export interface SourceLocation {
  line: number;
  column: number;
}

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: Severity;
  ruleId: string;
  messageId?: string;
  fix?: Fix;
  suggestions?: Suggestion[];
  data?: Record<string, string>;
}

export interface LintResult {
  file: string;
  diagnostics: Diagnostic[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
}

export interface RuleFixer {
  insertTextAfter(nodeOrToken: Node, text: string): Fix;
  insertTextAfterRange(range: readonly [number, number], text: string): Fix;
  insertTextBefore(nodeOrToken: Node, text: string): Fix;
  insertTextBeforeRange(range: readonly [number, number], text: string): Fix;
  remove(nodeOrToken: Node): Fix;
  removeRange(range: readonly [number, number]): Fix;
  replaceText(nodeOrToken: Node, text: string): Fix;
  replaceTextRange(range: readonly [number, number], text: string): Fix;
}

export interface RuleContext {
  file: string;
  source: string;
  sourceFile: SourceFile;
  options: unknown[];
  report(descriptor: ReportDescriptor): void;
  getAncestors(): Node[];
  getDeclaredVariables(node: Node): Node[];
  getFilename(): string;
  getScope(): unknown;
  getSourceCode(): SourceCode;
  markVariableAsUsed(name: string): boolean;
}

export interface SourceCode {
  text: string;
  ast: SourceFile;
  lines: string[];
  getText(node?: Node): string;
  getLines(): string[];
  getAllComments(): Comment[];
  getCommentsBefore(node: Node): Comment[];
  getCommentsAfter(node: Node): Comment[];
  getCommentsInside(node: Node): Comment[];
  getJSDocComment(node: Node): Comment | null;
  getFirstToken(node: Node): Node | null;
  getLastToken(node: Node): Node | null;
  getTokenAfter(node: Node): Node | null;
  getTokenBefore(node: Node): Node | null;
  getFirstTokens(node: Node, count?: number): Node[];
  getLastTokens(node: Node, count?: number): Node[];
}

export interface Comment {
  type: "Line" | "Block";
  value: string;
  range: [number, number];
  loc: SourceLocation;
}

export type RuleListener = Record<string, (node: Node) => void>;

export interface RuleModule {
  meta: RuleMeta;
  create(context: RuleContext): RuleListener;
}

export type Rule = RuleModule;

export type { LintOptions } from "./linter.js";

export interface Plugin {
  meta?: {
    name: string;
    version: string;
  };
  rules?: Record<string, Rule>;
  configs?: Record<string, Config>;
  processors?: Record<string, Processor>;
}

export interface Processor {
  preprocess?(text: string, filename: string): string[];
  postprocess?(messages: Diagnostic[][], filename: string): Diagnostic[];
  supportsAutofix?: boolean;
}

export interface Config {
  name?: string;
  files?: string[];
  ignores?: string[];
  ignore?: string[];
  format?: "pretty" | "stylish" | "compact" | "json" | "plan";
  provider?: "openai" | "claude" | "gemini" | "ollama";
  languageOptions?: LanguageOptions;
  linterOptions?: LinterOptions;
  rules?: Record<string, RuleConfig>;
  plugins?: Record<string, Plugin>;
  settings?: Record<string, unknown>;
  extends?: string | string[];
  processor?: string;
}

export type RuleConfig = Severity | [Severity, ...unknown[]];

export interface LanguageOptions {
  ecmaVersion?: number;
  sourceType?: "script" | "module";
  globals?: Record<string, boolean | "readonly" | "writable" | "off">;
  parser?: string;
  parserOptions?: Record<string, unknown>;
}

export interface LinterOptions {
  noInlineConfig?: boolean;
  reportUnusedDisableDirectives?: boolean;
}

export interface OverrideConfig extends Config {
  files: string[];
  excludes?: string[];
}

export interface FlatConfig extends Config {
  extends?: string | string[];
}

export interface TestCase {
  code: string;
  options?: unknown[];
  filename?: string;
  errors?: TestError[];
  output?: string;
}

export interface TestError {
  messageId?: string;
  message?: string;
  line?: number;
  column?: number;
  type?: string;
  suggestions?: Array<{
    messageId: string;
    desc?: string;
    output?: string;
  }>;
}

export interface CLIOptions {
  config?: string;
  configLookup?: boolean;
  errorOnUnmatchedPattern?: boolean;
  exitOnFatalError?: boolean;
  ext?: string[];
  fix?: boolean;
  fixDryRun?: boolean;
  fixType?: string[];
  format?: string;
  help?: boolean;
  ignore?: boolean;
  ignorePath?: string;
  ignorePattern?: string[];
  inlineConfig?: boolean;
  maxWarnings?: number;
  outputFile?: string;
  quiet?: boolean;
  reportUnusedDisableDirectives?: boolean;
  resolvePluginsRelativeTo?: string;
  rules?: Record<string, RuleConfig>;
  stdin?: boolean;
  stdinFilename?: string;
  verbose?: boolean;
  version?: boolean;
  warnIgnored?: boolean;
}

export interface Formatter {
  name: string;
  format(results: LintResult[], options?: unknown): string;
}

export interface CacheOptions {
  cache?: boolean;
  cacheLocation?: string;
  cacheStrategy?: "metadata" | "content";
}
