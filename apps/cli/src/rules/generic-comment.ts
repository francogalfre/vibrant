import ts from "typescript";
import type { Diagnostic, RuleContext } from "../core/types.js";

const GENERIC_PATTERNS = [
  /\/\/\s*TODO:?\s*implement/i,
  /\/\/\s*FIX:?\s*this/i,
  /\/\/\s*Fix\s+this/i,
  /\/\/\s*implement\s+(this|later)/i,
  /\/\*\s*TODO:?\s*implement/i,
];

export function genericComment(
  context: RuleContext,
  node: ts.Node
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = node.getSourceFile();
  const fullText = sourceFile.getFullText();
  const seen = new Set<number>();

  const checkComment = (comment: string, pos: number) => {
    if (seen.has(pos)) return;
    seen.add(pos);
    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(comment)) {
        const { line, character } =
          sourceFile.getLineAndCharacterOfPosition(pos);
        diagnostics.push({
          file: context.file,
          line: line + 1,
          column: character + 1,
          message: `Generic "vibecode" comment: "${comment.trim().slice(0, 50)}..."`,
          severity: "warning",
          ruleId: "generic-comment",
          suggestion:
            "Replace with a concrete comment that describes what to do or why.",
        });
        break;
      }
    }
  };

  const visit = (n: ts.Node) => {
    const commentRanges = ts.getLeadingCommentRanges(
      fullText,
      n.getFullStart()
    );
    if (commentRanges) {
      for (const cr of commentRanges) {
        const comment = fullText.slice(cr.pos, cr.end);
        checkComment(comment, cr.pos);
      }
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return diagnostics;
}
