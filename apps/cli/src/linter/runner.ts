import type { Diagnostic, LintOptions, LintResult } from "./types.js";
import { parseFile } from "./parser.js";
import { rules } from "./rules/index.js";

export async function lintFiles(
  paths: string[],
  options?: LintOptions
): Promise<LintResult[]> {
  const ruleIds = options?.rules ?? Object.keys(rules);
  const enabledRules = ruleIds
    .filter((id) => rules[id])
    .map((id) => ({ id, rule: rules[id]! }));

  const results: LintResult[] = [];

  for (const path of paths) {
    let content: string;
    try {
      const file = Bun.file(path);
      content = await file.text();
    } catch {
      results.push({ file: path, diagnostics: [] });
      continue;
    }

    const parsed = parseFile(path, content);
    if (!parsed) {
      results.push({ file: path, diagnostics: [] });
      continue;
    }

    const diagnostics: Diagnostic[] = [];
    const context = { file: path, source: content };

    for (const { id, rule } of enabledRules) {
      const ruleDiagnostics = rule(context, parsed.sourceFile);
      const severityOverride = options?.severity?.[id];
      for (const d of ruleDiagnostics) {
        diagnostics.push({
          ...d,
          severity: severityOverride ?? d.severity,
        });
      }
    }

    results.push({ file: path, diagnostics });
  }

  return results;
}
