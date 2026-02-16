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
      if (!ts.isReturnStatement(node)) return;
      
      const parent = node.parent;
      if (!parent || !ts.isBlock(parent)) return;
      
      const statements = parent.statements;
      const returnIndex = statements.indexOf(node);
      
      // Check if there's code after return
      if (returnIndex < statements.length - 1) {
        for (let i = returnIndex + 1; i < statements.length; i++) {
          const stmt = statements[i];
          // Skip empty statements
          if (!ts.isExpressionStatement(stmt) || stmt.expression.getText() !== ";") {
            context.report({
              node: stmt,
              messageId: "unreachable",
            });
            break;
          }
        }
      }
    },
    
    ThrowStatement(node: ts.Node) {
      if (!ts.isThrowStatement(node)) return;
      
      const parent = node.parent;
      if (!parent || !ts.isBlock(parent)) return;
      
      const statements = parent.statements;
      const throwIndex = statements.indexOf(node);
      
      // Check if there's code after throw
      if (throwIndex < statements.length - 1) {
        for (let i = throwIndex + 1; i < statements.length; i++) {
          const stmt = statements[i];
          if (!ts.isExpressionStatement(stmt) || stmt.expression.getText() !== ";") {
            context.report({
              node: stmt,
              messageId: "unreachable",
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
