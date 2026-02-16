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
      
      // Detect React's dangerouslySetInnerHTML
      if (name === "dangerouslySetInnerHTML") {
        context.report({
          node,
          messageId: "xssRisk",
        });
      }
    },
    
    Identifier(node: ts.Node) {
      if (!ts.isIdentifier(node)) return;
      
      const text = node.text;
      
      // Detect unsafe DOM manipulation
      const unsafeMethods = [
        "innerHTML",
        "outerHTML",
        "insertAdjacentHTML",
      ];
      
      if (unsafeMethods.includes(text)) {
        const parent = node.parent;
        if (parent && ts.isPropertyAccessExpression(parent)) {
          context.report({
            node,
            messageId: "xssRisk",
          });
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
