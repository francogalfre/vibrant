import ts from "typescript";
import type { Diagnostic, RuleContext } from "../core/types.js";

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
          "Explicit use of `any` (can hide errors and is common in generated code).",
        severity: "warning",
        ruleId: "no-explicit-any",
        suggestion:
          "Use a more specific type or `unknown` if the type is truly unknown.",
      });
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
