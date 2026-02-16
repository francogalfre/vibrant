import { describe, it, expect } from "bun:test";
import { RuleTester } from "../../core/__tests__/rule-tester";
import magicNumbers from "../magic-numbers";

const ruleTester = new RuleTester({
  ruleName: "magic-numbers",
  rule: magicNumbers,
});

ruleTester.run("magic-numbers", {
  valid: [
    {
      code: "const ZERO = 0; const x = ZERO;",
    },
    {
      code: "const MAX_RETRIES = 3; for (let i = 0; i < MAX_RETRIES; i++) {}",
    },
    {
      code: "const HTTP_OK = 200; if (status === HTTP_OK) {}",
    },
    {
      code: "const arr = [1, 2, 3];", // Array literals should be valid
    },
    {
      code: "if (x === 0 || x === 1) {}", // 0 and 1 in comparisons
    },
    {
      code: "const x = -1;", // Negative numbers
    },
  ],
  invalid: [
    {
      code: "const timeout = 5000;",
      errors: [{ messageId: "noMagic", line: 1 }],
    },
    {
      code: "if (status === 404) {}",
      errors: [{ messageId: "noMagic", line: 1 }],
    },
    {
      code: "if (code === 500) {}",
      errors: [{ messageId: "noMagic", line: 1 }],
    },
    {
      code: "const retryCount = 3;",
      errors: [{ messageId: "noMagic", line: 1 }],
    },
    {
      code: "setTimeout(() => {}, 1000);",
      errors: [{ messageId: "noMagic", line: 1 }],
    },
  ],
});
