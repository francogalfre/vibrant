import { c, theme } from "./theme.js";

export const BANNER = `
${theme.brand.primary("██████╗ ██╗   ██╗ ██████╗ ███████╗")}
${theme.brand.primary("██╔══██╗╚██╗ ██╔╝██╔═══██╗██╔════╝")}
${theme.brand.secondary("██████╔╝ ╚████╔╝ ██║   ██║█████╗  ")}
${theme.brand.secondary("██╔══██╗  ╚██╔╝  ██║   ██║██╔══╝  ")}
${theme.brand.accent("██║  ██║   ██║   ╚██████╔╝███████╗")}
${theme.brand.accent("╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚══════╝")}
`;

export const TAGLINE = `${theme.icons.sparkles} ${c.dim("Detect AI-generated code patterns")}`;

export const VERSION = "0.2.0";

export function printBanner(): void {
  
  
  console.log();
}

export function printHelp(): void {
  console.log(`
${c.bold(`${theme.icons.rocket} Usage:`)}
  ${c.cyan("vibrant")} [path] [options]
  ${c.cyan("vibrant")} <command>

${c.bold(`${theme.icons.folder} Commands:`)}
  ${c.cyan("rules")}              List all available rules
  ${c.cyan("init")}               Create vibrant.config.js in current directory
  ${c.cyan("cache")}              Manage AI analysis cache

${c.bold(`${theme.icons.file} Arguments:`)}
  ${c.cyan("path")}               Path to analyze (file or directory) [default: "."]

${c.bold(`${theme.icons.bot} AI Options:`)}
  ${c.cyan("--ai")}                Enable AI-powered analysis
  ${c.cyan("--provider")}          AI provider: ${c.yellow("openai")}, ${c.yellow("claude")}, ${c.yellow("gemini")}, ${c.cyan("ollama")}

${c.bold(`${theme.icons.brain} Options:`)}
  ${c.cyan("-f, --format")}       Output: ${c.yellow("pretty")}, ${c.yellow("json")}, ${c.yellow("compact")} [default: "pretty"]
  ${c.cyan("--ignore")}           Comma-separated patterns to ignore
  ${c.cyan("--changed-only")}      Only analyze changed files (Git)
  ${c.cyan("-h, --help")}         Show this help
  ${c.cyan("--version")}          Show version

${c.bold(`${theme.icons.check} Examples:`)}
  ${c.dim("$ vibrant .")}
  ${c.dim("$ vibrant src --format json")}
  ${c.dim("$ vibrant . --ai --provider openai")}
  ${c.dim("$ vibrant . --ignore dist,node_modules")}
  ${c.dim("$ vibrant rules")}
`);
}
