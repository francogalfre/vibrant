import ora from "ora";
import { readFile, writeFile } from "node:fs/promises";
import { lintFiles, globFiles, applyFixes } from "../core/index.js";
import { rules } from "../rules/index.js";
import { loadConfig, normalizeRuleConfig } from "../config/loader.js";
import * as logger from "../ui/logger.js";
import { printResults, type FormatType } from "../ui/formatters.js";
import {
  analyze,
  detectProvider,
  getModifiedFiles,
  updateCache,
} from "../ai/index.js";
import {
  printVibrascope,
  calculateScore,
  calculateVibeLevel,
  printSuccessBox,
  printStatsBox,
  printTips,
  PRIMARY,
} from "../ui/vibrascope.js";
import type {
  LintResult,
  Severity,
  RuleModule,
  Config,
} from "../core/types.js";
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
    logger.warn("No files found.");
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

  console.log();
  console.log(PRIMARY(pc.bold("  Vibrant AI Analysis")));
  console.log();

  const spinner = ora({ text: "Analyzing...", color: "magenta" }).start();

  const allFiles: AIFileContent[] = await Promise.all(
    paths.map(async (path) => ({
      path,
      content: await readFile(path, "utf-8"),
    })),
  );

  spinner.text = "Running AI analysis...";

  const { modified, stats } = await getModifiedFiles(allFiles);
  
  if (stats.cached > 0) {
    spinner.text = `Analyzing (${stats.modified} new, ${stats.cached} cached)...`;
  }

  const result = await analyze(config, modified, { 
    useSummarizer: true, 
    verbose: false,
    maxChunkTokens: 1500,
    isSingleFile,
  });

  spinner.succeed("Analysis complete");

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
    printSuccessBox(paths.length, duration);
    return;
  }

  console.log();
  printIssuesSection(issues);

  printFinalDiagnosis({
    errors,
    warnings,
    totalIssues,
    filesCount: paths.length,
    duration,
    summary: result.summary,
    highlights: result.highlights,
    recommendations: result.recommendations,
    isSingleFile,
  });

  const hasErrors = issues.some((i) => i.severity === "error");
  if (hasErrors) process.exit(1);
}

function printIssuesSection(issues: Array<{
  file: string;
  line: number;
  column: number;
  severity: Severity;
  ruleId: string;
  message: string;
  suggestion: string;
}>): void {
  console.log(PRIMARY(pc.bold("  Issues")));
  console.log();

  const byFile = new Map<string, typeof issues>();
  for (const issue of issues) {
    const list = byFile.get(issue.file) ?? [];
    list.push(issue);
    byFile.set(issue.file, list);
  }

  for (const [file, fileIssues] of byFile) {
    const fileName = file.split("/").pop() || file;
    
    for (const issue of fileIssues) {
      const icon = issue.severity === "error" ? "✖" : issue.severity === "warn" ? "⚠" : "ℹ";
      const color = issue.severity === "error" ? pc.red : issue.severity === "warn" ? pc.yellow : PRIMARY;

      console.log(`  ${color(fileName)}:${issue.line}:${issue.column}`);
      console.log(`    ${pc.dim("└─")} ${issue.ruleId}`);
      console.log(`       ${icon} ${pc.gray(issue.message)}`);

      if (issue.suggestion) {
        console.log(`       ${pc.green("→")} ${pc.green(issue.suggestion)}`);
      }
      console.log();
    }
  }
}

interface DiagnosisData {
  errors: number;
  warnings: number;
  totalIssues: number;
  filesCount: number;
  duration: number;
  summary?: string;
  highlights?: string[];
  recommendations?: string[];
  isSingleFile: boolean;
}

function printFinalDiagnosis(data: DiagnosisData): void {
  const { errors, warnings, totalIssues, filesCount, duration, summary, highlights, recommendations, isSingleFile } = data;
  
  const score = calculateScore(totalIssues, filesCount);
  const level = calculateVibeLevel(totalIssues, filesCount);

  printVibrascope(level, score);

  if (summary) {
    console.log(PRIMARY(pc.bold("  Diagnosis")));
    console.log();
    const lines = summary.split("\n");
    for (const line of lines) {
      if (line.trim()) {
        console.log(pc.dim("  ") + line);
      }
    }
    console.log();
  }

  if (highlights && highlights.length > 0) {
    console.log(PRIMARY(pc.bold("  Key Findings")));
    console.log();
    for (const h of highlights.slice(0, 5)) {
      console.log(pc.dim("  • ") + h);
    }
    console.log();
  }

  if (recommendations && recommendations.length > 0) {
    console.log(PRIMARY(pc.bold("  Suggestions")));
    console.log();
    for (const r of recommendations.slice(0, 3)) {
      console.log(pc.dim("  → ") + pc.green(r));
    }
    console.log();
  }

  printStatsBox(errors, warnings, filesCount, duration);

  if (!isSingleFile) {
    printTips();
  }
}

async function runStaticAnalysis(
  paths: string[],
  config: Config,
  options: LintCommandOptions,
): Promise<void> {
  const spinner = ora({ text: "Analyzing...", color: "magenta" }).start();
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
      console.log(pc.green(`  ✓ Fixed ${fixCount} issues`));
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
    } catch {
      logger.warn(`Could not fix ${result.file}`);
    }
  }
}

function normalizeSeverity(severity: string): Severity {
  switch (severity) {
    case "error":
      return "error";
    case "warn":
    case "warning":
      return "warn";
    case "info":
      return "info";
    default:
      return "warn";
  }
}
