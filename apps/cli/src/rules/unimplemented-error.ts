import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const UNIMPLEMENTED_PATTERNS = [
  /\bnot\s+implemented\b/i,
  /\bcoming\s+soon\b/i,
  /\bimplement\s+this\b/i,
  /\bplaceholder\b/i,
  /\btodo\b/i,
  /\bfixme\b/i,
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
      // Error or common subclasses
      if (!ts.isIdentifier(callee)) return;
      if (!/^(Error|TypeError|RangeError|ReferenceError|URIError|SyntaxError)$/u.test(callee.text)) return;

      const firstArg = node.expression.arguments?.[0];
      if (!firstArg || !ts.isStringLiteral(firstArg)) return;

      const message = firstArg.text;

      // Avoid flagging long descriptive errors where "todo" might appear as a word.
      if (message.length > 80) return;

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
