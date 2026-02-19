import { writeFile } from "node:fs/promises";
import { relative, join } from "node:path";
import { readFileSync } from "node:fs";
import { c, theme } from "./theme.js";
import type { LintResult, Diagnostic, Severity } from "../core/types.js";
import pc from "picocolors";
import { printStatsBox, PRIMARY } from "./vibrascope.js";

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
    default:
      printPretty(results, options);
      break;
  }
}

function printPretty(results: LintResult[], options: PrintOptions): void {
  let allDiagnostics = results.flatMap((r) => r.diagnostics);
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);

  if (allDiagnostics.length === 0) {
    printPrettySuccess(options);
    return;
  }

  const byFile = new Map<string, Diagnostic[]>();
  for (const diagnostic of allDiagnostics) {
    const list = byFile.get(diagnostic.file) ?? [];
    list.push(diagnostic);
    byFile.set(diagnostic.file, list);
  }

  console.log(PRIMARY(pc.bold("  Analysis Results")));
  console.log();

  for (const [file, diagnostics] of byFile) {
    const relativePath = rel(file);

    for (const diagnostic of diagnostics) {
      const icon = diagnostic.severity === "error" ? "✖" : diagnostic.severity === "warn" ? "⚠" : "ℹ";
      const headerColor = diagnostic.severity === "error" ? pc.red : diagnostic.severity === "warn" ? pc.yellow : PRIMARY;

      console.log(`  ${headerColor(relativePath)}:${diagnostic.line}:${diagnostic.column}`);
      console.log(`    ${pc.dim("└─")} ${diagnostic.ruleId}`);

      const messageLines = diagnostic.message.split("\n");
      for (const msgLine of messageLines) {
        console.log(`       ${icon} ${msgLine}`);
      }

      if (diagnostic.suggestions?.length) {
        console.log(`       ${pc.green("→")} ${diagnostic.suggestions[0].desc}`);
      }

      if (diagnostic.fix) {
        console.log(`       ${pc.dim("fix available with --fix")}`);
      }

      console.log();
    }
  }

  printStatsBox(totalErrors, totalWarnings, options.filesAnalyzed, options.duration);

  const totalFixable = (options.fixableErrors || 0) + (options.fixableWarnings || 0);
  if (totalFixable > 0) {
    console.log(pc.dim(`  Run ${PRIMARY("vibrant --fix")} to auto-fix ${totalFixable} issues`));
    console.log();
  }
}

function printPrettySuccess(options: PrintOptions): void {
  console.log();
  console.log(pc.green(pc.bold("  ✓ No issues found")));
  console.log(pc.dim(`  ${options.filesAnalyzed} file${options.filesAnalyzed > 1 ? "s" : ""} · ${options.duration}ms`));
  console.log();
}

function printCompact(results: LintResult[], options: PrintOptions): void {
  const allDiagnostics = results.flatMap((r) => r.diagnostics);

  if (allDiagnostics.length === 0) {
    console.log();
    console.log(pc.green("  ✓ No issues found"));
    console.log();
    return;
  }

  for (const d of allDiagnostics) {
    const icon = d.severity === "error" ? "✖" : d.severity === "warn" ? "⚠" : "ℹ";
    const color = d.severity === "error" ? pc.red : d.severity === "warn" ? pc.yellow : PRIMARY;
    console.log(`${color(icon)} ${rel(d.file)}:${d.line}:${d.column} ${PRIMARY(d.ruleId)} ${d.message.slice(0, 60)}`);
  }

  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  console.log();
  console.log(pc.dim(`  ${totalErrors} errors · ${totalWarnings} warnings · ${options.duration}ms`));
  console.log();
}

async function printPlan(results: LintResult[], options: PrintOptions): Promise<void> {
  const allDiagnostics = results.flatMap((r) => r.diagnostics);
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);

  const lines: string[] = [];
  lines.push(`# Vibrant Analysis Report`);
  lines.push(``);
  lines.push(`Files: ${options.filesAnalyzed} | Errors: ${totalErrors} | Warnings: ${totalWarnings} | Time: ${options.duration}ms`);
  lines.push(``);

  if (allDiagnostics.length === 0) {
    lines.push(`No issues found.`);
  } else {
    lines.push(`## Issues`);
    lines.push(``);
    
    for (const d of allDiagnostics) {
      lines.push(`- ${rel(d.file)}:${d.line} [${d.severity}] ${d.ruleId}: ${d.message}`);
    }
  }

  const content = lines.join("\n");

  if (options.path) {
    const outputPath = join(process.cwd(), options.path);
    await writeFile(outputPath, content, "utf-8");
    console.log();
    console.log(pc.green(`  Report saved to ${outputPath}`));
    console.log();
  }
}

function printJson(results: LintResult[], options: PrintOptions): void {
  const output = {
    summary: {
      filesAnalyzed: options.filesAnalyzed,
      errorCount: results.reduce((sum, r) => sum + r.errorCount, 0),
      warningCount: results.reduce((sum, r) => sum + r.warningCount, 0),
      duration: options.duration,
    },
    results: results.map((r) => ({
      file: r.file,
      errors: r.errorCount,
      warnings: r.warningCount,
      issues: r.diagnostics.map((d) => ({
        rule: d.ruleId,
        severity: d.severity,
        line: d.line,
        column: d.column,
        message: d.message,
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
