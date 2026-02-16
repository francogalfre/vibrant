import { watch } from "fs";
import { resolve, relative } from "path";
import * as logger from "../ui/logger.js";
import { c, theme } from "../ui/theme.js";
import { runLinter } from "./lint.js";
import type { LinterOptions } from "../types.js";

interface WatchOptions extends LinterOptions {
  debounce?: number;
}

export async function watchFiles(options: WatchOptions): Promise<void> {
  const cwd = process.cwd();
  const paths = Array.isArray(options.path) ? options.path : [options.path || "."];
  const debounceMs = options.debounce || 300;
  
  logger.info(c.cyan(`👀 Starting watch mode...\n`));
  logger.info(`Watching: ${paths.join(", ")}`);
  logger.info(`Debouncing: ${debounceMs}ms\n`);
  logger.info(c.dim("Press Ctrl+C to stop\n"));
  
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;
  
  async function runLint() {
    if (isRunning) return;
    isRunning = true;
    
    console.clear();
    logger.info(c.cyan(`👀 Watching for changes...\n`));
    
    try {
      await runLinter({
        ...options,
        format: options.format || "compact",
      });
    } catch (error) {
      // Linter already shows errors
    }
    
    isRunning = false;
    logger.info(c.dim("\n👀 Waiting for changes..."));
  }
  
  function debouncedLint() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(runLint, debounceMs);
  }
  
  // Initial run
  await runLint();
  
  // Watch all paths
  const watchers: ReturnType<typeof watch>[] = [];
  
  for (const path of paths) {
    const watcher = watch(
      resolve(cwd, path),
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;
        
        // Only watch TS/JS files
        if (!filename.match(/\.(ts|tsx|js|jsx)$/)) return;
        
        // Ignore node_modules and .git
        if (filename.includes("node_modules") || filename.includes(".git")) return;
        
        logger.info(c.dim(`\n[${eventType}] ${relative(cwd, filename)}`));
        debouncedLint();
      }
    );
    
    watchers.push(watcher);
  }
  
  // Handle graceful shutdown
  process.on("SIGINT", () => {
    logger.info(c.yellow("\n\n👋 Stopping watch mode..."));
    watchers.forEach(w => w.close());
    process.exit(0);
  });
  
  // Keep process alive
  await new Promise(() => {});
}
