import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Detect unsafe usage of === and !== with NaN",
    category: "Possible Bugs",
    recommended: true,
    url: "https://vibrant.dev/rules/use-isnan",
  },
  fixable: undefined,
  hasSuggestions: true,
  schema: [],
  messages: {
    useIsNaN: "Use Number.isNaN() instead of comparison with NaN. NaN === NaN returns false.",
    suggestNumberIsNaN: "Use Number.isNaN() for proper NaN checking",
  },
};

function create(context: RuleContext): RuleListener {
  return {
    BinaryExpression(node: ts.Node) {
      if (!ts.isBinaryExpression(node)) return;

      const op = node.operatorToken.kind;
      const isEq =
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken;
      if (!isEq) return;

      const comparesWithNaN = isNaNIdentifier(node.left) || isNaNIdentifier(node.right);
      if (!comparesWithNaN) return;

      context.report({
        node,
        messageId: "useIsNaN",
        suggest: [
          {
            messageId: "suggestNumberIsNaN",
            fix() {
              return null;
            },
          },
        ],
      });
    },
  };
}

function isNaNIdentifier(node: ts.Expression): boolean {
  if (ts.isIdentifier(node) && node.text === "NaN") return true;
  // Also catch `Number.NaN`
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "Number" &&
    node.name.text === "NaN"
  ) {
    return true;
  }
  return false;
}

const rule: Rule = {
  meta,
  create,
};

export default rule;
export { meta, create };
