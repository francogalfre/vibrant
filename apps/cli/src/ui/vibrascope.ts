import pc from "picocolors";

export type VibeLevel = "clean" | "mild" | "moderate" | "heavy" | "critical";

export interface DiagnosisResult {
  level: VibeLevel;
  score: number;
  summary: string;
  highlights: string[];
  recommendations: string[];
}

const PRIMARY = (s: string) => `\x1b[38;2;139;92;246m${s}\x1b[0m`;

const VIBE_THRESHOLDS = {
  clean: 90,
  mild: 70,
  moderate: 50,
  heavy: 30,
  critical: 0,
};

const VIBE_CONFIG: Record<VibeLevel, { label: string; color: (s: string) => string }> = {
  clean: { label: "CLEAN", color: pc.green },
  mild: { label: "MILD", color: pc.cyan },
  moderate: { label: "MODERATE", color: PRIMARY },
  heavy: { label: "HEAVY", color: pc.yellow },
  critical: { label: "CRITICAL", color: pc.red },
};

export function calculateVibeLevel(issues: number, files: number): VibeLevel {
  if (files === 0) return "clean";
  const ratio = issues / files;
  const score = Math.max(0, 100 - ratio * 15);
  
  if (score >= VIBE_THRESHOLDS.clean) return "clean";
  if (score >= VIBE_THRESHOLDS.mild) return "mild";
  if (score >= VIBE_THRESHOLDS.moderate) return "moderate";
  if (score >= VIBE_THRESHOLDS.heavy) return "heavy";
  return "critical";
}

export function calculateScore(issues: number, files: number): number {
  if (files === 0) return 100;
  const ratio = issues / files;
  return Math.max(0, Math.round(100 - ratio * 15));
}

export function printVibrascope(level: VibeLevel, score: number): void {
  const config = VIBE_CONFIG[level];
  
  const filled = Math.round((score / 100) * 16);
  const empty = 16 - filled;
  const bar = config.color("■".repeat(filled)) + pc.dim("□".repeat(empty));
  
  console.log();
  console.log(`  ${config.color(pc.bold(config.label))} ${pc.dim(`(${score}/100)`)}`);
  console.log(`  ${bar}`);
  console.log();
}

export function printSuccessBox(filesCount: number, duration: number): void {
  console.log();
  console.log(PRIMARY(pc.bold("  ✓ No issues found")));
  console.log(pc.dim(`  ${filesCount} file${filesCount > 1 ? "s" : ""} · ${duration}ms`));
  console.log();
}

export function printStatsBox(errors: number, warnings: number, files: number, duration: number): void {
  const parts: string[] = [];
  if (errors > 0) parts.push(pc.red(`${errors} error${errors > 1 ? "s" : ""}`));
  if (warnings > 0) parts.push(pc.yellow(`${warnings} warning${warnings > 1 ? "s" : ""}`));
  parts.push(pc.dim(`${files} file${files > 1 ? "s" : ""}`));
  parts.push(pc.dim(`${duration}ms`));
  
  console.log();
  console.log(`  ${parts.join(pc.dim(" · "))}`);
  console.log();
}

export function printTips(): void {
  console.log(pc.dim(`  Try ${PRIMARY("vibrant --fix")} to auto-fix`));
  console.log();
}

export { PRIMARY };
