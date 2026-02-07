import { Command } from "commander";
import * as logger from "./ui/logger.js";
import type { LinterOptions } from "./types.js";

const program = new Command();

program
  .name("vibrant")
  .description("🎯 Detect vibecoded (AI-generated) patterns in your codebase")
  .version("0.1.0", "-V, --version", "Display version number")
  .helpOption("-h, --help", "Display help for command");

program
  .argument("[path]", "Path to analyze (file or directory)", ".")
  .option(
    "-f, --format <type>",
    "Output format: pretty, json, compact, plan",
    "pretty",
  )
  .option("--ignore <patterns>", "Comma-separated patterns to ignore", "")
  .option("--ai", "Enable AI analysis", false)
  .option(
    "--provider <provider>",
    "AI provider: openai, claude, gemini, ollama (auto-detected from .env if not specified)",
  )
  .action(
    async (
      path: string,
      options: {
        format: string;
        ignore: string;
        ai: boolean;
        provider?: string;
      },
    ) => {
      const { runLinter } = await import("./commands/lint.js");

      const linterOptions: LinterOptions = {
        path,
        format: options.format as "pretty" | "json" | "compact" | "plan",
        ignore: options.ignore
          ? options.ignore
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
        ai: options.ai,
        aiProvider: options.provider as
          | "openai"
          | "claude"
          | "gemini"
          | "ollama"
          | undefined,
      };

      try {
        await runLinter(linterOptions);
      } catch (err) {
        logger.error("Failed to run linter");
        if (err instanceof Error) {
          logger.error(err.message);
        }
        process.exit(1);
      }
    },
  );

program
  .command("rules")
  .description("List all available rules with descriptions")
  .action(async () => {
    try {
      const { listRules } = await import("./commands/rules.js");
      await listRules();
    } catch (err) {
      logger.error("Failed to list rules");
      if (err instanceof Error) {
        logger.error(err.message);
      }
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Create vibrant.config.js in the current directory")
  .action(async () => {
    try {
      const { createConfig } = await import("./commands/init.js");
      await createConfig();
    } catch (err) {
      logger.error("Failed to create config");
      if (err instanceof Error) {
        logger.error(err.message);
      }
      process.exit(1);
    }
  });

program.on("command:*", () => {
  logger.error(`❌ Unknown command: ${program.args.join(" ")}`);
  logger.info("💡 Run 'vibrant --help' for available commands");
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled error:");
  if (err instanceof Error) {
    logger.error(err.message);
  }
  process.exit(1);
});

export default program;
