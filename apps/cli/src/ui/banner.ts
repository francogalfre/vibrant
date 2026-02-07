import { c, theme } from "./theme.js";

export const BANNER = `
${theme.brand.primary("██╗   ██╗██╗██████╗ ██████╗  █████╗ ███╗   ██╗████████╗")}
${theme.brand.primary("██║   ██║██║██╔══██╗██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝")}
${theme.brand.secondary("██║   ██║██║██████╔╝██████╔╝███████║██╔██╗ ██║   ██║   ")}
${theme.brand.secondary("╚██╗ ██╔╝██║██╔══██╗██╔══██╗██╔══██║██║╚██╗██║   ██║   ")}
${theme.brand.accent(" ╚████╔╝ ██║██║  ██║██████╔╝██║  ██║██║ ╚████║   ██║   ")}
${theme.brand.accent("  ╚═══╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ")}
`;

export const TAGLINE = c.dim("  Detect AI-generated code patterns");

export const VERSION = "0.1.0";

export function printBanner(): void {
  console.log(BANNER);
  console.log(TAGLINE);
  console.log();
}

export function printHelp(): void {
  console.log(`
${c.bold("Usage:")}
  ${c.cyan("vibrant")} [path] [options]
  ${c.cyan("vibrant")} <command>

${c.bold("Commands:")}
  ${c.cyan("rules")}              List all available rules
  ${c.cyan("init")}               Create vibrant.config.js in current directory
  ${c.cyan("help")}               Show this help message

${c.bold("Arguments:")}
  ${c.cyan("path")}               Path to analyze (file or directory) [default: "."]

${c.bold("Options:")}
  ${c.cyan("-f, --format")}       Output format: ${c.yellow("pretty")}, ${c.yellow("json")}, ${c.yellow("compact")} [default: "pretty"]
  ${c.cyan("--ignore")}           Comma-separated patterns to ignore
  ${c.cyan("--no-color")}         Disable colored output
  ${c.cyan("-v, --verbose")}      Show verbose output
  ${c.cyan("-h, --help")}         Show help
  ${c.cyan("--version")}          Show version

${c.bold("Examples:")}
  ${c.dim("$ vibrant .")}
  ${c.dim("$ vibrant src --format json")}
  ${c.dim("$ vibrant . --ignore dist,node_modules")}
  ${c.dim("$ vibrant rules")}
`);
}
