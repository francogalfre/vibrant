import { writeFile } from "node:fs/promises";
import { relative, join } from "node:path";
import { readFileSync } from "node:fs";
import { c, theme } from "./theme.js";
import type { LintResult, Diagnostic, Severity } from "../core/types.js";

export type FormatType = "pretty" | "compact" | "plan" | "json";

interface PrintOptions {
  format: FormatType;
  duration: number;
  filesAnalyzed: number;
  fixableErrors?: number;
  fixableWarnings?: number;
  path?: string;
}

export async function printResults(
  results: LintResult[],
  options: PrintOptions,
): Promise<void> {
  switch (options.format) {
    case "compact":
      printCompact(results, options);
      break;
    case "plan":
      await printPlan(results, options);
      break;
    case "json":
      printJson(results, options);
      break;
    case "pretty":
      printPrettyBiome(results, options);
      break;
    default:
      console.log();
      console.log(
        c.red(`${theme.icons.cross} Unknown format: "${options.format}"`),
      );
      console.log();
      console.log(c.white(`${theme.icons.bullet} Available formats:`));
      console.log(
        c.cyan(
          `   ${theme.icons.check} pretty  - Detailed output with code snippets (default)`,
        ),
      );
      console.log(
        c.cyan(`   ${theme.icons.check} compact - One line per issue`),
      );
      console.log(
        c.cyan(
          `   ${theme.icons.check} plan    - Generate Markdown report for AI agents`,
        ),
      );
      console.log(
        c.cyan(
          `   ${theme.icons.check} json    - JSON output for CI/CD integration`,
        ),
      );
      console.log();
      process.exit(1);
  }
}

function printPrettyBiome(results: LintResult[], options: PrintOptions): void {
  let allDiagnostics = results.flatMap((r) => r.diagnostics);
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  const filesWithIssues = results.filter(
    (r) => r.diagnostics.length > 0,
  ).length;

  if (allDiagnostics.length === 0) {
    printPrettySuccess(options);
    return;
  }

  const maxIssuesPerRule = 5;
  const ruleGroups = groupByRule(allDiagnostics);
  const groupedDiagnostics: Diagnostic[] = [];

  for (const [ruleId, diagnostics] of ruleGroups) {
    if (diagnostics.length > maxIssuesPerRule) {
      const shown = diagnostics.slice(0, maxIssuesPerRule);
      const remaining = diagnostics.length - maxIssuesPerRule;
      groupedDiagnostics.push(...shown);

      const sampleDiagnostic = diagnostics[0];
      const aggregatedDiagnostic: Diagnostic = {
        ...sampleDiagnostic,
        message: `${sampleDiagnostic.message}\n\n${theme.icons.info} ${c.cyan(`Plus ${remaining} more similar issues of type "${ruleId}". Run with higher verbosity to see all.`)}`,
      };
      groupedDiagnostics.push(aggregatedDiagnostic);
    } else {
      groupedDiagnostics.push(...diagnostics);
    }
  }

  allDiagnostics = groupedDiagnostics;

  const byFile = new Map<string, Diagnostic[]>();
  for (const diagnostic of allDiagnostics) {
    const list = byFile.get(diagnostic.file) ?? [];
    list.push(diagnostic);
    byFile.set(diagnostic.file, list);
  }

  console.log(
    c.cyan(`${theme.icons.magnifying} ${c.bold("Analysis Results")}`),
  );
  console.log();

  let issueCount = 0;
  for (const [file, diagnostics] of byFile) {
    const relativePath = rel(file);

    for (const diagnostic of diagnostics) {
      issueCount++;
      const line = diagnostic.line;
      const column = diagnostic.column;

      const severityIcon =
        diagnostic.severity === "error"
          ? theme.icons.error
          : diagnostic.severity === "warn"
            ? theme.icons.warning
            : theme.icons.info;
      const headerColor =
        diagnostic.severity === "error"
          ? c.red
          : diagnostic.severity === "warn"
            ? c.yellow
            : c.cyan;

      console.log(
        `${c.dim(theme.icons.corner)} ${headerColor(relativePath)}:${line}:${column}`,
      );
      console.log(
        `  ${c.dim(theme.icons.bullet)} ${c.white(diagnostic.ruleId)}`,
      );
      console.log();

      const messageLines = diagnostic.message.split("\n");
      for (const msgLine of messageLines) {
        console.log(`  ${c.dim(severityIcon)} ${msgLine}`);
      }

      const codeContext = getCodeContext(file, line, 2);
      if (codeContext && codeContext.length > 0) {
        console.log();
        const maxLineNum = line + 2;
        const lineNumWidth = String(maxLineNum).length;

        for (const ctx of codeContext) {
          if (!ctx) continue;
          const lineNum = String(ctx.line).padStart(lineNumWidth);
          const isErrorLine = ctx.line === line;
          const prefix = isErrorLine ? " →" : "  ";
          const lineColor = isErrorLine ? c.yellow : c.dim;

          const lineContent = ctx.code.replace(/\t/g, "  ");
          console.log(
            `  ${lineColor(prefix)} ${c.dim(lineNum)} │ ${lineContent}`,
          );
        }
      }

      console.log();

      if (diagnostic.suggestions?.length) {
        console.log(
          `  ${theme.icons.lightbulb} ${diagnostic.suggestions[0].desc}`,
        );
        console.log();
      }

      if (diagnostic.fix) {
        console.log(
          `  ${theme.icons.wrench} ${c.green("Fix available (use --fix to apply)")}`,
        );
        console.log();
      }
    }
  }

  console.log(c.dim("─".repeat(70)));
  console.log();
  printSummary(totalErrors, totalWarnings, filesWithIssues, options);
}

function groupByRule(diagnostics: Diagnostic[]): Map<string, Diagnostic[]> {
  const groups = new Map<string, Diagnostic[]>();
  for (const diagnostic of diagnostics) {
    const list = groups.get(diagnostic.ruleId) ?? [];
    list.push(diagnostic);
    groups.set(diagnostic.ruleId, list);
  }
  return groups;
}

function getCodeContext(
  file: string,
  errorLine: number,
  contextLines: number = 2,
): Array<{ line: number; code: string }> {
  try {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const context: Array<{ line: number; code: string }> = [];

    const startLine = Math.max(1, errorLine - contextLines);
    const endLine = Math.min(lines.length, errorLine + contextLines);

    for (let i = startLine; i <= endLine; i++) {
      context.push({ line: i, code: lines[i - 1] });
    }

    return context;
  } catch {
    return [];
  }
}

function printPrettySuccess(options: PrintOptions): void {
  console.log();
  console.log(
    c.green.bold(
      `${theme.icons.sparkles} ${theme.icons.success} No issues found ${theme.icons.sparkles}`,
    ),
  );
  console.log();
  console.log(
    `${theme.icons.file} ${c.white(options.filesAnalyzed)} files analyzed`,
  );
  console.log(`${theme.icons.clock} ${c.dim(options.duration)}ms`);
  console.log();
  console.log(
    c.cyan(
      `${theme.icons.rocket} Your code is vibecode-free! ${theme.icons.rocket}`,
    ),
  );
  console.log();
}

function printCompact(results: LintResult[], options: PrintOptions): void {
  const allDiagnostics = results.flatMap((r) => r.diagnostics);

  if (allDiagnostics.length === 0) {
    console.log();
    console.log(
      c.green.bold(
        `${theme.icons.success} No issues found ${theme.icons.success}`,
      ),
    );
    console.log();
    return;
  }

  console.log(`${theme.icons.magnifying} ${c.bold("Issues found")}`);
  console.log();

  for (const diagnostic of allDiagnostics) {
    const severityPrefix = getSeverityCompact(diagnostic.severity);
    const file = rel(diagnostic.file);
    const truncatedMessage = truncateText(diagnostic.message, 65);

    console.log(
      `${severityPrefix} ${file}:${diagnostic.line}:${diagnostic.column}  ${c.cyan(diagnostic.ruleId)}  ${c.white(truncatedMessage)}`,
    );
  }

  console.log();
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  const filesWithIssues = results.filter(
    (r) => r.diagnostics.length > 0,
  ).length;

  const summaryColor =
    totalErrors > 0 ? c.red : totalWarnings > 0 ? c.yellow : c.green;
  const errorLabel = totalErrors === 1 ? "error" : "errors";
  const warningLabel = totalWarnings === 1 ? "warning" : "warnings";
  const fileLabel = filesWithIssues === 1 ? "file" : "files";
  console.log(
    summaryColor(
      `  ${theme.icons.bug} ${totalErrors} ${errorLabel}  •  ${theme.icons.warningSign} ${totalWarnings} ${warningLabel}  •  ${theme.icons.folder} ${filesWithIssues} ${fileLabel}`,
    ),
  );
  console.log(
    c.dim(
      `  ${theme.icons.clock} ${options.duration}ms  •  ${theme.icons.file} ${options.filesAnalyzed} files`,
    ),
  );
  console.log();
}

async function printPlan(
  results: LintResult[],
  options: PrintOptions,
): Promise<void> {
  const allDiagnostics = results.flatMap((r) => r.diagnostics);
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);

  const lines: string[] = [];

  lines.push(`# 🔍 Vibrant Code Analysis Report`);
  lines.push(`> Generated by Vibrant - AI Pattern Detector`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Files Analyzed | ${options.filesAnalyzed} |`);
  lines.push(`| Duration | ${options.duration}ms |`);
  lines.push(`| Errors | ${totalErrors} |`);
  lines.push(`| Warnings | ${totalWarnings} |`);
  lines.push(
    `| Files with Issues | ${results.filter((r) => r.diagnostics.length > 0).length} |`,
  );
  lines.push(``);

  if (allDiagnostics.length === 0) {
    lines.push(`## ✅ Result`);
    lines.push(``);
    lines.push(
      `No issues found! The codebase is clean of AI-generated patterns.`,
    );
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
    const content = lines.join("\n");
    if (options.path) {
      const outputPath = join(process.cwd(), options.path);
      await writeFile(outputPath, content, "utf-8");
      console.log();
      console.log(
        c.green(`${theme.icons.success} Report saved to ${outputPath}`),
      );
      console.log();
    }
    return;
  }

  lines.push(`## Issues`);
  lines.push(``);
  lines.push(`### For AI Agent Resolution`);
  lines.push(``);
  lines.push(`Copy the following prompt to fix all issues:`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## AI Agent Task: Fix Code Issues`);
  lines.push(``);
  lines.push(
    `You are a expert code reviewer. Fix the following issues found in the codebase.`,
  );
  lines.push(``);

  const byFile = new Map<string, Diagnostic[]>();
  for (const diagnostic of allDiagnostics) {
    const list = byFile.get(diagnostic.file) ?? [];
    list.push(diagnostic);
    byFile.set(diagnostic.file, list);
  }

  for (const [file, diagnostics] of byFile) {
    const relativePath = rel(file);
    lines.push(`### File: \`${relativePath}\``);
    lines.push(``);

    for (let i = 0; i < diagnostics.length; i++) {
      const diagnostic = diagnostics[i];
      const severity =
        diagnostic.severity === "error"
          ? "🔴 ERROR"
          : diagnostic.severity === "warn"
            ? "🟡 WARNING"
            : "ℹ️ INFO";

      lines.push(`#### Issue ${i + 1}: ${severity}`);
      lines.push(``);
      lines.push(
        `**Location:** Line \`${diagnostic.line}\`, Column \`${diagnostic.column}\``,
      );
      lines.push(``);
      lines.push(`**Rule:** \`${diagnostic.ruleId}\``);
      lines.push(``);
      lines.push(`**Problem:**`);
      lines.push(diagnostic.message);
      lines.push(``);

      if (diagnostic.suggestions?.length) {
        lines.push(`**Suggestion:**`);
        lines.push(diagnostic.suggestions[0].desc);
        lines.push(``);
      }

      if (diagnostic.fix) {
        lines.push(
          `**Fix Available:** YES (run \`vibrant --fix\` to auto-apply)`,
        );
        lines.push(``);
      }

      lines.push(`**Reference Code:**`);
      lines.push(`\`\`\`typescript`);
      lines.push(
        `// Fix location: ${relativePath}:${diagnostic.line}:${diagnostic.column}`,
      );
      lines.push(`// Rule: ${diagnostic.ruleId}`);
      lines.push(`// Problem: ${diagnostic.message.replace(/\n/g, " ")}`);
      lines.push(`\`\`\``);
      lines.push(``);
    }
  }

  lines.push(`### Resolution Instructions`);
  lines.push(``);
  lines.push(`1. Prioritize 🔴 ERRORS first (potential bugs)`);
  lines.push(`2. Then fix 🟡 WARNINGS (code quality)`);
  lines.push(`3. Review ℹ️ INFO items (minor suggestions)`);
  lines.push(`4. For auto-fixable issues, run: \`vibrant --fix\``);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## About Vibrant`);
  lines.push(``);
  lines.push(
    `Vibrant detects AI-generated code patterns (vibecoding) including:`,
  );
  lines.push(`- Generic variable names (data, result, item, etc.)`);
  lines.push(`- Console.log debugging statements`);
  lines.push(`- Empty function/catch blocks`);
  lines.push(`- Hardcoded credentials`);
  lines.push(`- Magic numbers`);
  lines.push(`- Unimplemented error stubs`);
  lines.push(``);
  lines.push(`> Report generated in ${options.duration}ms`);

  const content = lines.join("\n");

  if (options.path) {
    const outputPath = join(process.cwd(), options.path);
    await writeFile(outputPath, content, "utf-8");
    console.log();
    console.log(
      c.green(`${theme.icons.success} Report saved to ${outputPath}`),
    );
    console.log();
  } else {
  }
}

function printSummary(
  totalErrors: number,
  totalWarnings: number,
  filesWithIssues: number,
  options: PrintOptions,
): void {
  console.log(
    `${theme.icons.file} ${c.white(options.filesAnalyzed)} files scanned`,
  );
  console.log(
    `${theme.icons.globe} ${c.white(filesWithIssues)} files with issues`,
  );
  console.log(`${theme.icons.clock} ${c.dim(options.duration)}ms`);
  console.log();

  const summaryColor =
    totalErrors > 0 ? c.red : totalWarnings > 0 ? c.yellow : c.green;
  const errorLabel = totalErrors === 1 ? "error" : "errors";
  const warningLabel = totalWarnings === 1 ? "warning" : "warnings";

  if (totalErrors > 0) {
    console.log(
      summaryColor(
        `  ${theme.icons.bug} ${totalErrors} ${errorLabel}  •  ${totalWarnings} ${warningLabel}`,
      ),
    );
  } else if (totalWarnings > 0) {
    console.log(
      summaryColor(
        `  ${theme.icons.warningSign} ${totalErrors} ${errorLabel}  •  ${totalWarnings} ${warningLabel}`,
      ),
    );
  } else {
    console.log(
      summaryColor(
        `  ${theme.icons.shield} ${totalErrors} ${errorLabel}  •  ${totalWarnings} ${warningLabel}`,
      ),
    );
  }

  const totalFixable =
    (options.fixableErrors || 0) + (options.fixableWarnings || 0);
  if (totalFixable > 0) {
    console.log();
    console.log(
      c.cyan(
        `  ${theme.icons.wrench} ${totalFixable} issues can be fixed with ${c.white("--fix")}`,
      ),
    );
  }

  console.log();
}

function printJson(results: LintResult[], options: PrintOptions): void {
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  const totalFixableErrors = results.reduce((sum, r) => sum + r.fixableErrorCount, 0);
  const totalFixableWarnings = results.reduce((sum, r) => sum + r.fixableWarningCount, 0);

  const output = {
    summary: {
      filesAnalyzed: options.filesAnalyzed,
      filesWithIssues: results.filter((r) => r.diagnostics.length > 0).length,
      duration: options.duration,
      errorCount: totalErrors,
      warningCount: totalWarnings,
      fixableErrorCount: totalFixableErrors,
      fixableWarningCount: totalFixableWarnings,
    },
    results: results.map((result) => ({
      filePath: result.file,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
      fixableErrorCount: result.fixableErrorCount,
      fixableWarningCount: result.fixableWarningCount,
      messages: result.diagnostics.map((d) => ({
        ruleId: d.ruleId,
        severity: d.severity,
        message: d.message,
        line: d.line,
        column: d.column,
        ...(d.fix && { fix: d.fix }),
        ...(d.suggestions && { suggestions: d.suggestions }),
      })),
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

function rel(file: string): string {
  try {
    return relative(process.cwd(), file) || file;
  } catch {
    return file;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function getSeverityCompact(severity: Severity): string {
  switch (severity) {
    case "error":
      return c.red("✖");
    case "warn":
      return c.yellow("⚠");
    case "info":
      return c.cyan("ℹ");
    default:
      return theme.icons.bullet;
  }
}
