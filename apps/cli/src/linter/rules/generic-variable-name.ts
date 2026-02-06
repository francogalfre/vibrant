import ts from "typescript";
import type { Diagnostic, RuleContext } from "../types.js";

const GENERIC_NAMES = new Set([
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
]);

export function genericVariableName(
  context: RuleContext,
  node: ts.Node
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = node.getSourceFile();

  const visit = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n)) {
      const name = n.name;
      if (ts.isIdentifier(name) && GENERIC_NAMES.has(name.text)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          name.getStart()
        );
        diagnostics.push({
          file: context.file,
          line: line + 1,
          column: character + 1,
          message: `Nombre de variable muy genérico "${name.text}" (patrón típico de código generado por IA).`,
          severity: "info",
          ruleId: "generic-variable-name",
          suggestion: `Considera un nombre más descriptivo para este ámbito.`,
        });
      }
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
