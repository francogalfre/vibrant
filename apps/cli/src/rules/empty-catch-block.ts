import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Disallow empty catch blocks",
    category: "Best Practices",
    recommended: true,
    url: "https://vibrant.dev/rules/empty-catch-block",
  },
  fixable: undefined,
  hasSuggestions: true,
  schema: [],
  messages: {
    emptyCatch: "Empty catch block - errors are silently swallowed. This dangerous anti-pattern makes debugging nearly impossible as exceptions are caught but never handled.",
    consoleOnlyCatch: "Catch block only logs to console without proper error handling. Consider implementing proper error handling or rethrowing the exception.",
    suggestHandle: "Add proper error handling",
    suggestRethrow: "Rethrow the error",
  },
};

function isConsoleLog(node: ts.Node): boolean {
  if (!ts.isExpressionStatement(node)) return false;
  if (!ts.isCallExpression(node.expression)) return false;
  if (!ts.isPropertyAccessExpression(node.expression.expression)) return false;
  
  const obj = node.expression.expression.expression;
  if (!ts.isIdentifier(obj)) return false;
  
  return obj.text === "console";
}

function create(context: RuleContext): RuleListener {
  return {
    CatchClause(node: ts.Node) {
      if (!ts.isCatchClause(node)) return;
      
      const block = node.block;
      const statements = block.statements;

      const isEmpty = statements.length === 0;
      const onlyConsoleLog = statements.length === 1 && isConsoleLog(statements[0]);

      if (!isEmpty && !onlyConsoleLog) return;

      context.report({
        node: block,
        messageId: isEmpty ? "emptyCatch" : "consoleOnlyCatch",
        suggest: [
          {
            messageId: "suggestHandle",
            fix() {
              return null;
            },
          },
          {
            messageId: "suggestRethrow",
            fix() {
              return null;
            },
          },
        ],
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
