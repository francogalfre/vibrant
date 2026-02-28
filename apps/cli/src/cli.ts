import { config } from "dotenv";
import { join } from "path";
import { readFileSync, existsSync } from "node:fs";
import { getAppDir } from "./utils/paths.js";

const __dirname = getAppDir();

const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

const cwd = process.cwd();
const envPath = join(cwd, ".env");
if (existsSync(envPath)) {
  config({ path: envPath, quiet: true });
} else {
  // Try .env.local as fallback
  const envLocalPath = join(cwd, ".env.local");
  if (existsSync(envLocalPath)) {
    config({ path: envLocalPath, quiet: true });
  }
}

import { Command } from "commander";
import pc from "picocolors";
import { PRIMARY } from "./ui/vibrascope.js";
import type { LintCommandOptions } from "./commands/lint.js";

const program = new Command();

program
  .name("vibrant")
  .description("Detect vibecoded (AI-generated) patterns in your codebase")
  .version(pkg.version, "-V, --version", "Display version number")
  .helpOption("-h, --help", "Display help for command");

program
  .argument("[path]", "Path to analyze (file or directory)", ".")
  .option("-f, --format <type>", "Output format: pretty, compact, plan, json")
  .option("--ignore <patterns>", "Comma-separated patterns to ignore", "")
  .option("--fix", "Automatically fix problems")
  .option("--ai", "Enable AI-powered analysis", false)
  .option(
    "-p, --provider <provider>",
    "AI provider: openai, claude, gemini, ollama, openrouter",
  )
  .action(
    async (
      path: string,
      options: {
        format?: string;
        ignore?: string;
        fix?: boolean;
        ai: boolean;
        provider?: string;
      },
    ) => {
      const { runLinter } = await import("./commands/lint");

      const linterOptions: LintCommandOptions = {
        path,
        format: options.format as "pretty" | "compact" | "plan" | undefined,
        ignore: options.ignore
          ? options.ignore
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : undefined,
        fix: options.fix,
        ai: options.ai,
        aiProvider: options.provider as
          | "openai"
          | "claude"
          | "gemini"
          | "ollama"
          | "openrouter"
          | undefined,
      };

      try {
        await runLinter(linterOptions);
      } catch (err) {
        handleError(err);
        process.exit(1);
      }
    },
  );

program
  .command("init")
  .description("Create vibrant.config.js in the current directory")
  .action(async () => {
    try {
      const { createConfig } = await import("./commands/init");
      await createConfig();
    } catch (err) {
      handleError(err);
      process.exit(1);
    }
  });

program
  .command("rules")
  .description("List all available detection rules")
  .action(async () => {
    try {
      const { listRules } = await import("./commands/rules");
      await listRules();
    } catch (err) {
      handleError(err);
      process.exit(1);
    }
  });

program.on("command:*", () => {
  console.log();
  console.log(pc.red(`  Unknown command: ${program.args.join(" ")}`));
  console.log();
  console.log(pc.dim(`  Run ${PRIMARY("vibrant --help")} for available commands`));
  console.log();
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  handleError(err);
  process.exit(1);
});

function handleError(err: unknown): void {
  console.log();
  
  if (err instanceof Error) {
    const msg = err.message;
    
    // AI quota/rate limit errors
    if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")) {
      console.log(pc.red("  API rate limit exceeded"));
      console.log();
      console.log(pc.dim("  Try a different provider:"));
      console.log(`    ${PRIMARY("vibrant . --ai --provider openrouter")}  ${pc.dim("(free models)")}`);
      console.log(`    ${PRIMARY("vibrant . --ai --provider gemini")}     ${pc.dim("(free tier)")}`);
      console.log(`    ${PRIMARY("vibrant . --ai --provider ollama")}     ${pc.dim("(local, free)")}`);
      console.log();
      return;
    }
    
    // Provider not configured
    if (msg.includes("No AI provider configured") || msg.includes("API key not found")) {
      console.log(pc.red("  No AI provider configured"));
      console.log();
      console.log(pc.dim("  Set an environment variable:"));
      console.log(`    ${PRIMARY("OPENROUTER_API_KEY")}       ${pc.dim("Free models available")}`);
      console.log(`    ${PRIMARY("OPENAI_API_KEY")}           ${pc.dim("GPT-4o-mini")}`);
      console.log(`    ${PRIMARY("GOOGLE_GENERATIVE_AI_API_KEY")}  ${pc.dim("Gemini (free tier)")}`);
      console.log(`    ${PRIMARY("ANTHROPIC_API_KEY")}        ${pc.dim("Claude 3 Haiku")}`);
      console.log();
      console.log(pc.dim(`  Or use Ollama locally: ${PRIMARY("vibrant . --ai --provider ollama")}`));
      console.log();
      return;
    }
    
    // Generic error
    console.log(pc.red(`  ${msg}`));
    console.log();
  }
}

program.parse();

export default program;
