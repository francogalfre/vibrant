import { Command } from "commander";
import * as logger from "./ui/logger.js";
import type { LinterOptions } from "./types.js";

const program = new Command();

program
  .name("vibrant")
  .description("CLI to detect vibecoded (AI-generated) code")
  .version("0.1.0", "-V, --version", "Display version number")
  .helpOption("-h, --help", "Display help for command");

program
  .argument("[path]", "Path to analyze (file or directory)", ".")
  .option(
    "-f, --format <type>",
    "Output format: pretty, json, compact",
    "pretty",
  )
  .option("--ignore <patterns>", "Comma-separated patterns to ignore", "")
  .option("--no-color", "Disable colored output", false)
  .option("-v, --verbose", "Show verbose output", false)
  .action(
    async (
      path: string,
      options: {
        format: string;
        ignore: string;
        color: boolean;
        verbose: boolean;
      },
    ) => {
      if (options.verbose) {
        logger.setVerbose(true);
        logger.debug("Verbose mode enabled");
      }

      if (!options.color) {
        process.env.FORCE_COLOR = "0";
      }

      const { runLinter } = await import("./commands/lint.js");

      const linterOptions: LinterOptions = {
        path,
        format: options.format as "pretty" | "json" | "compact",
        ignore: options.ignore
          ? options.ignore
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
      };

      logger.debug("Running linter with options:", linterOptions);

      try {
        await runLinter(linterOptions);
      } catch (err) {
        logger.error("Failed to run linter");
        if (err instanceof Error) {
          logger.error(err.message);
          logger.debug("Stack trace:", err.stack);
        }
        process.exit(1);
      }
    },
  );

program
  .command("rules")
  .description("List all available rules")
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

program.on("--help", () => {
  console.log(program.helpInformation());
});

program.on("command:*", () => {
  logger.error(`Unknown command: ${program.args.join(" ")}`);
  logger.info("Run 'vibrant --help' for usage information");
  process.exit(1);
});

export default program;
