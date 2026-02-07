import ora from "ora";
import { relative } from "node:path";
import { readFile } from "node:fs/promises";
import { lintFiles, globFiles } from "../core/index.js";
import { c, theme } from "../ui/theme.js";
import * as logger from "../ui/logger.js";
import { analyze, detectProvider, getProviderSetupInstructions } from "../ai/index.js";
import type { LinterOptions, LinterResult, LintIssue } from "../types.js";
import type { AIFileContent, AIIssue } from "../ai/types.js";

export async function runLinter(options: LinterOptions): Promise<void> {
  const paths = await globFiles(options.path, options.ignore ?? []);

  if (paths.length === 0) {
    logger.warn("No .ts, .tsx, .js or .jsx files found to analyze.");
    return;
  }

  if (options.ai) {
    await runAIAnalysis(paths, options.aiProvider);
  } else {
    await runStaticAnalysis(paths, options);
  }
}

async function runAIAnalysis(paths: string[], aiProvider?: "openai" | "claude" | "gemini" | "ollama"): Promise<void> {
  const config = detectProvider(aiProvider);
  
  if (!config) {
    logger.error("No AI provider configured");
    logger.info(getProviderSetupInstructions());
    process.exit(1);
  }

  const spinner = ora({ 
    text: theme.brand.secondary(`Analyzing ${paths.length} files with AI...`), 
    color: theme.spinner.color 
  }).start();

  const start = Date.now();
  
  try {
    // Leer contenido de los archivos
    const files: AIFileContent[] = await Promise.all(
      paths.map(async (path) => ({
        path,
        content: await readFile(path, "utf-8"),
      }))
    );

    const result = await analyze(config, files);
    
    spinner.stop();
    const duration = Date.now() - start;

    // Convertir AIIssue a LintIssue
    const issues: LintIssue[] = result.issues.map((issue: AIIssue) => ({
      ruleId: issue.ruleId,
      message: issue.message,
      severity: issue.severity,
      line: issue.line,
      column: issue.column,
      file: issue.file,
      suggestion: issue.suggestion,
    }));

    const filesWithIssues = new Set(issues.map((i) => i.file)).size;
    const linterResult: LinterResult = {
      issues,
      filesAnalyzed: paths.length,
      filesWithIssues,
      duration,
    };

    printPretty(linterResult);

    const hasErrors = issues.some((i) => i.severity === "error");
    if (hasErrors) process.exit(1);
    
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

async function runStaticAnalysis(paths: string[], options: LinterOptions): Promise<void> {
  const spinner = ora({ 
    text: theme.brand.secondary(`Analyzing ${paths.length} files...`), 
    color: theme.spinner.color 
  }).start();

  const start = Date.now();
  let results: Awaited<ReturnType<typeof lintFiles>>;
  try {
    results = await lintFiles(paths);
  } finally {
    spinner.stop();
  }

  const duration = Date.now() - start;

  const issues: LintIssue[] = [];
  for (const r of results) {
    for (const d of r.diagnostics) {
      issues.push({
        ruleId: d.ruleId,
        message: d.message,
        severity: d.severity,
        line: d.line,
        column: d.column,
        file: d.file,
        suggestion: d.suggestion,
      });
    }
  }

  const filesWithIssues = new Set(issues.map((i) => i.file)).size;
  const result: LinterResult = {
    issues,
    filesAnalyzed: paths.length,
    filesWithIssues,
    duration,
  };

  switch (options.format ?? "pretty") {
    case "json":
      console.log(JSON.stringify(result, null, 2));
      break;
    case "compact":
      printCompact(result);
      break;
    case "pretty":
    default:
      printPretty(result);
  }

  const hasErrors = result.issues.some((i) => i.severity === "error");
  if (hasErrors) process.exit(1);
}

function rel(file: string): string {
  try {
    return relative(process.cwd(), file) || file;
  } catch {
    return file;
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "error":
      return theme.severity.error(theme.icons.error);
    case "warning":
      return theme.severity.warning(theme.icons.warning);
    case "info":
      return theme.severity.info(theme.icons.info);
    default:
      return theme.icons.bullet;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "error":
      return c.red;
    case "warning":
      return c.yellow;
    case "info":
      return c.blue;
    default:
      return c.white;
  }
}

function printPretty(result: LinterResult): void {
  if (result.issues.length === 0) {
    logger.newLine();
    logger.success(c.bold("No issues found!"));
    logger.log(c.dim(`  ${result.filesAnalyzed} files analyzed in ${result.duration}ms`));
    return;
  }

  logger.newLine();
  
  const byFile = new Map<string, LintIssue[]>();
  for (const issue of result.issues) {
    const list = byFile.get(issue.file) ?? [];
    list.push(issue);
    byFile.set(issue.file, list);
  }

  for (const [file, fileIssues] of byFile) {
    const relativePath = rel(file);
    logger.log(c.cyan.bold(`
${theme.icons.branch} ${relativePath}`));
    
    for (let i = 0; i < fileIssues.length; i++) {
      const issue = fileIssues[i];
      const isLast = i === fileIssues.length - 1;
      const prefix = isLast ? theme.icons.corner : theme.icons.branch;
      
      const severityIcon = getSeverityIcon(issue.severity);
      const location = c.dim(`${issue.line}:${issue.column}`);
      
      logger.log(`  ${prefix} ${severityIcon} ${location} ${issue.message}`);
      
      if (issue.suggestion) {
        const suggestionPrefix = isLast ? "    " : "   │";
        logger.log(c.dim(`${suggestionPrefix} ${theme.icons.arrow} ${issue.suggestion}`));
      }
    }
  }

  logger.newLine();
  logger.separator();
  
  printSummary(result);
}

function printSummary(result: LinterResult): void {
  const errors = result.issues.filter((i) => i.severity === "error").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const infos = result.issues.filter((i) => i.severity === "info").length;

  const parts: string[] = [];
  if (errors) parts.push(getSeverityColor("error")(`${errors} error${errors !== 1 ? "s" : ""}`));
  if (warnings) parts.push(getSeverityColor("warning")(`${warnings} warning${warnings !== 1 ? "s" : ""}`));
  if (infos) parts.push(getSeverityColor("info")(`${infos} info${infos !== 1 ? "s" : ""}`));

  if (parts.length > 0) {
    logger.log(c.bold("Issues: ") + parts.join(c.dim(" · ")));
  }
  
  const stats = [
    `${result.filesAnalyzed} files analyzed`,
    `${result.filesWithIssues} with issues`,
    `${result.duration}ms`,
  ].join(c.dim(" · "));
  
  logger.log(c.dim(stats));
}

function printCompact(result: LinterResult): void {
  for (const issue of result.issues) {
    console.log(
      `${rel(issue.file)}:${issue.line}:${issue.column} ${issue.severity}: ${issue.message} [${issue.ruleId}]`,
    );
  }
}
