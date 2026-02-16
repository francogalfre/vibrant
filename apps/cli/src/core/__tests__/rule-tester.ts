import { describe, it, expect } from "bun:test";
import { lintFile } from "../linter";
import { Rule } from "../types";

/**
 * Test utilities for rules
 */
export interface TestCase {
  name?: string;
  code: string;
  filename?: string;
  options?: unknown[];
  errors?: Array<{
    messageId?: string;
    message?: string;
    line?: number;
    column?: number;
  }>;
}

export interface RuleTesterOptions {
  ruleName: string;
  rule: Rule;
}

export class RuleTester {
  private ruleName: string;
  private rule: Rule;

  constructor(options: RuleTesterOptions) {
    this.ruleName = options.ruleName;
    this.rule = options.rule;
  }

  run(testName: string, cases: { valid: TestCase[]; invalid: TestCase[] }) {
    describe(testName, () => {
      describe("valid cases", () => {
        for (const testCase of cases.valid) {
          const name = testCase.name || testCase.code.slice(0, 50);
          it(`should pass: ${name}`, () => {
            const result = this.lint(testCase);
            expect(result.errorCount).toBe(0);
            expect(result.warningCount).toBe(0);
          });
        }
      });

      describe("invalid cases", () => {
        for (const testCase of cases.invalid) {
          const name = testCase.name || testCase.code.slice(0, 50);
          it(`should fail: ${name}`, () => {
            const result = this.lint(testCase);
            expect(result.errorCount + result.warningCount).toBeGreaterThan(0);
            
            if (testCase.errors) {
              expect(result.diagnostics).toHaveLength(testCase.errors.length);
              
              for (let i = 0; i < testCase.errors.length; i++) {
                const expected = testCase.errors[i];
                const actual = result.diagnostics[i];
                
                if (expected.messageId) {
                  expect(actual.messageId).toBe(expected.messageId);
                }
                if (expected.line) {
                  expect(actual.line).toBe(expected.line);
                }
                if (expected.column) {
                  expect(actual.column).toBe(expected.column);
                }
              }
            }
          });
        }
      });
    });
  }

  private lint(testCase: TestCase) {
    const ruleConfig = new Map<string, [string, ...unknown[]]>();
    ruleConfig.set(this.ruleName, ["error", ...(testCase.options || [])]);

    return lintFile(
      testCase.filename || "test.ts",
      testCase.code,
      {
        rules: new Map([[this.ruleName, this.rule]]),
        ruleConfig,
      }
    );
  }
}