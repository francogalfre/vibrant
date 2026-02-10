import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const GENERIC_PATTERNS = [
  /TODO:?\s*implement/i,
  /FIX:?\s*this/i,
  /Fix\s+this/i,
  /implement\s+(this|later)/i,
];

const meta: import("../core/types.js").RuleMeta = {
  type: "suggestion",
  docs: {
    description: "Disallow generic placeholder comments",
    category: "Best Practices",
    recommended: true,
    url: "https://vibrant.dev/rules/generic-comment",
  },
  fixable: undefined,
  hasSuggestions: false,
  schema: [],
  messages: {
    genericComment: "Generic placeholder comment '{{comment}}'. These indicate incomplete code - either implement the functionality or remove the placeholder.",
  },
};

function create(context: RuleContext): RuleListener {
  const seen = new Set<number>();

  return {
    "*"(node: ts.Node) {
      const sourceCode = context.getSourceCode();
      const comments = sourceCode.getCommentsBefore(node);

      for (const comment of comments) {
        if (seen.has(comment.range[0])) continue;
        seen.add(comment.range[0]);

        for (const pattern of GENERIC_PATTERNS) {
          if (pattern.test(comment.value)) {
            context.report({
              loc: comment.loc,
              messageId: "genericComment",
              data: {
                comment: comment.value.trim().slice(0, 50),
              },
            });
            break;
          }
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
export { meta, create };
