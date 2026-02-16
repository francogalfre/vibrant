import ts from "typescript";
import type { Rule, RuleContext, RuleListener, Fix } from "../core/types.js";

const meta: import("../core/types.js").RuleMeta = {
  type: "suggestion",
  docs: {
    description: "Disallow the use of the `any` type",
    category: "Type Safety",
    recommended: true,
    url: "https://vibrant.dev/rules/no-explicit-any",
  },
  fixable: "code",
  hasSuggestions: true,
  schema: [],
  messages: {
    unexpectedAny: "'any' type defeats TypeScript's type safety. It disables compile-time verification and can lead to runtime errors. Consider using 'unknown' or a specific type instead.",
    suggestUnknown: "Replace with 'unknown' type",
    suggestNever: "Replace with 'never' type",
  },
};

function create(context: RuleContext): RuleListener {
  return {
    Identifier(node: ts.Node) {
      if (!ts.isIdentifier(node)) return;
      if (node.text !== "any") return;
      
      // Check if this identifier is used as a type
      const parent = node.parent;
      if (
        ts.isTypeReferenceNode(parent) ||
        ts.isTypeAliasDeclaration(parent) ||
        ts.isVariableDeclaration(parent) ||
        ts.isParameter(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isFunctionDeclaration(parent) ||
        ts.isArrowFunction(parent) ||
        ts.isMethodDeclaration(parent) ||
        ts.isPropertyDeclaration(parent)
      ) {
        context.report({
          node,
          messageId: "unexpectedAny",
          fix(fixer: import("../core/types.js").RuleFixer): Fix {
            return fixer.replaceText(node, "unknown");
          },
          suggest: [
            {
              messageId: "suggestUnknown",
              fix(fixer: import("../core/types.js").RuleFixer): Fix {
                return fixer.replaceText(node, "unknown");
              },
            },
            {
              messageId: "suggestNever",
              fix(fixer: import("../core/types.js").RuleFixer): Fix {
                return fixer.replaceText(node, "never");
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
