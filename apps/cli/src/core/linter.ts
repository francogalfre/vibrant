import ts from "typescript";
import type {
  Diagnostic,
  LintResult,
  Rule,
  RuleContext,
  ReportDescriptor,
  Fix,
  RuleListener,
  SourceCode,
  Comment,
  RuleFixer,
} from "./types.js";

export interface LintOptions {
  rules: Map<string, Rule>;
  ruleConfig: Map<string, [string, ...unknown[]]>;
  fix?: boolean;
}

class RuleFixerImpl implements RuleFixer {
  constructor(private sourceFile: ts.SourceFile) {}

  insertTextAfter(nodeOrToken: ts.Node, text: string): Fix {
    const end = nodeOrToken.getEnd();
    return { range: [end, end], text };
  }

  insertTextAfterRange(range: readonly [number, number], text: string): Fix {
    return { range: [range[1], range[1]], text };
  }

  insertTextBefore(nodeOrToken: ts.Node, text: string): Fix {
    const start = nodeOrToken.getStart();
    return { range: [start, start], text };
  }

  insertTextBeforeRange(range: readonly [number, number], text: string): Fix {
    return { range: [range[0], range[0]], text };
  }

  remove(nodeOrToken: ts.Node): Fix {
    const start = nodeOrToken.getStart();
    const end = nodeOrToken.getEnd();
    return { range: [start, end], text: "" };
  }

  removeRange(range: readonly [number, number]): Fix {
    return { range: [range[0], range[1]], text: "" };
  }

  replaceText(nodeOrToken: ts.Node, text: string): Fix {
    const start = nodeOrToken.getStart();
    const end = nodeOrToken.getEnd();
    return { range: [start, end], text };
  }

  replaceTextRange(range: readonly [number, number], text: string): Fix {
    return { range: [range[0], range[1]], text };
  }
}

class SourceCodeImpl implements SourceCode {
  lines: string[];

  constructor(
    public text: string,
    public ast: ts.SourceFile,
  ) {
    this.lines = text.split("\n");
  }

  getText(node?: ts.Node): string {
    if (!node) return this.text;
    return node.getText(this.ast);
  }

  getLines(): string[] {
    return this.lines;
  }

  getAllComments(): Comment[] {
    const comments: Comment[] = [];
    const commentRanges =
      ts.getLeadingCommentRanges(this.text, this.ast.getFullStart()) || [];

    for (const range of commentRanges) {
      const value = this.text.substring(range.pos, range.end);
      comments.push({
        type:
          range.kind === ts.SyntaxKind.SingleLineCommentTrivia
            ? "Line"
            : "Block",
        value: value.replace(/^\/\/|^\/\*|\*\/$/g, "").trim(),
        range: [range.pos, range.end],
        loc: this.getLocation(range.pos),
      });
    }

    return comments;
  }

  getCommentsBefore(node: ts.Node): Comment[] {
    const ranges =
      ts.getLeadingCommentRanges(this.text, node.getFullStart()) || [];
    return ranges.map((range) => ({
      type:
        range.kind === ts.SyntaxKind.SingleLineCommentTrivia ? "Line" : "Block",
      value: this.text
        .substring(range.pos, range.end)
        .replace(/^\/\/|^\/\*|\*\/$/g, "")
        .trim(),
      range: [range.pos, range.end],
      loc: this.getLocation(range.pos),
    }));
  }

  getCommentsAfter(node: ts.Node): Comment[] {
    const ranges = ts.getTrailingCommentRanges(this.text, node.getEnd()) || [];
    return ranges.map((range) => ({
      type:
        range.kind === ts.SyntaxKind.SingleLineCommentTrivia ? "Line" : "Block",
      value: this.text
        .substring(range.pos, range.end)
        .replace(/^\/\/|^\/\*|\*\/$/g, "")
        .trim(),
      range: [range.pos, range.end],
      loc: this.getLocation(range.pos),
    }));
  }

  getCommentsInside(node: ts.Node): Comment[] {
    const comments: Comment[] = [];

    const visit = (n: ts.Node) => {
      const leading = this.getCommentsBefore(n);
      const trailing = this.getCommentsAfter(n);
      comments.push(...leading, ...trailing);
      ts.forEachChild(n, visit);
    };

    ts.forEachChild(node, visit);
    return comments;
  }

  getJSDocComment(node: ts.Node): Comment | null {
    const jsDoc = (node as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc;
    if (!jsDoc || jsDoc.length === 0) return null;

    const doc = jsDoc[0];
    return {
      type: "Block",
      value: doc.getText(),
      range: [doc.getStart(), doc.getEnd()],
      loc: this.getLocation(doc.getStart()),
    };
  }

  getFirstToken(node: ts.Node): ts.Node | null {
    return node.getChildAt(0) || null;
  }

  getLastToken(node: ts.Node): ts.Node | null {
    const children = node.getChildren();
    return children[children.length - 1] || null;
  }

  getTokenAfter(node: ts.Node): ts.Node | null {
    const parent = node.parent;
    if (!parent) return null;

    const children = parent.getChildren();
    const index = children.indexOf(node);
    return children[index + 1] || null;
  }

  getTokenBefore(node: ts.Node): ts.Node | null {
    const parent = node.parent;
    if (!parent) return null;

    const children = parent.getChildren();
    const index = children.indexOf(node);
    return children[index - 1] || null;
  }

  getFirstTokens(node: ts.Node, count = 1): ts.Node[] {
    const children = node.getChildren();
    return children.slice(0, count);
  }

  getLastTokens(node: ts.Node, count = 1): ts.Node[] {
    const children = node.getChildren();
    return children.slice(-count);
  }

  private getLocation(pos: number) {
    const { line, character } = this.ast.getLineAndCharacterOfPosition(pos);
    return { line: line + 1, column: character + 1 };
  }
}

class RuleContextImpl implements RuleContext {
  private diagnostics: Diagnostic[] = [];
  private ancestors: ts.Node[] = [];
  private fixer: RuleFixerImpl;
  private sourceCode: SourceCodeImpl;
  private messages: Record<string, string>;

  constructor(
    public file: string,
    public source: string,
    public sourceFile: ts.SourceFile,
    public options: unknown[],
    private ruleId: string,
    private severity: string,
    messages?: Record<string, string>,
  ) {
    this.fixer = new RuleFixerImpl(sourceFile);
    this.sourceCode = new SourceCodeImpl(source, sourceFile);
    this.messages = messages || {};
  }

  report(descriptor: ReportDescriptor): void {
    let line = 1;
    let column = 1;

    if (descriptor.node) {
      const { line: l, character: c } =
        this.sourceFile.getLineAndCharacterOfPosition(
          descriptor.node.getStart(),
        );
      line = l + 1;
      column = c + 1;
    } else if (descriptor.loc) {
      line = descriptor.loc.line;
      column = descriptor.loc.column;
    }

    let message = descriptor.message || "Unknown error";
    if (descriptor.messageId) {
      const template = this.messages[descriptor.messageId] || descriptor.messageId;
      message = this.interpolateMessage(template, descriptor.data);
    }

    let fix: Fix | undefined;
    if (descriptor.fix) {
      const result = descriptor.fix(this.fixer);
      if (result) {
        if (Symbol.iterator in Object(result)) {
          const fixes = Array.from(result as Iterable<Fix>);
          if (fixes.length > 0) {
            fix = fixes[0];
          }
        } else {
          fix = result as Fix;
        }
      }
    }

    const diagnostic: Diagnostic = {
      file: this.file,
      line,
      column,
      message,
      severity: this.severity as import("./types.js").Severity,
      ruleId: this.ruleId,
      messageId: descriptor.messageId,
      fix,
      suggestions: descriptor.suggest?.map(s => ({
        messageId: s.messageId,
        desc: this.messages[s.messageId] || s.messageId,
        fix: s.fix(this.fixer) as Fix,
      })),
      data: descriptor.data,
    };

    this.diagnostics.push(diagnostic);
  }

  private interpolateMessage(template: string, data?: Record<string, string>): string {
    if (!data) return template;
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || `{{${key}}}`);
  }

  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  getAncestors(): ts.Node[] {
    return [...this.ancestors];
  }

  getDeclaredVariables(node: ts.Node): ts.Node[] {
    const variables: ts.Node[] = [];

    if (ts.isVariableDeclaration(node)) {
      variables.push(node.name);
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      variables.push(node.name);
    } else if (ts.isClassDeclaration(node) && node.name) {
      variables.push(node.name);
    }

    return variables;
  }

  getFilename(): string {
    return this.file;
  }

  getScope(): unknown {
    return null;
  }

  getSourceCode(): SourceCode {
    return this.sourceCode;
  }

  markVariableAsUsed(_name: string): boolean {
    return true;
  }

  pushAncestor(node: ts.Node): void {
    this.ancestors.push(node);
  }

  popAncestor(): void {
    this.ancestors.pop();
  }

  private getMessage(messageId: string, data?: Record<string, string>): string {
    return messageId;
  }
}

export function lintFile(
  filePath: string,
  content: string,
  options: LintOptions,
): LintResult {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const diagnostics: Diagnostic[] = [];
  let errorCount = 0;
  let warningCount = 0;
  let fixableErrorCount = 0;
  let fixableWarningCount = 0;

  for (const [ruleId, rule] of options.rules) {
    const config = options.ruleConfig.get(ruleId);
    if (!config) continue;

    const [severity, ...ruleOptions] = config;
    if (severity === "off") continue;

    const context = new RuleContextImpl(
      filePath,
      content,
      sourceFile,
      ruleOptions,
      ruleId,
      severity,
      rule.meta.messages,
    );

    const listener = rule.create(context);

    const visit = (node: ts.Node) => {
      context.pushAncestor(node);

      const nodeType = ts.SyntaxKind[node.kind];
      const handler = listener[nodeType];

      if (handler) {
        handler(node);
      }

      ts.forEachChild(node, visit);

      const exitHandler = listener[`${nodeType}:exit`];
      if (exitHandler) {
        exitHandler(node);
      }

      context.popAncestor();
    };

    visit(sourceFile);

    const ruleDiagnostics = context.getDiagnostics();
    diagnostics.push(...ruleDiagnostics);

    for (const d of ruleDiagnostics) {
      if (d.severity === "error") {
        errorCount++;
        if (d.fix) fixableErrorCount++;
      } else if (d.severity === "warn") {
        warningCount++;
        if (d.fix) fixableWarningCount++;
      }
    }
  }

  return {
    file: filePath,
    diagnostics,
    errorCount,
    warningCount,
    fixableErrorCount,
    fixableWarningCount,
  };
}

export async function lintFiles(
  paths: string[],
  options: LintOptions,
): Promise<LintResult[]> {
  const results: LintResult[] = [];

  for (const path of paths) {
    try {
      const content = await Bun.file(path).text();
      results.push(lintFile(path, content, options));
    } catch (error) {
      results.push({
        file: path,
        diagnostics: [
          {
            file: path,
            line: 0,
            column: 0,
            message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
            severity: "error",
            ruleId: "fatal",
          },
        ],
        errorCount: 1,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
      });
    }
  }

  return results;
}

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
