import ts from "typescript";
import type { Rule, RuleContext, RuleListener, Fix } from "../core/types.js";

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Detect potential SQL injection vulnerabilities",
    category: "Security",
    recommended: true,
    url: "https://vibrant.dev/rules/no-sql-injection",
  },
  fixable: undefined,
  hasSuggestions: true,
  schema: [],
  messages: {
    sqlInjection: "Potential SQL injection vulnerability detected. Never concatenate user input directly into SQL queries.",
    suggestParam: "Use parameterized queries instead",
  },
};

function create(context: RuleContext): RuleListener {
  return {
    TemplateLiteral(node: ts.Node) {
      if (!ts.isTemplateLiteral(node)) return;
      
      const text = node.getText();
      
      // Detect SQL keywords in template literals
      const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|FROM|WHERE)\b/i.test(text);
      const hasVariable = text.includes("${");
      
      if (sqlKeywords && hasVariable) {
        context.report({
          node,
          messageId: "sqlInjection",
          suggest: [
            {
              messageId: "suggestParam",
              fix() {
                return null;
              },
            },
          ],
        });
      }
    },
    
    BinaryExpression(node: ts.Node) {
      if (!ts.isBinaryExpression(node)) return;
      
      // Check for string concatenation with SQL
      const text = node.getText();
      const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b/i.test(text);
      const hasStringConcat = ts.isStringLiteral(node.left) || ts.isStringLiteral(node.right);
      
      if (sqlKeywords && hasStringConcat) {
        context.report({
          node,
          messageId: "sqlInjection",
          suggest: [
            {
              messageId: "suggestParam",
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
