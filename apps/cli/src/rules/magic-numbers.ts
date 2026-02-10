import ts from "typescript";
import type { Rule, RuleContext, RuleListener, Fix } from "../core/types.js";

const DEFAULT_ALLOWED = [0, 1, -1, 2, 10, 100, 1000];

interface RuleOptions {
  allow?: number[];
  enforceConst?: boolean;
  ignore?: number[];
  ignoreArrayIndexes?: boolean;
}

const meta: import("../core/types.js").RuleMeta = {
  type: "suggestion",
  docs: {
    description: "Disallow magic numbers",
    category: "Best Practices",
    recommended: true,
    url: "https://vibrant.dev/rules/magic-numbers",
  },
  fixable: undefined,
  hasSuggestions: true,
  schema: [
    {
      type: "object",
      properties: {
        allow: {
          type: "array",
          items: { type: "number" },
          description: "Numbers to allow",
        },
        enforceConst: {
          type: "boolean",
          description: "Enforce const declaration",
        },
        ignore: {
          type: "array",
          items: { type: "number" },
          description: "Numbers to ignore",
        },
        ignoreArrayIndexes: {
          type: "boolean",
          description: "Ignore array index numbers",
        },
      },
      additionalProperties: false,
    },
  ],
  messages: {
    noMagic: "Magic number '{{num}}' detected. Numeric literals without explanation make code harder to maintain. Extract to named constants (e.g., const MAX_RETRIES = 3).",
    suggestExtract: "Extract '{{num}}' to a constant",
  },
};

function create(context: RuleContext): RuleListener {
  const options = (context.options[0] || {}) as RuleOptions;
  const allowedNumbers = new Set([
    ...DEFAULT_ALLOWED,
    ...(options.allow || []),
    ...(options.ignore || []),
  ]);

  return {
    NumericLiteral(node: ts.Node) {
      if (!ts.isNumericLiteral(node)) return;

      const value = parseFloat(node.text);

      if (allowedNumbers.has(value)) return;

      const parent = node.parent;

      if (options.ignoreArrayIndexes && parent && ts.isElementAccessExpression(parent)) {
        return;
      }

      if (
        parent &&
        ts.isVariableDeclaration(parent) &&
        parent.initializer === node
      ) {
        const varStmt = parent.parent?.parent;
        if (varStmt && ts.isVariableStatement(varStmt)) {
          if (varStmt.declarationList.flags & ts.NodeFlags.Const) {
            return;
          }
        }
      }

      context.report({
        node,
        messageId: "noMagic",
        data: { num: node.text },
        suggest: [
          {
            messageId: "suggestExtract",
            data: { num: node.text },
            fix(fixer) {
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
