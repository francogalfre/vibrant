import ora from "ora";
import { relative, resolve, join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { lintFiles, globFiles, applyFixes } from "../core/index.js";
import { rules } from "../rules/index.js";
import { loadConfig, normalizeRuleConfig } from "../config/loader.js";
import { c, theme } from "../ui/theme.js";
import * as logger from "../ui/logger.js";
import { analyze, detectProvider, getProviderSetupInstructions } from "../ai/index.js";
import type { LintResult, Diagnostic } from "../core/types.js";
import type { LinterOptions } from "../types.js";
import type { AIFileContent, AIIssue } from "../ai/types.js";

export interface LintCommandOptions extends LinterOptions {
  fix?: boolean;
}

export async function runLinter(options: LintCommandOptions): Promise<void> {
  const cwd = process.cwd();
  
  const config = await loadConfig(cwd);
  const paths = await globFiles(options.path, [...(config.ignores ?? []), ...(options.ignore ?? [])]);

  if (paths.length === 0) {
    logger.warn("No .ts, .tsx, .js or .jsx files found to analyze.");
    return;
  }

  if (options.ai) {
    await runAIAnalysis(paths, options.aiProvider);
    return;
  }

  await runStaticAnalysis(paths, config, options);
}

async function runAIAnalysis(
  paths: string[],
  aiProvider?: "openai" | "claude" | "gemini" | "ollama"
): Promise<void> {
  const config = detectProvider(aiProvider);

  if (!config) {
    logger.error("No AI provider configured");
    logger.info(getProviderSetupInstructions());
    process.exit(1);
  }

  const spinner = ora({
    text: theme.brand.secondary(`Analyzing ${paths.length} files with AI...`),
    color: theme.spinner.color,
  }).start();

  const start = Date.now();

  try {
    const files: AIFileContent[] = await Promise.all(
      paths.map(async (path) => ({
        path,
        content: await readFile(path, "utf-8"),
      }))
    );

    const result = await analyze(config, files);

    spinner.stop();
    const duration = Date.now() - start;

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
        severity: i.severity as import("../core/types.js").Severity,
        ruleId: i.ruleId,
      })),
      errorCount: issues.filter((i) => i.severity === "error").length,
      warningCount: issues.filter((i) => i.severity === "warn").length,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    };

    printResults([lintResult], { format: "pretty", duration, filesAnalyzed: paths.length });

    const hasErrors = issues.some((i) => i.severity === "error");
    if (hasErrors) process.exit(1);
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

async function runStaticAnalysis(
  paths: string[],
  config: import("../core/types.js").Config,
  options: LintCommandOptions
): Promise<void> {
  const spinner = ora({
    text: theme.brand.secondary(`Analyzing ${paths.length} files...`),
    color: theme.spinner.color,
  }).start();

  const start = Date.now();

  const ruleMap = new Map<string, import("../core/types.js").Rule>();
  const ruleConfigMap = new Map<string, [string, ...unknown[]]>();

  for (const [ruleId, ruleConfig] of Object.entries(config.rules || {})) {
    const rule = rules[ruleId];
    if (rule) {
      ruleMap.set(ruleId, rule);
      ruleConfigMap.set(ruleId, normalizeRuleConfig(ruleConfig));
    }
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

    await printResults(results, {
      format: options.format ?? config.format ?? "pretty",
      duration,
      filesAnalyzed: paths.length,
      fixableErrors: totalFixableErrors,
      fixableWarnings: totalFixableWarnings,
      path: (options.format === "plan" || config.format === "plan") ? "vibrant-errors.md" : undefined,
    });

    if (options.fix) {
      await applyFixesToFiles(results);
      logger.success(c.green(`✨ Fixed ${totalFixableErrors + totalFixableWarnings} issues automatically`));
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
    const fixes = result.diagnostics
      .filter((d) => d.fix)
      .map((d) => d.fix!);

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

interface PrintOptions {
  format: string;
  duration: number;
  filesAnalyzed: number;
  fixableErrors?: number;
  fixableWarnings?: number;
  path?: string;
}

async function printResults(results: LintResult[], options: PrintOptions): Promise<void> {
  switch (options.format) {
    case "json":
      printJSON(results, options);
      break;
    case "compact":
      printCompact(results, options);
      break;
    case "stylish":
      printStylish(results, options);
      break;
    case "plan":
      await printPlan(results, options);
      break;
    case "pretty":
    default:
      printPretty(results, options);
  }
}

function printPretty(results: LintResult[], options: PrintOptions): void {
  const allDiagnostics = results.flatMap((r) => r.diagnostics);

  if (allDiagnostics.length === 0) {
    logger.newLine();
    logger.log(theme.severity.success(`${theme.icons.success} ${c.bold("All good! No issues found")} ${theme.icons.sparkles}`));
    logger.newLine();
    logger.log(c.dim(`   ${theme.icons.file} ${options.filesAnalyzed} files analyzed`));
    logger.log(c.dim(`   ${theme.icons.clock} ${options.duration}ms`));
    logger.newLine();
    return;
  }

  logger.newLine();
  logger.log(c.bold(`${theme.icons.file} Analysis Results`));
  logger.separator();

  const byFile = new Map<string, Diagnostic[]>();
  for (const diagnostic of allDiagnostics) {
    const list = byFile.get(diagnostic.file) ?? [];
    list.push(diagnostic);
    byFile.set(diagnostic.file, list);
  }

  for (const [file, fileDiagnostics] of byFile) {
    const relativePath = rel(file);
    logger.newLine();
    logger.log(c.cyan.bold(`${theme.icons.folder} ${relativePath}`));

    for (let i = 0; i < fileDiagnostics.length; i++) {
      const diagnostic = fileDiagnostics[i];
      const isLast = i === fileDiagnostics.length - 1;
      const connector = isLast ? c.dim("└──") : c.dim("├──");
      
      const severityIcon = getSeverityIcon(diagnostic.severity);
      const location = c.dim(`Line ${diagnostic.line}, Col ${diagnostic.column}`);
      
      logger.log(`  ${connector} ${severityIcon} ${c.dim(`[${diagnostic.ruleId}]`)}`);
      logger.log(`      ${c.dim("📍")} ${location}`);
      
      // Wrap message to 70 chars for readability
      const wrappedMessage = wrapText(diagnostic.message, 70);
      const messageLines = wrappedMessage.split('\n');
      for (let j = 0; j < messageLines.length; j++) {
        logger.log(`      ${c.white(messageLines[j])}`);
      }

      if (diagnostic.suggestions && diagnostic.suggestions.length > 0) {
        const suggestionConnector = isLast ? "   " : "   │";
        logger.log(`      ${suggestionConnector} ${theme.icons.hint} ${c.cyan(diagnostic.suggestions[0].desc)}`);
      }

      if (diagnostic.fix) {
        const fixConnector = isLast ? "   " : "   │";
        logger.log(`      ${fixConnector} ${theme.icons.sparkles} ${c.green("Auto-fix available")}`);
      }
      
      if (!isLast) {
        logger.newLine();
      }
    }
  }

  logger.newLine();
  logger.separator();
  printSummary(results, options);
}

function printStylish(results: LintResult[], options: PrintOptions): void {
  const allDiagnostics = results.flatMap((r) => r.diagnostics);

  if (allDiagnostics.length === 0) {
    console.log("No issues found.");
    return;
  }

  const byFile = new Map<string, Diagnostic[]>();
  for (const diagnostic of allDiagnostics) {
    const list = byFile.get(diagnostic.file) ?? [];
    list.push(diagnostic);
    byFile.set(diagnostic.file, list);
  }

  for (const [file, fileDiagnostics] of byFile) {
    console.log(`\n${file}`);
    for (const diagnostic of fileDiagnostics) {
      const severity = diagnostic.severity === "warn" ? "warning" : diagnostic.severity;
      console.log(`  ${diagnostic.line}:${diagnostic.column}  ${severity}  ${diagnostic.message}  ${diagnostic.ruleId}`);
    }
  }

  console.log("\n" + "✖".repeat(70));
  printSummary(results, options);
}

function printCompact(results: LintResult[], options: PrintOptions): void {
  for (const result of results) {
    for (const diagnostic of result.diagnostics) {
      const severity = diagnostic.severity === "warn" ? "warning" : diagnostic.severity;
      console.log(
        `${rel(diagnostic.file)}:${diagnostic.line}:${diagnostic.column}: ${severity}: ${diagnostic.message} [${diagnostic.ruleId}]`
      );
    }
  }
}

function printJSON(results: LintResult[], options: PrintOptions): void {
  const allDiagnostics = results.flatMap(r => r.diagnostics);
  
  const output = {
    version: "1.0",
    summary: {
      filesAnalyzed: options.filesAnalyzed,
      filesWithIssues: results.filter(r => r.diagnostics.length > 0).length,
      duration: options.duration,
      errorCount: results.reduce((sum, r) => sum + r.errorCount, 0),
      warningCount: results.reduce((sum, r) => sum + r.warningCount, 0),
      fixableErrorCount: options.fixableErrors || 0,
      fixableWarningCount: options.fixableWarnings || 0,
      totalIssues: allDiagnostics.length,
    },
    issues: allDiagnostics.map((d) => ({
      file: rel(d.file),
      line: d.line,
      column: d.column,
      severity: d.severity,
      ruleId: d.ruleId,
      message: d.message,
      fixable: !!d.fix,
      suggestions: d.suggestions?.map(s => s.desc) || [],
    })),
    files: results
      .filter(r => r.diagnostics.length > 0)
      .map((r) => ({
        filePath: rel(r.file),
        errorCount: r.errorCount,
        warningCount: r.warningCount,
        fixableErrorCount: r.fixableErrorCount,
        fixableWarningCount: r.fixableWarningCount,
        diagnostics: r.diagnostics.map(d => ({
          line: d.line,
          column: d.column,
          severity: d.severity,
          ruleId: d.ruleId,
          message: d.message,
          fixable: !!d.fix,
        })),
      })),
  };

  console.log(JSON.stringify(output, null, 2));
}

function printSummary(results: LintResult[], options: PrintOptions): void {
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  const filesWithIssues = results.filter((r) => r.diagnostics.length > 0).length;

  logger.newLine();
  logger.log(c.bold("📊 Summary"));
  logger.newLine();
  
  const errorMsg = totalErrors > 0 
    ? c.red(`${theme.icons.error} ${totalErrors} error${totalErrors !== 1 ? "s" : ""}`)
    : c.green(`${theme.icons.success} 0 errors`);
    
  const warningMsg = totalWarnings > 0
    ? c.yellow(`${theme.icons.warning} ${totalWarnings} warning${totalWarnings !== 1 ? "s" : ""}`)
    : c.gray(`${theme.icons.success} 0 warnings`);

  logger.log(`  ${errorMsg}`);
  logger.log(`  ${warningMsg}`);
  logger.newLine();
  
  logger.log(c.dim(`  📁 ${options.filesAnalyzed} files analyzed`));
  logger.log(c.dim(`  📂 ${filesWithIssues} file${filesWithIssues !== 1 ? "s" : ""} with issues`));
  logger.log(c.dim(`  ⏱️  ${options.duration}ms`));
  
  if ((options.fixableErrors || options.fixableWarnings) && totalErrors + totalWarnings > 0) {
    const totalFixable = (options.fixableErrors || 0) + (options.fixableWarnings || 0);
    logger.newLine();
    logger.log(`${theme.icons.sparkles} ${c.cyan(`${totalFixable} issue${totalFixable !== 1 ? "s" : ""} can be auto-fixed`)}`);
    logger.log(c.dim(`   Run with --fix to apply changes automatically`));
  }
  
  logger.newLine();
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
    case "warn":
    case "warning":
      return theme.severity.warning(theme.icons.warning);
    case "info":
      return theme.severity.info(theme.icons.info);
    default:
      return theme.icons.bullet;
  }
}

function normalizeSeverity(severity: string): import("../core/types.js").Severity {
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

function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines.join('\n');
}

async function printPlan(results: LintResult[], options: PrintOptions): Promise<void> {
  const allDiagnostics = results.flatMap((r) => r.diagnostics);
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  
  const lines: string[] = [];
  
  lines.push(`# 🔍 Code Analysis Report`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Files analyzed: ${options.filesAnalyzed}`);
  lines.push(`Duration: ${options.duration}ms`);
  lines.push('');
  
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`- **Errors:** ${totalErrors}`);
  lines.push(`- **Warnings:** ${totalWarnings}`);
  lines.push(`- **Files with issues:** ${results.filter(r => r.diagnostics.length > 0).length}`);
  lines.push('');
  
  if (allDiagnostics.length === 0) {
    lines.push(`## ✅ Result`);
    lines.push('');
    lines.push('No issues found! All code passes the analysis.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Instructions');
    lines.push('');
    lines.push('This report was automatically generated by **Vibrant**, a tool designed to detect');
    lines.push('vibecoded (AI-generated) patterns in your codebase.');
    lines.push('');
    lines.push('**Vibrant** helps identify common issues in AI-generated code such as:');
    lines.push('- Generic variable names (data, result, item, etc.)');
    lines.push('- Debug console statements left behind');
    lines.push('- Empty function bodies');
    lines.push('- Hardcoded credentials');
    lines.push('- Magic numbers');
    lines.push('- And more...');
    lines.push('');
    lines.push('To run the analysis:');
    lines.push('```bash');
    lines.push('npx vibrant');
    lines.push('```');
    lines.push('');
    lines.push('To auto-fix issues:');
    lines.push('```bash');
    lines.push('npx vibrant --fix');
    lines.push('```');
    
    const content = lines.join('\n');
    
    if (options.path) {
      const outputPath = join(process.cwd(), options.path);
      await writeFile(outputPath, content, 'utf-8');
      logger.success(`Report saved to ${outputPath}`);
    } else {
      
    }
    return;
  }
  
  const byFile = new Map<string, Diagnostic[]>();
  for (const diagnostic of allDiagnostics) {
    const list = byFile.get(diagnostic.file) ?? [];
    list.push(diagnostic);
    byFile.set(diagnostic.file, list);
  }
  
  lines.push(`## Issues by File`);
  lines.push('');
  
  for (const [file, fileDiagnostics] of byFile) {
    const relativePath = rel(file);
    lines.push(`### 📁 ${relativePath}`);
    lines.push('');
    
    for (let i = 0; i < fileDiagnostics.length; i++) {
      const diagnostic = fileDiagnostics[i];
      const severity = diagnostic.severity === 'error' ? '🔴 ERROR' : 
                       diagnostic.severity === 'warn' ? '⚠️ WARNING' : 'ℹ️ INFO';
      
      lines.push(`#### Issue ${i + 1}: ${severity}`);
      lines.push('');
      lines.push(`**Location:** Line ${diagnostic.line}, Column ${diagnostic.column}`);
      lines.push('');
      lines.push(`**Rule:** \`${diagnostic.ruleId}\``);
      lines.push('');
      lines.push(`**Description:**`);
      lines.push(diagnostic.message);
      lines.push('');
      
      if (diagnostic.fix) {
        lines.push(`**🛠️  Auto-fix:** Available - run with \`--fix\` to apply automatically`);
        lines.push('');
      }
      
      if (diagnostic.suggestions && diagnostic.suggestions.length > 0) {
        lines.push(`**💡 Suggestions:**`);
        for (const suggestion of diagnostic.suggestions) {
          lines.push(`- ${suggestion.desc}`);
        }
        lines.push('');
      }
    }
  }
  
  lines.push('---');
  lines.push('');
  lines.push('## For AI Agents');
  lines.push('');
  lines.push('This report is designed to be consumed by AI coding agents. Each issue includes:');
  lines.push('- Precise file location (line:column)');
  lines.push('- Detailed problem description');
  lines.push('- Auto-fix availability status');
  lines.push('- Human-readable suggestions');
  lines.push('');
  lines.push('### Instructions for Resolution');
  lines.push('');
  lines.push('1. **Prioritize ERRORs first** - These represent potential bugs or security issues');
  lines.push('2. **Review WARNINGs** - Code quality and best practices improvements');
  lines.push('3. **Consider INFO items** - Minor improvements and suggestions');
  lines.push('4. **Auto-fix eligible issues** by running: `npx vibrant --fix`');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## About Vibrant');
  lines.push('');
  lines.push('**Vibrant** is a specialized tool that detects vibecoded (AI-generated) patterns in codebases.');
  lines.push('It helps identify common issues introduced by AI code generation tools.');
  lines.push('');
  lines.push('### Available Rules');
  lines.push('');
  lines.push('| Rule | Description | Severity |');
  lines.push('|------|-------------|----------|');
  lines.push('| generic-variable-name | Detects vague variable names like data, result, item | warning |');
  lines.push('| console-log-debugging | Finds leftover debug console statements | warning |');
  lines.push('| empty-function-body | Identifies functions with no implementation | warning |');
  lines.push('| empty-catch-block | Catches silent error suppression | error |');
  lines.push('| hardcoded-credentials | Detects exposed secrets in code | error |');
  lines.push('| magic-numbers | Finds unexplained numeric literals | warning |');
  lines.push('| no-explicit-any | Flags use of unsafe `any` type | warning |');
  lines.push('| generic-comment | Catches placeholder TODOs | warning |');
  lines.push('| unimplemented-error | Detects placeholder error throws | warning |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Report generated by Vibrant*');
  
  const content = lines.join('\n');
  
  if (options.path) {
    const outputPath = join(process.cwd(), options.path);
    await writeFile(outputPath, content, 'utf-8');
    logger.success(`Report saved to ${outputPath}`);
  } else {
    
  }
}
