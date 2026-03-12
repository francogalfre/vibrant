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

const SAFE_VALUE_RE = /^(x{3,}|[*]{3,}|your[-_\s]?api[-_\s]?key|your[-_\s]?token|your[-_\s]?secret|changeme|change[-_\s]?me|placeholder|example|dummy|test|sample|<.+>)$/i;

// High-confidence token formats (avoid false positives)
const SECRET_VALUE_PATTERNS: Array<RegExp> = [
  // OpenAI / Anthropic / generic "sk-" style
  /\bsk-[A-Za-z0-9]{20,}\b/,
  // GitHub tokens
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  // AWS Access Key ID
  /\bAKIA[0-9A-Z]{16}\b/,
  // JWT-like
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  // Long hex/base64-ish secrets
  /\b[a-f0-9]{32,}\b/i,
  /\b[A-Za-z0-9+/_-]{40,}={0,2}\b/,
];

function looksLikeRealSecret(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (SAFE_VALUES.includes(v)) return false;
  if (v.length <= 10) return false;
  if (SAFE_VALUE_RE.test(v)) return false;
  if (/^YOUR[_A-Z0-9]+$/.test(v)) return false;
  return SECRET_VALUE_PATTERNS.some((re) => re.test(v));
}

function getPropertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return String(name.text);
  return null;
}

function isProcessEnvExpression(expr: ts.Expression): boolean {
  // process.env.X or process.env["X"]
  if (!ts.isPropertyAccessExpression(expr) && !ts.isElementAccessExpression(expr)) return false;

  // process.env
  const base =
    ts.isPropertyAccessExpression(expr)
      ? expr.expression
      : expr.expression;

  if (!ts.isPropertyAccessExpression(base)) return false;
  if (!ts.isIdentifier(base.expression) || base.expression.text !== "process") return false;
  if (base.name.text !== "env") return false;
  return true;
}

function create(context: RuleContext): RuleListener {
  return {
    VariableDeclaration(node: ts.Node) {
      if (!ts.isVariableDeclaration(node)) return;
      if (!ts.isIdentifier(node.name)) return;

      const name = node.name.text.toLowerCase();
      const hasCredentialName = CREDENTIAL_KEYWORDS.some(kw => name.includes(kw));

      if (!hasCredentialName) return;
      if (!node.initializer) return;
      if (isProcessEnvExpression(node.initializer as any)) return;
      if (!ts.isStringLiteral(node.initializer)) return;

      const value = node.initializer.text;

      if (!looksLikeRealSecret(value)) return;

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
      const propName = getPropertyNameText(node.name);
      if (!propName) return;

      const name = propName.toLowerCase();
      const hasCredentialName = CREDENTIAL_KEYWORDS.some(kw => name.includes(kw));

      if (!hasCredentialName) return;
      if (!node.initializer) return;
      if (isProcessEnvExpression(node.initializer as any)) return;
      if (!ts.isStringLiteral(node.initializer)) return;

      const value = node.initializer.text;

      if (!looksLikeRealSecret(value)) return;

      context.report({
        node: node.initializer,
        messageId: "hardcodedCredential",
        data: { name: propName },
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
