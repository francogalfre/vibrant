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
      
      // Check for NaN comparison
      const text = node.getText();
      
      // Detect: x === NaN, x == NaN, x !== NaN, x != NaN
      if (/\s*===?\s*NaN|\s*!==?\s*NaN/.test(text)) {
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
      }
    },
  };
}

const rule: Rule = {
  meta,
  create,
};

export default rule;
export { meta, create };
