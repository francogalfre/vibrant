import ora from "ora";
import { readFile, writeFile } from "node:fs/promises";
import { lintFiles, globFiles, applyFixes } from "../core/index.js";
import { rules } from "../rules/index.js";
import { loadConfig, normalizeRuleConfig } from "../config/loader.js";
import { c, theme } from "../ui/theme.js";
import * as logger from "../ui/logger.js";
import { printResults, type FormatType } from "../ui/formatters.js";
import {
  analyze,
  detectProvider,
  getProviderSetupInstructions,
  getModifiedFiles,
  updateCache,
  getCacheStats,
} from "../ai/index.js";
import type {
  LintResult,
  Diagnostic,
  Severity,
  RuleModule,
  Config,
} from "../core/types.js";
import type { LinterOptions } from "../types.js";
import type { AIFileContent, AIIssue } from "../ai/types.js";

export interface LintCommandOptions extends LinterOptions {
  fix?: boolean;
}

export async function runLinter(options: LintCommandOptions): Promise<void> {
  const cwd = process.cwd();

  const config = await loadConfig(cwd);
  
  const ignorePatterns = options.ignore ?? config.ignores ?? config.ignore ?? [];
  const paths = await globFiles(options.path, ignorePatterns);

  if (paths.length === 0) {
    logger.warn("No .ts, .tsx, .js or .jsx files found to analyze.");
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
    logger.error("No AI provider configured");
    logger.info(getProviderSetupInstructions());
    process.exit(1);
  }

  const start = Date.now();

  // Step 1: Reading files
  const readSpinner = ora({
    text: theme.brand.secondary(`Reading ${paths.length} files...`),
    color: theme.spinner.color,
  }).start();

  const allFiles: AIFileContent[] = await Promise.all(
    paths.map(async (path) => ({
      path,
      content: await readFile(path, "utf-8"),
    })),
  );

  readSpinner.stop();

  // Step 2: Analyzing with AI
  const analyzeSpinner = ora({
    text: theme.brand.secondary(`Analyzing code with AI...`),
    color: theme.spinner.color,
  }).start();

  const { modified, stats } = await getModifiedFiles(allFiles);
  
  if (stats.cached > 0) {
    analyzeSpinner.text = theme.brand.secondary(
      `Analyzing (${stats.modified} new, ${stats.cached} cached)`
    );
  }

  let result = await analyze(config, modified, { 
    useSummarizer: true, 
    verbose: false,
    maxChunkTokens: 1500 
  });

  analyzeSpinner.stop();

  // Update cache
  const issueCounts: Record<string, number> = {};
  for (const issue of result.issues) {
    issueCounts[issue.file] = (issueCounts[issue.file] || 0) + 1;
  }
  await updateCache(modified, issueCounts);

  // Step 3: Processing
  const processSpinner = ora({
    text: theme.brand.secondary(`Processing response...`),
    color: theme.spinner.color,
  }).start();

  processSpinner.stop();

  // All done!
  console.log();
  console.log(c.green(`${theme.icons.sparkles} ${c.bold("AI Analysis Ready!")}`));
  console.log();

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

  if (issues.length === 0) {
    printAISuccess(duration, paths.length);
    return;
  }

  // Print issues
  printAIResults(issues);

  // Show token savings
  if (result.metadata) {
    console.log(c.dim("─".repeat(70)));
    console.log(
      c.gray(`💡 Token savings: ${result.metadata.savings} (${result.metadata.summaryTokens.toLocaleString()} vs ${result.metadata.originalTokens.toLocaleString()})`)
    );
  }

  // Print summary
  if (result.summary) {
    console.log();
    console.log(c.dim("─".repeat(70)));
    console.log();
    console.log(c.cyan(`${theme.icons.magnifying} ${c.bold("Analysis Summary")}`));
    console.log();
    console.log(c.white(result.summary));
  }

  console.log();
  printAISummary(issues, paths.length, duration);

  const hasErrors = issues.some((i) => i.severity === "error");
  if (hasErrors) process.exit(1);
}

function printAIResults(issues: Array<{
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

  console.log(c.cyan(`${theme.icons.magnifying} ${c.bold("AI Analysis Results")}`));
  console.log();

  for (const [file, fileIssues] of byFile) {
    const fileName = file.split("/").pop() || file;
    
    for (const issue of fileIssues) {
      const severityIcon = issue.severity === "error" 
        ? theme.icons.error 
        : issue.severity === "warn" 
          ? theme.icons.warning 
          : theme.icons.info;
      
      const headerColor = issue.severity === "error" 
        ? c.red 
        : issue.severity === "warn" 
          ? c.yellow 
          : c.cyan;

      console.log(`${c.dim(theme.icons.corner)} ${headerColor(fileName)}:${issue.line}:${issue.column}`);
      console.log(`  ${c.dim(theme.icons.bullet)} ${c.white(issue.ruleId)}`);
      console.log();

      const messageLines = issue.message.split("\n");
      for (const msgLine of messageLines) {
        console.log(`  ${c.dim(severityIcon)} ${msgLine}`);
      }

      if (issue.suggestion) {
        console.log();
        console.log(`  ${theme.icons.lightbulb} ${c.green(issue.suggestion)}`);
      }

      console.log();
    }
  }
}

function printAISuccess(duration: number, filesAnalyzed: number): void {
  console.log(c.green(`${theme.icons.success} ${c.bold("No issues found!")}`));
  console.log();
  console.log(c.dim("─".repeat(70)));
  console.log();
  console.log(
    c.gray(`  ${theme.icons.check} ${filesAnalyzed} files analyzed in ${duration}ms`)
  );
  console.log();
}

function printAISummary(issues: Array<{ severity: Severity; file: string }>, filesAnalyzed: number, duration: number): void {
  const errors = issues.filter(i => i.severity === "error").length;
  const warnings = issues.filter(i => i.severity === "warn").length;
  const filesWithIssues = new Set(issues.map(i => i.file)).size;

  console.log(c.dim("─".repeat(70)));
  console.log();
  console.log(
    c.red(`  ${theme.icons.error} ${errors} errors  `) +
    c.yellow(`  ${theme.icons.warning} ${warnings} warnings  `) +
    c.gray(`  ${theme.icons.folder} ${filesWithIssues}/${filesAnalyzed} files  `) +
    c.gray(`  ${theme.icons.sparkles} ${duration}ms`)
  );
  console.log();
}

async function runStaticAnalysis(
  paths: string[],
  config: Config,
  options: LintCommandOptions,
): Promise<void> {
  const spinner = ora({
    text: theme.brand.secondary(`Analyzing ${paths.length} files...`),
    color: theme.spinner.color,
  }).start();

  const start = Date.now();

  const ruleMap = new Map<string, RuleModule>();

  if (config.rules) {
    for (const ruleId of Object.keys(config.rules)) {
      const rule = rules[ruleId];
      if (rule) {
        ruleMap.set(ruleId, rule);
      }
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
    const totalFixableErrors = results.reduce(
      (sum, r) => sum + r.fixableErrorCount,
      0,
    );
    const totalFixableWarnings = results.reduce(
      (sum, r) => sum + r.fixableWarningCount,
      0,
    );

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
      logger.success(
        c.green(
          `✨ Fixed ${totalFixableErrors + totalFixableWarnings} issues automatically`,
        ),
      );
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
      logger.warn(`Could not apply fixes to ${result.file}`);
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
