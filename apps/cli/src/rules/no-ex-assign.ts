import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Detect assignments to the error object in catch clauses",
    category: "Possible Bugs",
    recommended: true,
    url: "https://vibrant.dev/rules/no-ex-assign",
  },
  fixable: undefined,
  hasSuggestions: false,
  schema: [],
  messages: {
    exAssign: "Reassigning the error variable in catch block can lose the original error reference",
  },
};

function create(context: RuleContext): RuleListener {
  return {
    CatchClause(node: ts.Node) {
      if (!ts.isCatchClause(node)) return;
      
      const catchBody = node.block;
      
      // Get the error variable name from the catch clause
      const errorDecl = node.variable;
      if (!errorDecl || !catchBody) return;
      
      const errorVarName = errorDecl.getText();
      
      // Check for assignments to the error variable in the catch body
      function checkAssignment(stmt: ts.Node) {
        if (ts.isExpressionStatement(stmt)) {
          const expr = stmt.expression;
          // Check for assignment expression (e.g., e = ...)
          if (ts.isBinaryExpression(expr) && 
              expr.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
              ts.isIdentifier(expr.left) &&
              expr.left.text === errorVarName) {
            context.report({
              node: expr.left,
              messageId: "exAssign",
            });
          }
        }
        ts.forEachChild(stmt, checkAssignment);
      }
      
      for (const stmt of catchBody.statements) {
        checkAssignment(stmt);
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
