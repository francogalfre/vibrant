// unimplemented-error.ts
import ts from "typescript";
import type { Diagnostic, RuleContext } from "../core/types.js";

const UNIMPLEMENTED_PATTERNS = [
  /not\s+implemented/i,
  /todo/i,
  /coming\s+soon/i,
  /implement\s+this/i,
  /placeholder/i,
];

export function unimplementedError(
  context: RuleContext,
  node: ts.Node,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = node.getSourceFile();

  const visit = (n: ts.Node) => {
    if (
      ts.isThrowStatement(n) &&
      n.expression &&
      ts.isNewExpression(n.expression)
    ) {
      const newExpr = n.expression;

      if (
        ts.isIdentifier(newExpr.expression) &&
        newExpr.expression.text === "Error"
      ) {
        if (newExpr.arguments && newExpr.arguments.length > 0) {
          const firstArg = newExpr.arguments[0];

          if (ts.isStringLiteral(firstArg)) {
            const message = firstArg.text;

            if (UNIMPLEMENTED_PATTERNS.some((p) => p.test(message))) {
              const { line, character } =
                sourceFile.getLineAndCharacterOfPosition(n.getStart());
              diagnostics.push({
                file: context.file,
                line: line + 1,
                column: character + 1,
                message: `Unimplemented error throw: "${message}"`,
                severity: "warning",
                ruleId: "unimplemented-error",
                suggestion:
                  "Complete the implementation or remove the placeholder error.",
              });
            }
          }
        }
      }
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
