import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const UNIMPLEMENTED_PATTERNS = [
  /not\s+implemented/i,
  /todo/i,
  /coming\s+soon/i,
  /implement\s+this/i,
  /placeholder/i,
];

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Disallow placeholder error throws",
    category: "Best Practices",
    recommended: true,
    url: "https://vibrant.dev/rules/unimplemented-error",
  },
  fixable: undefined,
  hasSuggestions: false,
  schema: [],
  messages: {
    unimplementedError: "Placeholder error '{{message}}' detected. This indicates incomplete functionality that will crash at runtime. Implement the function properly or use graceful degradation.",
  },
};

function create(context: RuleContext): RuleListener {
  return {
    ThrowStatement(node: ts.Node) {
      if (!ts.isThrowStatement(node)) return;
      if (!node.expression) return;

      if (!ts.isNewExpression(node.expression)) return;

      const callee = node.expression.expression;
      if (!ts.isIdentifier(callee) || callee.text !== "Error") return;

      const firstArg = node.expression.arguments?.[0];
      if (!firstArg || !ts.isStringLiteral(firstArg)) return;

      const message = firstArg.text;

      const isPlaceholder = UNIMPLEMENTED_PATTERNS.some((p) => p.test(message));
      if (!isPlaceholder) return;

      context.report({
        node,
        messageId: "unimplementedError",
        data: { message },
      });
    },
  };
}

const rule: Rule = {
  meta,
  create,
};

export default rule;
export { meta, create };
