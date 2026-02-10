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
  const sourceCode = context.getSourceCode();

  return {
    TSAnyKeyword(node: ts.Node) {
      if (node.kind !== ts.SyntaxKind.AnyKeyword) return;

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
    },
  };
}

const rule: Rule = {
  meta,
  create,
};

export default rule;
export { meta, create };
