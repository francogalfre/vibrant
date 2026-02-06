import { Command } from "commander";
import type { LinterOptions } from "./types.js";

const program = new Command();

program
  .name("vibrant")
  .description("CLI para detectar código vibecodeado (generado por IA)")
  .version("0.1.0");

program
  .argument("[path]", "Ruta a analizar (archivo o directorio)", ".")
  .option("-f, --format <type>", "Formato de salida: pretty, json, compact", "pretty")
  .option("--ignore <patterns>", "Patrones a ignorar (separados por coma)", "")
  .action(async (path: string, options: { format: string; ignore: string }) => {
    const { runLinter } = await import("./runner.js");

    const linterOptions: LinterOptions = {
      path,
      format: options.format as "pretty" | "json" | "compact",
      ignore: options.ignore ? options.ignore.split(",").map((p) => p.trim()).filter(Boolean) : [],
    };

    try {
      await runLinter(linterOptions);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

program
  .command("rules")
  .description("Listar todas las reglas disponibles")
  .action(async () => {
    const { listRules } = await import("./runner.js");
    await listRules();
  });

program
  .command("init")
  .description("Crear archivo de configuración vibrant.config.js")
  .action(async () => {
    const { createConfig } = await import("./utils/config.js");
    await createConfig();
  });

export default program;
