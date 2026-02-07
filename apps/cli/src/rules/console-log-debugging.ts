import ts from "typescript";
import type { Diagnostic, RuleContext } from "../core/types.js";

const DEBUG_PATTERNS = [
  /console\.log\s*\(\s*["'`](here|test|debug|wtf|\?+|===+|---+)["'`]/i,
  /console\.log\s*\(\s*["'`]\d+["'`]/i,
  /console\.(log|dir|table)\s*\(\s*\{.*\}\s*\)/i,
];

export function consoleLogDebugging(
  context: RuleContext,
  node: ts.Node,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = node.getSourceFile();

  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const obj = n.expression.expression;
      const prop = n.expression.name;

      if (
        ts.isIdentifier(obj) &&
        obj.text === "console" &&
        ["log", "dir", "table", "debug"].includes(prop.text)
      ) {
        const callText = n.getText(sourceFile);

        const isDebug =
          DEBUG_PATTERNS.some((p) => p.test(callText)) ||
          (n.arguments.length === 1 && ts.isIdentifier(n.arguments[0]));

        if (isDebug) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            n.getStart(),
          );
          diagnostics.push({
            file: context.file,
            line: line + 1,
            column: character + 1,
            message: `Debug console statement detected: "${callText.slice(0, 50)}..."`,
            severity: "warning",
            ruleId: "console-log-debugging",
            suggestion:
              "Remove debug console.log or use a proper logging library.",
          });
        }
      }
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
