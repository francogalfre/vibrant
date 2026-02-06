import ts from "typescript";
import type { Diagnostic, RuleContext } from "../types.js";

export function noExplicitAny(
  context: RuleContext,
  node: ts.Node
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = node.getSourceFile();

  const visit = (n: ts.Node) => {
    if (n.kind === ts.SyntaxKind.AnyKeyword) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        n.getStart()
      );
      diagnostics.push({
        file: context.file,
        line: line + 1,
        column: character + 1,
        message:
          "Uso explícito de `any` (puede ocultar errores y es común en código generado).",
        severity: "warning",
        ruleId: "no-explicit-any",
        suggestion:
          "Usa un tipo más específico o `unknown` si el tipo es realmente desconocido.",
      });
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
