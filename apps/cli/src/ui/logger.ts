import { c, theme } from "./theme.js";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

let currentLevel: LogLevel = "info";
let isVerbose = false;

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function setVerbose(verbose: boolean): void {
  isVerbose = verbose;
  if (verbose && currentLevel === "info") {
    currentLevel = "debug";
  }
}

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[currentLevel];
}

export function debug(message: string, ...args: unknown[]): void {
  if (!shouldLog("debug")) return;
  console.error(c.dim(`[debug] ${message}`), ...args);
}

export function log(message: string, ...args: unknown[]): void {
  if (!shouldLog("info")) return;
  console.log(message, ...args);
}

export function info(message: string, ...args: unknown[]): void {
  if (!shouldLog("info")) return;
  console.log(`${theme.severity.info(theme.icons.info)} ${message}`, ...args);
}

export function success(message: string, ...args: unknown[]): void {
  if (!shouldLog("info")) return;
  console.log(
    `${theme.severity.success(theme.icons.success)} ${message}`,
    ...args,
  );
}

export function warn(message: string, ...args: unknown[]): void {
  if (!shouldLog("warn")) return;
  console.error(
    `${theme.severity.warning(theme.icons.warning)} ${message}`,
    ...args,
  );
}

export function error(message: string, ...args: unknown[]): void {
  if (!shouldLog("error")) return;
  console.error(
    `${theme.severity.error(theme.icons.error)} ${message}`,
    ...args,
  );
}

export function newLine(): void {
  console.log();
}

export function separator(): void {
  console.log(c.dim(theme.icons.separator.repeat(50)));
}

export function header(title: string): void {
  newLine();
  separator();
  console.log(c.bold(title));
  separator();
}

export function dim(message: string): string {
  return c.dim(message);
}

export function bold(message: string): string {
  return c.bold(message);
}

export function highlight(
  message: string,
  color:
    | "red"
    | "green"
    | "yellow"
    | "blue"
    | "cyan"
    | "magenta"
    | "white"
    | "gray" = "cyan",
): string {
  return c[color](message);
}
