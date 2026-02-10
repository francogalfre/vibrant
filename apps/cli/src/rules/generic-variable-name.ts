import ts from "typescript";
import type { Rule, RuleContext, RuleListener, Fix } from "../core/types.js";

const DEFAULT_GENERIC_NAMES = [
  "data",
  "result",
  "temp",
  "tmp",
  "value",
  "item",
  "obj",
  "arr",
  "info",
  "response",
  "request",
  "params",
  "args",
  "x",
  "y",
  "z",
  "i",
  "j",
  "k",
];

interface RuleOptions {
  allow?: string[];
}

const meta: import("../core/types.js").RuleMeta = {
  type: "suggestion",
  docs: {
    description: "Disallow overly generic variable names commonly found in AI-generated code",
    category: "Best Practices",
    recommended: true,
    url: "https://vibrant.dev/rules/generic-variable-name",
  },
  fixable: undefined,
  hasSuggestions: true,
  schema: [
    {
      type: "object",
      properties: {
        allow: {
          type: "array",
          items: { type: "string" },
          description: "Variable names to allow",
        },
      },
      additionalProperties: false,
    },
  ],
  messages: {
    genericName: "Variable '{{name}}' is too generic. AI-generated code often uses vague names. Use descriptive names that explain what the variable actually contains.",
    suggestRename: "Add TODO comment to rename variable",
  },
};

function create(context: RuleContext): RuleListener {
  const sourceCode = context.getSourceCode();
  const options = (context.options[0] || {}) as RuleOptions;
  const allowed = new Set(options.allow || []);
  const genericNames = new Set(
    DEFAULT_GENERIC_NAMES.filter(name => !allowed.has(name))
  );

  return {
    VariableDeclaration(node: ts.Node) {
      if (!ts.isVariableDeclaration(node)) return;

      const name = node.name;
      if (!ts.isIdentifier(name)) return;

      const varName = name.text;
      if (!genericNames.has(varName)) return;

      context.report({
        node: name,
        messageId: "genericName",
        data: { name: varName },
        suggest: [
          {
            messageId: "suggestRename",
            fix(fixer): Fix {
              return fixer.insertTextBefore(name, `/* TODO: Rename '${varName}' to something descriptive */\n`);
            },
          },
        ],
      });
    },

    Parameter(node: ts.Node) {
      if (!ts.isParameter(node)) return;

      const name = node.name;
      if (!ts.isIdentifier(name)) return;

      const paramName = name.text;
      if (!genericNames.has(paramName)) return;

      context.report({
        node: name,
        messageId: "genericName",
        data: { name: paramName },
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
