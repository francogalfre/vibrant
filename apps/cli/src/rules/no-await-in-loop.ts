import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Detect await expressions inside loops - causes performance issues",
    category: "Performance",
    recommended: true,
    url: "https://vibrant.dev/rules/no-await-in-loop",
  },
  fixable: undefined,
  hasSuggestions: true,
  schema: [],
  messages: {
    awaitInLoop: "Using 'await' inside a loop causes sequential execution. Consider using Promise.all() for parallel execution.",
    suggestParallel: "Use Promise.all() to run promises in parallel",
  },
};

function create(context: RuleContext): RuleListener {
  return {
    AwaitExpression(node: ts.Node) {
      if (!ts.isAwaitExpression(node)) return;
      
      // Find parent loop
      let parent = node.parent;
      while (parent) {
        if (
          ts.isForStatement(parent) ||
          ts.isForInStatement(parent) ||
          ts.isForOfStatement(parent) ||
          ts.isWhileStatement(parent) ||
          ts.isDoStatement(parent)
        ) {
          context.report({
            node,
            messageId: "awaitInLoop",
            suggest: [
              {
                messageId: "suggestParallel",
                fix() {
                  return null;
                },
              },
            ],
          });
          return;
        }
        parent = parent.parent;
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
