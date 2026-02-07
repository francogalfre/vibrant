import ts from "typescript";
import type { Diagnostic, RuleContext } from "../core/types.js";

const ALLOWED_NUMBERS = new Set([0, 1, -1, 2, 10, 100, 1000]);

export function magicNumbers(
  context: RuleContext,
  node: ts.Node,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = node.getSourceFile();

  const visit = (n: ts.Node) => {
    if (ts.isNumericLiteral(n)) {
      const value = parseFloat(n.text);

      if (ALLOWED_NUMBERS.has(value)) {
        ts.forEachChild(n, visit);
        return;
      }

      const parent = n.parent;
      if (
        parent &&
        ts.isVariableDeclaration(parent) &&
        parent.initializer === n &&
        parent.parent.flags & ts.NodeFlags.Const
      ) {
        ts.forEachChild(n, visit);
        return;
      }

      if (parent && ts.isElementAccessExpression(parent)) {
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
        message: `Magic number '${n.text}' should be defined as a named constant.`,
        severity: "warning",
        ruleId: "magic-numbers",
        suggestion: `Extract to a constant: const TIMEOUT = ${n.text};`,
      });
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
