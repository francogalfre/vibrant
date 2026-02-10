import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const CREDENTIAL_KEYWORDS = [
  "password",
  "apikey",
  "api_key",
  "secret",
  "token",
  "privatekey",
  "private_key",
];

const SAFE_VALUES = ["", "your-api-key", "YOUR_API_KEY", "xxx", "****", "***"];

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Disallow hardcoded credentials in code",
    category: "Security",
    recommended: true,
    url: "https://vibrant.dev/rules/hardcoded-credentials",
  },
  fixable: undefined,
  hasSuggestions: true,
  schema: [],
  messages: {
    hardcodedCredential: "SECURITY RISK: Potential hardcoded credential '{{name}}' detected. Sensitive data in source code gets committed to version control. Use environment variables instead.",
    suggestUseEnv: "Use environment variables instead",
    suggestUseConfig: "Import from secure config file",
  },
};

function create(context: RuleContext): RuleListener {
  const sourceCode = context.getSourceCode();

  return {
    VariableDeclaration(node: ts.Node) {
      if (!ts.isVariableDeclaration(node)) return;
      if (!ts.isIdentifier(node.name)) return;

      const name = node.name.text.toLowerCase();
      const hasCredentialName = CREDENTIAL_KEYWORDS.some(kw => name.includes(kw));

      if (!hasCredentialName) return;
      if (!node.initializer) return;
      if (!ts.isStringLiteral(node.initializer)) return;

      const value = node.initializer.text;

      if (SAFE_VALUES.includes(value) || value.length <= 3) return;

      context.report({
        node: node.initializer,
        messageId: "hardcodedCredential",
        data: { name: node.name.text },
        suggest: [
          {
            messageId: "suggestUseEnv",
            fix() {
              return null;
            },
          },
        ],
      });
    },

    PropertyAssignment(node: ts.Node) {
      if (!ts.isPropertyAssignment(node)) return;
      if (!ts.isIdentifier(node.name)) return;

      const name = node.name.text.toLowerCase();
      const hasCredentialName = CREDENTIAL_KEYWORDS.some(kw => name.includes(kw));

      if (!hasCredentialName) return;
      if (!node.initializer) return;
      if (!ts.isStringLiteral(node.initializer)) return;

      const value = node.initializer.text;

      if (SAFE_VALUES.includes(value) || value.length <= 3) return;

      context.report({
        node: node.initializer,
        messageId: "hardcodedCredential",
        data: { name: node.name.text },
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
