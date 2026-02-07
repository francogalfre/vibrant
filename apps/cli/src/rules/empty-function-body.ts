// empty-function-body.ts
import ts from "typescript";
import type { Diagnostic, RuleContext } from "../core/types.js";

export function emptyFunctionBody(
  context: RuleContext,
  node: ts.Node,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = node.getSourceFile();

  const visit = (n: ts.Node) => {
    const isFunction =
      ts.isFunctionDeclaration(n) ||
      ts.isMethodDeclaration(n) ||
      ts.isArrowFunction(n) ||
      ts.isFunctionExpression(n);

    if (isFunction) {
      const body =
        ts.isFunctionDeclaration(n) ||
        ts.isMethodDeclaration(n) ||
        ts.isFunctionExpression(n)
          ? n.body
          : ts.isBlock(n.body)
            ? n.body
            : null;

      if (body && ts.isBlock(body)) {
        const isEmpty = body.statements.length === 0;
        const onlyReturn =
          body.statements.length === 1 &&
          ts.isReturnStatement(body.statements[0]) &&
          !body.statements[0].expression;

        if (isEmpty || onlyReturn) {
          const parent = n.parent;
          if (
            parent &&
            (ts.isInterfaceDeclaration(parent) ||
              (ts.isMethodDeclaration(n) &&
                n.modifiers?.some(
                  (m) => m.kind === ts.SyntaxKind.AbstractKeyword,
                )))
          ) {
            ts.forEachChild(n, visit);
            return;
          }

          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            n.getStart(),
          );
          diagnostics.push({
            file: context.file,
            line: line + 1,
            column: character + 1,
            message: "Empty function body - implementation missing.",
            severity: "warning",
            ruleId: "empty-function-body",
            suggestion: "Implement the function or remove it if not needed.",
          });
        }
      }
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
