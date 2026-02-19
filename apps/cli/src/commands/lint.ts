import ora from "ora";
import { readFile, writeFile } from "node:fs/promises";
import { lintFiles, globFiles, applyFixes } from "../core/index.js";
import { rules } from "../rules/index.js";
import { loadConfig, normalizeRuleConfig } from "../config/loader.js";
import { printResults, type FormatType } from "../ui/formatters.js";
import {
  analyze,
  detectProvider,
  getModifiedFiles,
  updateCache,
} from "../ai/index.js";
import {
  printHeader,
  printVibrascope,
  printSuccess,
  printStats,
  calculateScore,
  calculateVibeLevel,
  PRIMARY,
} from "../ui/vibrascope.js";
import type { LintResult, Severity, RuleModule, Config } from "../core/types.js";
import type { LinterOptions } from "../types.js";
import type { AIFileContent, AIIssue } from "../ai/types.js";
import pc from "picocolors";

export interface LintCommandOptions extends LinterOptions {
  fix?: boolean;
}

export async function runLinter(options: LintCommandOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const ignorePatterns = options.ignore ?? config.ignores ?? config.ignore ?? [];
  const paths = await globFiles(options.path, ignorePatterns);

  if (paths.length === 0) {
    console.log();
    console.log(pc.dim("  No files found"));
    console.log();
    return;
  }

  const aiProvider = options.aiProvider ?? config.provider;
  
  if (options.ai) {
    await runAIAnalysis(paths, aiProvider);
    return;
  }

  await runStaticAnalysis(paths, config, options);
}

async function runAIAnalysis(
  paths: string[],
  aiProvider?: "openai" | "claude" | "gemini" | "ollama" | "openrouter",
): Promise<void> {
  const config = detectProvider(aiProvider);

  if (!config) {
    const error = new Error("No AI provider configured");
    (error as any).code = "NO_PROVIDER";
    throw error;
  }

  const start = Date.now();
  const isSingleFile = paths.length === 1;

  printHeader();

  const spinner = ora({ text: "scanning...", color: "magenta", spinner: "dots" }).start();

  const allFiles: AIFileContent[] = await Promise.all(
    paths.map(async (path) => ({
      path,
      content: await readFile(path, "utf-8"),
    })),
  );

  const { modified, stats } = await getModifiedFiles(allFiles);
  
  if (stats.cached > 0) {
    spinner.text = `${stats.modified} new, ${stats.cached} cached`;
  }

  const result = await analyze(config, modified, { 
    useSummarizer: true, 
    verbose: false,
    maxChunkTokens: 1500,
    isSingleFile,
  });

  spinner.stop();

  const issueCounts: Record<string, number> = {};
  for (const issue of result.issues) {
    issueCounts[issue.file] = (issueCounts[issue.file] || 0) + 1;
  }
  await updateCache(modified, issueCounts);

  const duration = Date.now() - start;
  const issues = result.issues.map((issue: AIIssue) => ({
    ruleId: issue.ruleId,
    message: issue.message,
    suggestion: issue.suggestion,
    severity: normalizeSeverity(issue.severity),
    line: issue.line,
    column: issue.column,
    file: issue.file,
  }));

  const errors = issues.filter(i => i.severity === "error").length;
  const warnings = issues.filter(i => i.severity === "warn").length;
  const totalIssues = issues.length;

  if (issues.length === 0) {
    printSuccess(paths.length, duration);
    return;
  }

  const score = calculateScore(totalIssues, paths.length);
  const level = calculateVibeLevel(totalIssues, paths.length);

  printVibrascope(level, score);
  printIssues(issues);

  if (result.summary) {
    console.log(`  ${pc.dim(result.summary)}`);
  }

  printStats(errors, warnings, paths.length, duration);

  if (hasErrors(issues)) process.exit(1);
}

function printIssues(issues: Array<{
  file: string;
  line: number;
  column: number;
  severity: Severity;
  ruleId: string;
  message: string;
  suggestion: string;
}>): void {
  const byFile = new Map<string, typeof issues>();
  for (const issue of issues) {
    const list = byFile.get(issue.file) ?? [];
    list.push(issue);
    byFile.set(issue.file, list);
  }

  for (const [file, fileIssues] of byFile) {
    const name = file.split("/").pop() || file;
    
    for (const issue of fileIssues) {
      const icon = issue.severity === "error" ? pc.red("✕") : issue.severity === "warn" ? pc.yellow("⚠") : pc.dim("·");
      const line = `${pc.dim(name)}:${issue.line}`;
      console.log(`  ${icon} ${line}`);
      console.log(`    ${pc.dim(issue.message)}`);
      if (issue.suggestion) {
        console.log(`    ${pc.green(issue.suggestion)}`);
      }
      console.log();
    }
  }
}

async function runStaticAnalysis(
  paths: string[],
  config: Config,
  options: LintCommandOptions,
): Promise<void> {
  const spinner = ora({ text: "scanning...", color: "magenta", spinner: "dots" }).start();
  const start = Date.now();

  const ruleMap = new Map<string, RuleModule>();
  if (config.rules) {
    for (const ruleId of Object.keys(config.rules)) {
      const rule = rules[ruleId];
      if (rule) ruleMap.set(ruleId, rule);
    }
  }

  const ruleConfigMap = new Map<string, [Severity, ...unknown[]]>();
  for (const [ruleId, ruleConfig] of Object.entries(config.rules || {})) {
    const normalized = normalizeRuleConfig(ruleConfig);
    ruleConfigMap.set(ruleId, normalized as [Severity, ...unknown[]]);
  }

  try {
    const results = await lintFiles(paths, {
      rules: ruleMap,
      ruleConfig: ruleConfigMap,
      fix: options.fix,
    });

    spinner.stop();
    const duration = Date.now() - start;

    const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
    const totalFixableErrors = results.reduce((sum, r) => sum + r.fixableErrorCount, 0);
    const totalFixableWarnings = results.reduce((sum, r) => sum + r.fixableWarningCount, 0);

    const format = (options.format ?? config.format ?? "pretty") as FormatType;

    await printResults(results, {
      format,
      duration,
      filesAnalyzed: paths.length,
      fixableErrors: totalFixableErrors,
      fixableWarnings: totalFixableWarnings,
      path: format === "plan" ? "vibrant-report.md" : undefined,
    });

    if (options.fix) {
      await applyFixesToFiles(results);
      const fixCount = totalFixableErrors + totalFixableWarnings;
      console.log();
      console.log(`  ${pc.green("✓")} fixed ${fixCount} issues`);
      console.log();
    }

    if (totalErrors > 0) {
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

async function applyFixesToFiles(results: LintResult[]): Promise<void> {
  for (const result of results) {
    const fixes = result.diagnostics.filter((d) => d.fix).map((d) => d.fix!);
    if (fixes.length === 0) continue;

    try {
      const content = await readFile(result.file, "utf-8");
      const fixed = applyFixes(content, fixes);
      await writeFile(result.file, fixed, "utf-8");
    } catch {}
  }
}

function normalizeSeverity(severity: string): Severity {
  switch (severity) {
    case "error": return "error";
    case "warn":
    case "warning": return "warn";
    case "info": return "info";
    default: return "warn";
  }
}

function hasErrors(issues: Array<{ severity: Severity }>): boolean {
  return issues.some(i => i.severity === "error");
}
