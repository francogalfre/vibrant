import chalk from "chalk";

export const theme = {
  brand: {
    primary: chalk.hex("#FF6B6B").bold,
    secondary: chalk.hex("#4ECDC4"),
    accent: chalk.hex("#FFE66D"),
    title: chalk.hex("#A78BFA").bold.underline,
  },

  severity: {
    error: chalk.red.bold,
    warning: chalk.hex("#F59E0B").bold,
    info: chalk.blue.bold,
    success: chalk.green.bold,
    hint: chalk.cyan,
  },

  text: {
    primary: chalk.white,
    secondary: chalk.gray,
    muted: chalk.dim,
    bold: chalk.bold,
    underline: chalk.underline,
    code: chalk.hex("#10B981").bgHex("#1F2937"),
  },

  file: {
    path: chalk.cyan.underline,
    pathDim: chalk.cyan.underline.dim,
    line: chalk.dim,
    column: chalk.dim,
  },

  icons: {
    error: "✖",
    warning: "⚠",
    info: "ℹ",
    success: "✔",
    hint: "💡",
    arrow: "→",
    bullet: "•",
    separator: "─",
    corner: "└",
    branch: "├",
    sparkles: "✨",
    rocket: "🚀",
    brain: "🧠",
    bot: "🤖",
    folder: "📁",
    file: "📄",
    clock: "⏱",
    check: "✓",
    cross: "✗",
    magnifying: "🔍",
    microscope: "🔬",
    shield: "🛡️",
    code: "💻",
    bug: "🐛",
    wrench: "🔧",
    scissors: "✂️",
    globe: "🌐",
    warningSign: "⚠️",
    lightbulb: "💡",
    memo: "📝",
  },

  spinner: {
    color: "cyan" as const,
  },

  progress: {
    bar: "█",
    empty: "░",
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
  inverse: chalk.inverse,
  strikethrough: chalk.strikethrough,
  bgRed: chalk.bgRed,
  bgYellow: chalk.bgYellow,
  bgBlue: chalk.bgBlue,
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

export function hint(message: string): string {
  return `${theme.icons.hint} ${message}`;
}

export function filePath(file: string): string {
  return theme.file.path(file);
}

export function dimLineNumber(line: number, column: number): string {
  return theme.file.line(`${line}:${column}`);
}

export function formatSeverity(severity: string): string {
  switch (severity) {
    case "error":
      return theme.severity.error(severity.toUpperCase().padEnd(7));
    case "warning":
      return theme.severity.warning(severity.toUpperCase().padEnd(7));
    case "info":
      return theme.severity.info(severity.toUpperCase().padEnd(7));
    default:
      return severity.toUpperCase().padEnd(7);
  }
}

export function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function formatCount(
  count: number,
  singular: string,
  plural?: string,
): string {
  const p = plural || `${singular}s`;
  return count === 1 ? `${count} ${singular}` : `${count} ${p}`;
}
