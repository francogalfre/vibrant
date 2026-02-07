import { c, theme } from "./theme.js";

export function log(message: string, ...args: unknown[]): void {
  console.log(message, ...args);
}

export function info(message: string, ...args: unknown[]): void {
  console.log(`${theme.severity.info(theme.icons.info)} ${message}`, ...args);
}

export function success(message: string, ...args: unknown[]): void {
  console.log(
    `${theme.severity.success(theme.icons.success)} ${message}`,
    ...args,
  );
}

export function warn(message: string, ...args: unknown[]): void {
  console.error(
    `${theme.severity.warning(theme.icons.warning)} ${message}`,
    ...args,
  );
}

export function error(message: string, ...args: unknown[]): void {
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
