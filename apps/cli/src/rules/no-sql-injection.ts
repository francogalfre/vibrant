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

const SQL_KEYWORDS_RE =
  /\b(select|insert|update|delete)\b[\s\S]{0,120}\b(from|where|into|values|set)\b/i;

const SQL_SINK_RE =
  /\b(query|execute|exec|raw|unsafe|queryRawUnsafe)\b/i;

function looksLikeSql(text: string): boolean {
  return SQL_KEYWORDS_RE.test(text);
}

function hasInterpolation(node: ts.TemplateExpression | ts.TemplateLiteral): boolean {
  if (ts.isTemplateExpression(node)) return node.templateSpans.length > 0;
  // `NoSubstitutionTemplateLiteral` has none
  return false;
}

function getCalleeName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

function isSafeTaggedSql(node: ts.Node): boolean {
  // sql`...` or Prisma.sql`...` (heuristic: tagged templates are usually parameterized)
  if (!ts.isTaggedTemplateExpression(node)) return false;
  const tag = node.tag;
  if (ts.isIdentifier(tag) && tag.text === "sql") return true;
  if (ts.isPropertyAccessExpression(tag) && tag.name.text === "sql") return true;
  return false;
}

function create(context: RuleContext): RuleListener {
  return {
    CallExpression(node: ts.Node) {
      if (!ts.isCallExpression(node)) return;
      if (isSafeTaggedSql(node.parent)) return;

      const calleeName = getCalleeName(node.expression);
      if (!calleeName || !SQL_SINK_RE.test(calleeName)) return;

      const firstArg = node.arguments[0];
      if (!firstArg) return;

      // Template with interpolation
      if (ts.isTemplateExpression(firstArg)) {
        const text = firstArg.getText();
        if (!hasInterpolation(firstArg)) return;
        if (!looksLikeSql(text)) return;

        context.report({
          node: firstArg,
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
        return;
      }

      // String concatenation building SQL in sink
      if (ts.isBinaryExpression(firstArg) && firstArg.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const text = firstArg.getText();
        if (!looksLikeSql(text)) return;
        // Require at least one non-literal piece (variable/user input)
        const hasNonLiteralPiece =
          !ts.isStringLiteral(firstArg.left as any) ||
          !ts.isStringLiteral(firstArg.right as any);
        if (!hasNonLiteralPiece) return;

        context.report({
          node: firstArg,
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
