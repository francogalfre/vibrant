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
  aiProvider?: "openai" | "claude" | "gemini" | "ollama",
): Promise<void> {
  const config = detectProvider(aiProvider);

  if (!config) {
    logger.error("No AI provider configured");
    logger.info(getProviderSetupInstructions());
    process.exit(1);
  }

  const cacheStats = await getCacheStats();
  
  const spinner = ora({
    text: theme.brand.secondary(`Analyzing ${paths.length} files with AI...`),
    color: theme.spinner.color,
  }).start();

  const start = Date.now();

  try {
    // Read all files
    const allFiles: AIFileContent[] = await Promise.all(
      paths.map(async (path) => ({
        path,
        content: await readFile(path, "utf-8"),
      })),
    );

    // Get only modified files (incremental analysis)
    const { modified, cached, stats } = await getModifiedFiles(allFiles);
    
    if (stats.cached > 0) {
      spinner.text = theme.brand.secondary(
        `Analyzing ${stats.modified} files (${stats.cached} cached)...`
      );
    }

    // Analyze only modified files
    let result = await analyze(config, modified, { 
      useSummarizer: true, 
      verbose: false,
      maxChunkTokens: 1500 
    });

    // Update cache with new analysis
    const issueCounts: Record<string, number> = {};
    for (const issue of result.issues) {
      issueCounts[issue.file] = (issueCounts[issue.file] || 0) + 1;
    }
    await updateCache(modified, issueCounts);

    spinner.stop();
    const duration = Date.now() - start;

    // Show token savings if available
    if (result.metadata) {
      logger.info(
        c.gray(`💡 Token savings: ${result.metadata.savings} (${result.metadata.summaryTokens.toLocaleString()} vs ${result.metadata.originalTokens.toLocaleString()})`)
      );
    }

    const issues = result.issues.map((issue: AIIssue) => ({
      ruleId: issue.ruleId,
      message: issue.message,
      severity: normalizeSeverity(issue.severity),
      line: issue.line,
      column: issue.column,
      file: issue.file,
    }));

    const lintResult: LintResult = {
      file: "ai-analysis",
      diagnostics: issues.map((i) => ({
        file: i.file,
        line: i.line,
        column: i.column,
        message: i.message,
        severity: i.severity as Severity,
        ruleId: i.ruleId,
      })),
      errorCount: issues.filter((i) => i.severity === "error").length,
      warningCount: issues.filter((i) => i.severity === "warn").length,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    };

    await printResults([lintResult], {
      format: "pretty",
      duration,
      filesAnalyzed: paths.length,
    });

    const hasErrors = issues.some((i) => i.severity === "error");
    if (hasErrors) process.exit(1);
  } catch (error) {
    spinner.stop();
    throw error;
  }
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
