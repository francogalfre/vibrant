import ts from "typescript";
import type { Diagnostic, RuleContext } from "../core/types.js";

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
          message: `Overly generic variable name "${name.text}" (common in AI-generated code).`,
          severity: "info",
          ruleId: "generic-variable-name",
          suggestion: "Consider a more descriptive name for this scope.",
        });
      }
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
