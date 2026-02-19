import pc from "picocolors";

export type VibeLevel = "clean" | "mild" | "moderate" | "heavy" | "critical";

const VIBE_CONFIG: Record<VibeLevel, { label: string; color: (s: string) => string }> = {
  clean: { label: "clean", color: pc.green },
  mild: { label: "mild", color: pc.cyan },
  moderate: { label: "moderate", color: pc.yellow },
  heavy: { label: "heavy", color: pc.magenta },
  critical: { label: "critical", color: pc.red },
};

export const PRIMARY = (s: string) => `\x1b[38;2;139;92;246m${s}\x1b[0m`;

export function calculateScore(issues: number, files: number): number {
  if (files === 0) return 100;
  return Math.max(0, Math.round(100 - (issues / files) * 15));
}

export function calculateVibeLevel(issues: number, files: number): VibeLevel {
  const score = calculateScore(issues, files);
  if (score >= 90) return "clean";
  if (score >= 70) return "mild";
  if (score >= 50) return "moderate";
  if (score >= 30) return "heavy";
  return "critical";
}

export function printHeader(): void {
  console.log();
  console.log(PRIMARY("  🔮 Vibrant AI Analysis"));
  console.log(pc.dim("  ─────────────────────"));
}

export function printVibrascope(level: VibeLevel, score: number): void {
  const config = VIBE_CONFIG[level];
  const bar = config.color("━".repeat(Math.round(score / 5))) + pc.dim("─".repeat(20 - Math.round(score / 5)));
  console.log();
  console.log(`  ${config.color(config.label)} ${pc.dim(`${score}`)}`);
  console.log(`  ${bar}`);
}

export function printSuccess(files: number, ms: number): void {
  console.log();
  console.log(`  ✨ ${pc.green("All clean!")}`);
  console.log(pc.dim(`  ${files} files · ${ms}ms`));
  console.log();
}

export function printStats(errors: number, warnings: number, files: number, ms: number): void {
  const parts: string[] = [];
  if (errors > 0) parts.push(`${pc.red("✕")} ${errors} errors`);
  if (warnings > 0) parts.push(`${pc.yellow("⚠")} ${warnings} warnings`);
  parts.push(pc.dim(`${files} files`));
  parts.push(pc.dim(`${ms}ms`));
  console.log();
  console.log(`  ${parts.join(pc.dim(" · "))}`);
  console.log();
}
