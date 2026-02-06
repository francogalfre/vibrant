import pc from "picocolors";
import { lintFiles } from "./linter/index.js";
import { globFiles } from "./glob.js";
import type { LinterOptions, LinterResult, LintIssue } from "./types.js";

export async function runLinter(options: LinterOptions): Promise<void> {
  console.log(pc.blue(`🔍 Analizando: ${options.path}\n`));

  const paths = await globFiles(options.path, options.ignore ?? []);

  if (paths.length === 0) {
    console.log(
      pc.yellow(
        "No se encontraron archivos .ts, .tsx, .js o .jsx para analizar.",
      ),
    );
    return;
  }

  const start = Date.now();
  const results = await lintFiles(paths);
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

function printPretty(result: LinterResult): void {
  if (result.issues.length === 0) {
    console.log(pc.green("✓ No se encontraron problemas"));
    console.log(
      pc.gray(
        `  ${result.filesAnalyzed} archivos analizados en ${result.duration}ms`,
      ),
    );
    return;
  }

  const byFile = new Map<string, LintIssue[]>();
  for (const issue of result.issues) {
    const list = byFile.get(issue.file) ?? [];
    list.push(issue);
    byFile.set(issue.file, list);
  }

  for (const [file, fileIssues] of byFile) {
    console.log(pc.cyan(`\n${file}`));
    for (const issue of fileIssues) {
      const severityColor =
        issue.severity === "error"
          ? pc.red
          : issue.severity === "warning"
            ? pc.yellow
            : pc.blue;
      console.log(
        `  ${severityColor(issue.severity)} ${pc.gray(`${issue.line}:${issue.column}`)} ${issue.message}`,
      );
      if (issue.suggestion) {
        console.log(pc.gray(`    💡 ${issue.suggestion}`));
      }
    }
  }

  const errors = result.issues.filter((i) => i.severity === "error").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const infos = result.issues.filter((i) => i.severity === "info").length;

  console.log(pc.gray("\n─────────────────────────────────"));
  console.log(
    `${pc.red(`${errors} errores`)} ${pc.yellow(`${warnings} advertencias`)} ${pc.blue(`${infos} infos`)}`,
  );
  console.log(
    pc.gray(
      `${result.filesAnalyzed} archivos analizados • ${result.filesWithIssues} con problemas • ${result.duration}ms`,
    ),
  );
}

function printCompact(result: LinterResult): void {
  for (const issue of result.issues) {
    console.log(
      `${issue.file}:${issue.line}:${issue.column} ${issue.severity}: ${issue.message} [${issue.ruleId}]`,
    );
  }
}

const RULE_DESCRIPTIONS: Record<
  string,
  { description: string; severity: string }
> = {
  "generic-comment": {
    description: "Comentarios genéricos (TODO: implement, Fix this, etc.)",
    severity: "warning",
  },
  "generic-variable-name": {
    description: "Nombres de variable muy genéricos (data, result, temp, etc.)",
    severity: "info",
  },
  "no-explicit-any": {
    description: "Uso explícito del tipo any",
    severity: "warning",
  },
};

export async function listRules(): Promise<void> {
  console.log(pc.blue("📋 Reglas disponibles:\n"));

  for (const [id, meta] of Object.entries(RULE_DESCRIPTIONS)) {
    const severityColor =
      meta.severity === "error"
        ? pc.red
        : meta.severity === "warning"
          ? pc.yellow
          : pc.blue;
    console.log(`${severityColor(meta.severity.toUpperCase())} ${pc.bold(id)}`);
    console.log(`  ${meta.description}`);
    console.log();
  }
}
