import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const DEBUG_PATTERNS = [
  /console\.log\s*\(\s*["'`](here|test|debug|wtf|\?+|===+|---+)["'`]/i,
  /console\.log\s*\(\s*["'`]\d+["'`]/i,
  /console\.(log|dir|table)\s*\(\s*\{.*\}\s*\)/i,
];

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Disallow debug console statements",
    category: "Best Practices",
    recommended: true,
    url: "https://vibrant.dev/rules/console-log-debugging",
  },
  fixable: "code",
  hasSuggestions: true,
  schema: [],
  messages: {
    noConsoleDebug: "Debug console statement detected. This is leftover debugging code from AI-generated implementation. These should be removed before production.",
    suggestRemove: "Remove this console statement",
    suggestUseLogger: "Replace with proper logger",
  },
};

function create(context: RuleContext): RuleListener {
  const sourceCode = context.getSourceCode();

  return {
    CallExpression(node: ts.Node) {
      if (!ts.isCallExpression(node)) return;
      if (!ts.isPropertyAccessExpression(node.expression)) return;

      const obj = node.expression.expression;
      const prop = node.expression.name;

      if (!ts.isIdentifier(obj) || obj.text !== "console") return;
      if (!["log", "dir", "table", "debug"].includes(prop.text)) return;

      const callText = node.getText(sourceCode.ast);

      const isDebug =
        DEBUG_PATTERNS.some((p) => p.test(callText)) ||
        (node.arguments.length === 1 && ts.isIdentifier(node.arguments[0]));

      if (!isDebug) return;

      context.report({
        node,
        messageId: "noConsoleDebug",
        fix(fixer) {
          const parent = node.parent;
          if (ts.isExpressionStatement(parent)) {
            return fixer.remove(parent);
          }
          return null;
        },
        suggest: [
          {
            messageId: "suggestRemove",
            fix(fixer) {
              const parent = node.parent;
              if (ts.isExpressionStatement(parent)) {
                return fixer.remove(parent);
              }
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
