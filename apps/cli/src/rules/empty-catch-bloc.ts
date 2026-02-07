import ts from "typescript";
import type { Diagnostic, RuleContext } from "../core/types.js";

export function emptyCatchBlock(
  context: RuleContext,
  node: ts.Node,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = node.getSourceFile();

  const visit = (n: ts.Node) => {
    if (ts.isTryStatement(n) && n.catchClause) {
      const catchBlock = n.catchClause.block;
      const statements = catchBlock.statements;

      const isEmpty = statements.length === 0;

      const onlyConsoleLog =
        statements.length === 1 &&
        ts.isExpressionStatement(statements[0]) &&
        ts.isCallExpression(statements[0].expression) &&
        ts.isPropertyAccessExpression(statements[0].expression.expression) &&
        ts.isIdentifier(statements[0].expression.expression.expression) &&
        statements[0].expression.expression.expression.text === "console";

      if (isEmpty || onlyConsoleLog) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          catchBlock.getStart(),
        );
        diagnostics.push({
          file: context.file,
          line: line + 1,
          column: character + 1,
          message: isEmpty
            ? "Empty catch block swallows errors silently."
            : "Catch block only logs to console without proper error handling.",
          severity: "error",
          ruleId: "empty-catch-block",
          suggestion:
            "Handle the error appropriately, rethrow it, or at minimum log with context.",
        });
      }
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
