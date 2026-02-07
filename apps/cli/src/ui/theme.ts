import chalk from "chalk";

export const theme = {
  brand: {
    primary: chalk.hex("#FF6B6B"),
    secondary: chalk.hex("#4ECDC4"),
    accent: chalk.hex("#FFE66D"),
  },
  
  severity: {
    error: chalk.red.bold,
    warning: chalk.yellow.bold,
    info: chalk.blue.bold,
    success: chalk.green.bold,
  },
  
  text: {
    primary: chalk.white,
    secondary: chalk.gray,
    muted: chalk.dim,
    bold: chalk.bold,
    underline: chalk.underline,
  },
  
  file: {
    path: chalk.cyan.underline,
    line: chalk.dim,
    column: chalk.dim,
  },
  
  icons: {
    error: "✖",
    warning: "⚠",
    info: "ℹ",
    success: "✔",
    arrow: "→",
    bullet: "•",
    separator: "─",
    corner: "└",
    branch: "├",
  },
  
  spinner: {
    color: "cyan" as const,
  },
};

export const c = {
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blue: chalk.blue,
  cyan: chalk.cyan,
  magenta: chalk.magenta,
  white: chalk.white,
  gray: chalk.gray,
  dim: chalk.dim,
  bold: chalk.bold,
  underline: chalk.underline,
  hex: chalk.hex,
};

export function success(message: string): string {
  return `${theme.severity.success(theme.icons.success)} ${message}`;
}

export function error(message: string): string {
  return `${theme.severity.error(theme.icons.error)} ${message}`;
}

export function warning(message: string): string {
  return `${theme.severity.warning(theme.icons.warning)} ${message}`;
}

export function info(message: string): string {
  return `${theme.severity.info(theme.icons.info)} ${message}`;
}

export function filePath(file: string): string {
  return theme.file.path(file);
}

export function dimLineNumber(line: number, column: number): string {
  return theme.file.line(`${line}:${column}`);
}
