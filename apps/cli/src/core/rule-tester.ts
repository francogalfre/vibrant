import ts from "typescript";
import type { Rule, RuleContext, Diagnostic, Fix, RuleFixer } from "./types.js";

interface TestCase {
  code: string;
  options?: unknown[];
  filename?: string;
  errors?: TestError[];
  output?: string;
}

interface TestError {
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

interface RuleTesterConfig {
  ruleName: string;
  rule: Rule;
  defaultFilename?: string;
}

interface TestResult {
  passed: boolean;
  message?: string;
}

export class RuleTester {
  private config: RuleTesterConfig;

  constructor(config: RuleTesterConfig) {
    this.config = config;
  }

  run(description: string, testCases: { valid: TestCase[]; invalid: TestCase[] }): TestResult[] {
    const results: TestResult[] = [];
    
    for (const testCase of testCases.valid) {
      const testName = this.getTestName(testCase);
      try {
        this.runValidTest(testCase);
        results.push({ passed: true });
      } catch (error) {
        results.push({ 
          passed: false, 
          message: `Valid test "${testName}" failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    for (const testCase of testCases.invalid) {
      const testName = this.getTestName(testCase);
      try {
        this.runInvalidTest(testCase);
        results.push({ passed: true });
      } catch (error) {
        results.push({ 
          passed: false, 
          message: `Invalid test "${testName}" failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    return results;
  }

  private getTestName(testCase: TestCase): string {
    const code = testCase.code.slice(0, 50).replace(/\n/g, "\\n");
    return code + (testCase.code.length > 50 ? "..." : "");
  }

  private runValidTest(testCase: TestCase): void {
    const diagnostics = this.lint(testCase);
    
    if (diagnostics.length > 0) {
      const error = diagnostics[0];
      throw new Error(
        `Expected no errors, but got:\n` +
        `  ${error.message} (${error.line}:${error.column})`
      );
    }
  }

  private runInvalidTest(testCase: TestCase): void {
    const diagnostics = this.lint(testCase);

    if (diagnostics.length === 0) {
      throw new Error(
        `Expected errors, but got none for:\n${testCase.code}`
      );
    }

    if (testCase.errors) {
      this.assertErrorsMatch(diagnostics, testCase.errors);
    }

    if (testCase.output !== undefined && diagnostics[0]?.fix) {
      const fixed = this.applyFix(testCase.code, diagnostics[0].fix);
      if (fixed !== testCase.output) {
        throw new Error(
          `Output mismatch:\n` +
          `Expected:\n${testCase.output}\n` +
          `Actual:\n${fixed}`
        );
      }
    }
  }

  private lint(testCase: TestCase): Diagnostic[] {
    const filename = testCase.filename || this.config.defaultFilename || "test.ts";
    const code = testCase.code;
    
    const sourceFile = ts.createSourceFile(
      filename,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const diagnostics: Diagnostic[] = [];
    
    const context: RuleContext = {
      file: filename,
      source: code,
      sourceFile,
      options: testCase.options || [],
      report: (descriptor) => {
        let line = 1;
        let column = 1;

        if (descriptor.node) {
          const { line: l, character: c } = sourceFile.getLineAndCharacterOfPosition(
            descriptor.node.getStart()
          );
          line = l + 1;
          column = c + 1;
        } else if (descriptor.loc) {
          line = descriptor.loc.line;
          column = descriptor.loc.column;
        }

        const message = descriptor.messageId
          ? this.getMessage(descriptor.messageId, descriptor.data)
          : descriptor.message || "Unknown error";

        diagnostics.push({
          file: filename,
          line,
          column,
          message,
          severity: "error",
          ruleId: this.config.ruleName,
          messageId: descriptor.messageId,
          fix: descriptor.fix
            ? this.normalizeFix(descriptor.fix({
                insertTextAfter: (n: ts.Node, text: string) => ({ range: [n.getEnd(), n.getEnd()], text }),
                insertTextAfterRange: (r: readonly [number, number], text: string) => ({ range: [r[1], r[1]], text }),
                insertTextBefore: (n: ts.Node, text: string) => ({ range: [n.getStart(), n.getStart()], text }),
                insertTextBeforeRange: (r: readonly [number, number], text: string) => ({ range: [r[0], r[0]], text }),
                remove: (n: ts.Node) => ({ range: [n.getStart(), n.getEnd()], text: "" }),
                removeRange: (r: readonly [number, number]) => ({ range: [r[0], r[1]], text: "" }),
                replaceText: (n: ts.Node, text: string) => ({ range: [n.getStart(), n.getEnd()], text }),
                replaceTextRange: (r: readonly [number, number], text: string) => ({ range: [r[0], r[1]], text }),
              } as RuleFixer))
            : undefined,
          data: descriptor.data,
        });
      },
      getAncestors: () => [],
      getDeclaredVariables: () => [],
      getFilename: () => filename,
      getScope: () => null,
      getSourceCode: () => ({
        text: code,
        ast: sourceFile,
        lines: code.split("\n"),
        getText: (n) => n ? n.getText(sourceFile) : code,
        getLines: () => code.split("\n"),
        getAllComments: () => [],
        getCommentsBefore: () => [],
        getCommentsAfter: () => [],
        getCommentsInside: () => [],
        getJSDocComment: () => null,
        getFirstToken: () => null,
        getLastToken: () => null,
        getTokenAfter: () => null,
        getTokenBefore: () => null,
        getFirstTokens: () => [],
        getLastTokens: () => [],
      }),
      markVariableAsUsed: () => true,
    };

    const listener = this.config.rule.create(context);

    const visit = (node: ts.Node) => {
      const nodeType = ts.SyntaxKind[node.kind];
      
      if (listener[nodeType]) {
        listener[nodeType](node);
      }

      ts.forEachChild(node, visit);

      const exitHandler = listener[`${nodeType}:exit`];
      if (exitHandler) {
        exitHandler(node);
      }
    };

    visit(sourceFile);

    return diagnostics;
  }

  private normalizeFix(fix: Fix | Iterable<Fix> | null | undefined): Fix | undefined {
    if (!fix) return undefined;
    
    if (Symbol.iterator in Object(fix)) {
      const fixes = Array.from(fix as Iterable<Fix>);
      return fixes[0];
    }
    
    return fix as Fix;
  }

  private assertErrorsMatch(actual: Diagnostic[], expected: TestError[]): void {
    if (actual.length !== expected.length) {
      throw new Error(
        `Expected ${expected.length} error(s), but got ${actual.length}`
      );
    }

    for (let i = 0; i < expected.length; i++) {
      const exp = expected[i];
      const act = actual[i];

      if (exp.messageId && act.messageId !== exp.messageId) {
        throw new Error(
          `Error ${i + 1}: Expected messageId "${exp.messageId}", but got "${act.messageId}"`
        );
      }

      if (exp.message && !act.message.includes(exp.message)) {
        throw new Error(
          `Error ${i + 1}: Expected message containing "${exp.message}", but got "${act.message}"`
        );
      }

      if (exp.line && act.line !== exp.line) {
        throw new Error(
          `Error ${i + 1}: Expected line ${exp.line}, but got ${act.line}`
        );
      }

      if (exp.column && act.column !== exp.column) {
        throw new Error(
          `Error ${i + 1}: Expected column ${exp.column}, but got ${act.column}`
        );
      }
    }
  }

  private applyFix(code: string, fix: Fix): string {
    return code.substring(0, fix.range[0]) + fix.text + code.substring(fix.range[1]);
  }

  private getMessage(messageId: string, data?: Record<string, string>): string {
    const messages = this.config.rule.meta.messages;
    if (messages && messages[messageId]) {
      let message = messages[messageId];
      if (data) {
        for (const [key, value] of Object.entries(data)) {
          message = message.replace(new RegExp(`{{${key}}}`, "g"), value);
        }
      }
      return message;
    }
    return messageId;
  }
}

export type { TestCase, TestError };
