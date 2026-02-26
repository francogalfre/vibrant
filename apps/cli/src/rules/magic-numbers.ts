import ts from "typescript";
import type { Rule, RuleContext, RuleListener, RuleMeta } from "../core/types.js";

const MAGIC_NUMBER_THRESHOLD = 3;

const ALLOWED_NUMBERS = new Set([
  // Common boundaries
  0, 1, -1, 2, 10, 100, 1000,
  // HTTP status codes
  200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 502, 503,
  // ASCII
  256, 128, 64, 32,
  // Boolean-like
  -1, 0, 1,
  // Common time
  60, 3600, 24, 7, 30, 365,
  // Common sizes
  1024, 4096, 8192,
  // Version numbers (simplified)
  1.0, 2.0, 3.0,
]);

const meta: RuleMeta = {
  type: "suggestion",
  docs: {
    description: "Detect magic numbers without named constants",
    category: "Best Practices",
    recommended: false,
    url: "https://vibrant.dev/rules/magic-numbers",
  },
  fixable: "code",
  hasSuggestions: true,
  schema: [],
  messages: {
    magicNumber: "Magic number '{{number}}' detected. Consider extracting to a named constant for better code readability and maintainability.",
    suggestExtract: "Extract to constant: const {{name}} = {{number}}",
  },
};

function create(context: RuleContext): RuleListener {
  const sourceCode = context.getSourceCode();
  const magicNumbers = new Map<number, ts.NumericLiteral[]>();

  return {
    NumericLiteral(node: ts.Node) {
      if (!ts.isNumericLiteral(node)) return;
      
      const num = parseFloat((node as ts.NumericLiteral).text);
      const parent = node.parent;
      
      // Skip if parent is declaration or already has a name
      if (ts.isVariableDeclaration(parent)) return;
      if (ts.isPropertyAssignment(parent) && parent.name) return;
      if (ts.isBinaryExpression(parent)) return;
      
      // Check if this number should be allowed
      if (ALLOWED_NUMBERS.has(num)) return;
      
      // Skip negative numbers (they might be valid)
      if (num < 0) return;
      
      // Skip numbers in test files
      const filePath = context.getFilename();
      if (filePath.includes(".test.") || filePath.includes(".spec.")) return;
      
      // Skip numbers that are array indices or array bounds
      if (
        ts.isElementAccessExpression(parent) ||
        ts.isArrayTypeNode(parent) ||
        ts.isTypeNode(parent)
      ) {
        return;
      }
      
      // Track magic numbers
      if (!magicNumbers.has(num)) {
        magicNumbers.set(num, []);
      }
      magicNumbers.get(num)?.push(node as ts.NumericLiteral);
    },
    
    // Check after visiting all nodes
    "Program:exit"() {
      for (const [num, nodes] of magicNumbers) {
        // Only report if number appears multiple times (likely magic)
        if (nodes.length >= MAGIC_NUMBER_THRESHOLD || num > 1000) {
          // Report the first occurrence
          const node = nodes[0];
          
          context.report({
            node,
            messageId: "magicNumber",
            message: `Magic number ${num} appears ${nodes.length} times. Consider using a named constant.`,
            suggest: [
              {
                messageId: "suggestExtract",
                fix(fixer) {
                  const constantName = num > 100 ? `CONSTANT_${num}` : `VALUE_${num}`;
                  const newText = `${constantName} /* ${num} */`;
                  return fixer.replaceText(node, newText);
                },
              },
            ],
          });
        }
      }
    },
  };
}

const rule: Rule = {
  meta,
  create,
};

export default rule;
export { meta };
