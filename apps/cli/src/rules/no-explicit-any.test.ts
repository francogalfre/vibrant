import { RuleTester } from "../core/rule-tester.js";
import rule from "./no-explicit-any.js";

const tester = new RuleTester({
  ruleName: "no-explicit-any",
  rule,
});

const results = tester.run("no-explicit-any", {
  valid: [
    {
      code: `const x: string = "hello";`,
    },
    {
      code: `function foo(x: number): number { return x; }`,
    },
    {
      code: `type MyType = string | number;`,
    },
  ],
  invalid: [
    {
      code: `const x: any = 1;`,
      errors: [
        {
          messageId: "unexpectedAny",
          line: 1,
          column: 10,
        },
      ],
    },
    {
      code: `function foo(x: any): any {}`,
      errors: [
        {
          messageId: "unexpectedAny",
          line: 1,
          column: 17,
        },
        {
          messageId: "unexpectedAny",
          line: 1,
          column: 23,
        },
      ],
    },
  ],
});

console.log("Test Results:");
for (const result of results) {
  if (result.passed) {
    console.log("✓ Passed");
  } else {
    console.log(`✗ Failed: ${result.message}`);
  }
}
