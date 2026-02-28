import pc from "picocolors";
import { access, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "path";
import { PRIMARY } from "../ui/vibrascope.js";
import { getAppDir } from "../utils/paths.js";

const __dirname = getAppDir();
const pkg = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8"),
);

const defaultConfig = `module.exports = {
  // Directories to ignore during analysis
  ignore: ['node_modules', '.git', 'dist', '.next', 'build', 'coverage'],
  
  // Output format: 'pretty', 'compact' or 'plan'
  format: 'pretty',
  
  // AI Provider configuration (optional)
  // provider: 'openrouter', // 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter'
};
`;

const VIBRANT_BANNER = [
  "",
  "  ██╗   ██╗██╗██████╗ ██████╗  █████╗ ███╗   ██╗████████╗",
  "  ██║   ██║██║██╔══██╗██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝",
  "  ██║   ██║██║██████╔╝██████╔╝███████║██╔██╗ ██║   ██║   ",
  "  ╚██╗ ██╔╝██║██╔══██╗██╔══██╗██╔══██║██║╚██╗██║   ██║   ",
  "   ╚████╔╝ ██║██████╔╝██║  ██║██║  ██║██║ ╚████║   ██║   ",
  "    ╚═══╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ",
  "",
];

async function showBanner(): Promise<void> {
  console.log();

  for (const line of VIBRANT_BANNER) {
    console.log(PRIMARY(pc.bold(line)));
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log(pc.dim("       Catch vibecode before it hits prod  "));
  console.log(
    pc.dim(`       v${pkg.version}                                    `),
  );
  console.log();
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function createConfig(): Promise<void> {
  const configPath = "./vibrant.config.js";
  const exists = await fileExists(configPath);

  if (exists) {
    console.log();
    console.log(pc.yellow("  ⚠ vibrant.config.js already exists"));
    console.log();
    return;
  }

  try {
    await writeFile(configPath, defaultConfig, "utf-8");
    await showBanner();

    console.log(pc.green("  ✓ Created vibrant.config.js"));
    console.log();
    console.log(pc.dim("  Configuration options:"));
    console.log(pc.dim("    • ignore   - Files and directories to exclude"));
    console.log(
      pc.dim("    • format   - Output style (pretty, compact, plan)"),
    );
    console.log(pc.dim("    • provider - AI provider for enhanced analysis"));
    console.log();
    console.log(`  Run ${PRIMARY("vibrant .")} to analyze your code!`);
    console.log();
  } catch (err) {
    console.log();
    console.log(pc.red("  ✖ Failed to create vibrant.config.js"));
    throw err;
  }
}
