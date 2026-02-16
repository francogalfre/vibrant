import { describe, it, expect } from "bun:test";
import { RuleTester } from "../../core/__tests__/rule-tester";
import consoleLogDebugging from "../console-log-debugging";

const ruleTester = new RuleTester({
  ruleName: "console-log-debugging",
  rule: consoleLogDebugging,
});

ruleTester.run("console-log-debugging", {
  valid: [
    {
      code: "const logger = { log: (msg: string) => {} }; logger.log('test');",
    },
    {
      code: "function log(message: string) { console.log(message); }",
    },
    {
      code: "// console.log('commented out')",
    },
    {
      code: "const x = 1 + 1;",
    },
  ],
  invalid: [
    {
      code: "console.log('debug');",
      errors: [{ messageId: "noConsole", line: 1 }],
    },
    {
      code: "console.warn('warning');",
      errors: [{ messageId: "noConsole", line: 1 }],
    },
    {
      code: "console.error('error');",
      errors: [{ messageId: "noConsole", line: 1 }],
    },
    {
      code: "console.debug('debug info');",
      errors: [{ messageId: "noConsole", line: 1 }],
    },
    {
      code: "console.log('value:', x);",
      errors: [{ messageId: "noConsole", line: 1 }],
    },
  ],
});
