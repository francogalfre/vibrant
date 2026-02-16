import { Command } from "commander";
import * as logger from "./ui/logger.js";
import type { LintCommandOptions } from "./commands/lint.js";

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
    "Output format: pretty, compact, plan",
    "pretty",
  )
  .option("--ignore <patterns>", "Comma-separated patterns to ignore", "")
  .option("--fix", "Automatically fix problems")
  .option("--ai", "Enable AI analysis", false)
  .option(
    "--provider <provider>",
    "AI provider: openai, claude, gemini, ollama",
  )
  .option(
    "-c, --config <path>",
    "Path to config file (default: vibrant.config.js)",
  )
  .action(
    async (
      path: string,
      options: {
        format: string;
        ignore: string;
        fix?: boolean;
        ai: boolean;
        provider?: string;
      },
    ) => {
      const { runLinter } = await import("./commands/lint");

      const linterOptions: LintCommandOptions = {
        path,
        format: options.format as "pretty" | "compact" | "plan",
        ignore: options.ignore
          ? options.ignore
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
        fix: options.fix,
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
      const { listRules } = await import("./commands/rules");
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
      const { createConfig } = await import("./commands/init");
      await createConfig();
    } catch (err) {
      logger.error("Failed to create config");
      if (err instanceof Error) {
        logger.error(err.message);
      }
      process.exit(1);
    }
  });

program
  .command("test <rule>")
  .description("Test a rule against test cases")
  .action(async (ruleName: string) => {
    try {
      const rules = await import("./rules/index");
      const rule = rules.default[ruleName];

      if (!rule) {
        logger.error(`Rule "${ruleName}" not found`);
        process.exit(1);
      }

      logger.info(`Testing rule: ${ruleName}`);
      logger.log(`  Description: ${rule.meta.docs.description}`);
      logger.log(`  Category: ${rule.meta.docs.category}`);
      logger.log(`  Recommended: ${rule.meta.docs.recommended}`);
      logger.log(`  Fixable: ${rule.meta.fixable || "no"}`);
      logger.log("");

      logger.success(`Rule "${ruleName}" is properly configured`);
    } catch (err) {
      logger.error("Failed to test rule");
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

program.parse();

export default program;
