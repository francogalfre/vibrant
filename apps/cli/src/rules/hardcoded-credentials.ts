// hardcoded-credentials.ts
import ts from "typescript";
import type { Diagnostic, RuleContext } from "../core/types.js";

const CREDENTIAL_PATTERNS = [
  { pattern: /password\s*[:=]\s*["'][^"']+["']/i, type: "password" },
  { pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/i, type: "API key" },
  { pattern: /secret\s*[:=]\s*["'][^"']+["']/i, type: "secret" },
  { pattern: /token\s*[:=]\s*["'][^"']+["']/i, type: "token" },
  { pattern: /private[_-]?key\s*[:=]\s*["'][^"']+["']/i, type: "private key" },
];

const SAFE_VALUES = ["", "your-api-key", "YOUR_API_KEY", "xxx", "****"];

export function hardcodedCredentials(
  context: RuleContext,
  node: ts.Node,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = node.getSourceFile();

  const visit = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) || ts.isPropertyAssignment(n)) {
      const name = ts.isVariableDeclaration(n)
        ? n.name.getText(sourceFile).toLowerCase()
        : n.name?.getText(sourceFile).toLowerCase() || "";

      const hasCredentialName =
        name.includes("password") ||
        name.includes("apikey") ||
        name.includes("secret") ||
        name.includes("token") ||
        name.includes("key");

      if (
        hasCredentialName &&
        n.initializer &&
        ts.isStringLiteral(n.initializer)
      ) {
        const value = n.initializer.text;

        if (!SAFE_VALUES.includes(value) && value.length > 3) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            n.getStart(),
          );
          diagnostics.push({
            file: context.file,
            line: line + 1,
            column: character + 1,
            message: `Potential hardcoded credential detected in '${name}'.`,
            severity: "error",
            ruleId: "hardcoded-credentials",
            suggestion:
              "Use environment variables: process.env.API_KEY or import from a secure config.",
          });
        }
      }
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
