import { describe, it, expect } from "bun:test";
import { RuleTester } from "../../core/__tests__/rule-tester";
import noExplicitAny from "../no-explicit-any";

const ruleTester = new RuleTester({
  ruleName: "no-explicit-any",
  rule: noExplicitAny,
});

ruleTester.run("no-explicit-any", {
  valid: [
    {
      code: "const x: string = 'hello';",
    },
    {
      code: "const x: number = 42;",
    },
    {
      code: "function foo(): string { return 'bar'; }",
    },
    {
      code: "function foo(x: string): number { return x.length; }",
    },
    {
      code: "type MyType = { name: string; };",
    },
    {
      code: "interface Person { name: string; age: number; }",
    },
    // Generic constraints with any should still be valid
    {
      code: "function identity<T>(arg: T): T { return arg; }",
    },
  ],
  invalid: [
    {
      code: "const x: any = 1;",
      errors: [{ messageId: "unexpectedAny", line: 1 }],
    },
    {
      code: "let y: any;",
      errors: [{ messageId: "unexpectedAny", line: 1 }],
    },
    {
      code: "function foo(): any { return 1; }",
      errors: [{ messageId: "unexpectedAny", line: 1 }],
    },
    {
      code: "function bar(x: any): void { console.log(x); }",
      errors: [{ messageId: "unexpectedAny", line: 1 }],
    },
    {
      code: "const arr: any[] = [];",
      errors: [{ messageId: "unexpectedAny", line: 1 }],
    },
    {
      code: `const obj: { [key: string]: any } = {};`,
      errors: [{ messageId: "unexpectedAny", line: 1 }],
    },
    {
      code: "type AnyType = any;",
      errors: [{ messageId: "unexpectedAny", line: 1 }],
    },
  ],
});
