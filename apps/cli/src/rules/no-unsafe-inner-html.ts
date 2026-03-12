import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Detect potential XSS vulnerabilities (unsafe innerHTML, dangerouslySetInnerHTML)",
    category: "Security",
    recommended: true,
    url: "https://vibrant.dev/rules/no-unsafe-inner-html",
  },
  fixable: undefined,
  hasSuggestions: false,
  schema: [],
  messages: {
    xssRisk: "Potential XSS vulnerability. Avoid using unsanitized user input in HTML.",
  },
};

function create(context: RuleContext): RuleListener {
  return {
    PropertyAssignment(node: ts.Node) {
      if (!ts.isPropertyAssignment(node)) return;

      const name = node.name.getText();
      if (name !== "dangerouslySetInnerHTML") return;

      // Only report when __html is dynamic (non-literal) and not obviously sanitized.
      const init = node.initializer;
      if (!ts.isObjectLiteralExpression(init)) return;
      const htmlProp = init.properties.find((p) => {
        if (!ts.isPropertyAssignment(p)) return false;
        const propName = p.name.getText();
        return propName === "__html";
      });
      if (!htmlProp || !ts.isPropertyAssignment(htmlProp)) return;

      const htmlValue = htmlProp.initializer;
      if (ts.isStringLiteral(htmlValue) || ts.isNoSubstitutionTemplateLiteral(htmlValue)) return;
      if (isKnownSanitizerCall(htmlValue)) return;

      context.report({ node, messageId: "xssRisk" });
    },

    BinaryExpression(node: ts.Node) {
      if (!ts.isBinaryExpression(node)) return;
      if (node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
      if (!ts.isPropertyAccessExpression(node.left)) return;

      const prop = node.left.name.text;
      if (prop !== "innerHTML" && prop !== "outerHTML") return;

      // Only report if RHS isn't a constant string (dynamic HTML)
      const rhs = node.right;
      if (ts.isStringLiteral(rhs) || ts.isNoSubstitutionTemplateLiteral(rhs)) return;
      if (isKnownSanitizerCall(rhs)) return;

      context.report({ node, messageId: "xssRisk" });
    },

    CallExpression(node: ts.Node) {
      if (!ts.isCallExpression(node)) return;
      if (!ts.isPropertyAccessExpression(node.expression)) return;
      if (node.expression.name.text !== "insertAdjacentHTML") return;

      // insertAdjacentHTML(position, html)
      const htmlArg = node.arguments[1];
      if (!htmlArg) return;
      if (ts.isStringLiteral(htmlArg) || ts.isNoSubstitutionTemplateLiteral(htmlArg)) return;
      if (isKnownSanitizerCall(htmlArg)) return;

      context.report({ node, messageId: "xssRisk" });
    },
  };
}

function isKnownSanitizerCall(expr: ts.Expression): boolean {
  if (!ts.isCallExpression(expr)) return false;
  const callee = expr.expression;
  const name = ts.isIdentifier(callee)
    ? callee.text
    : ts.isPropertyAccessExpression(callee)
      ? callee.name.text
      : null;

  if (!name) return false;
  return /^(sanitize|escape|sanitizeHtml)$/i.test(name);
}

const rule: Rule = {
  meta,
  create,
};

export default rule;
export { meta, create };
