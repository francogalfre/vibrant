import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Detect code that is unreachable after return/throw/break/continue",
    category: "Possible Bugs",
    recommended: true,
    url: "https://vibrant.dev/rules/no-unreachable",
  },
  fixable: undefined,
  hasSuggestions: false,
  schema: [],
  messages: {
    unreachable: "Unreachable code detected after return/throw/break/continue",
  },
};

function create(context: RuleContext): RuleListener {
  return {
    ReturnStatement(node: ts.Node) {
      reportAfterTerminator(node, context);
    },
    ThrowStatement(node: ts.Node) {
      reportAfterTerminator(node, context);
    },
    BreakStatement(node: ts.Node) {
      reportAfterTerminator(node, context);
    },
    ContinueStatement(node: ts.Node) {
      reportAfterTerminator(node, context);
    },
  };
}

function reportAfterTerminator(node: ts.Node, context: RuleContext) {
  const parent = node.parent;
  if (!parent || !ts.isBlock(parent)) return;

  const statements = parent.statements;
  const idx = statements.indexOf(node as any);
  if (idx < 0 || idx >= statements.length - 1) return;

  for (let i = idx + 1; i < statements.length; i++) {
    const stmt = statements[i];
    if (ts.isEmptyStatement(stmt)) continue;
    context.report({ node: stmt, messageId: "unreachable" });
    break;
  }
}

const rule: Rule = {
  meta,
  create,
};

export default rule;
export { meta, create };
