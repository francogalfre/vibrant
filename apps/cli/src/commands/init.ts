import pc from "picocolors";
import { PRIMARY } from "../ui/vibrascope.js";

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
  "__   _____ ___ ___    _   _  _ _____ ",
  "\ \ / /_ _| _ ) _ \  /_\ | \| |_   _|",
  " \ V / | || _ \   / / _ \| .` | | |  ",
  "  \_/ |___|___/_|_\/_/ \_\_|\_| |_|  ",
];

async function showBanner(): Promise<void> {
  console.log();

  for (const line of VIBRANT_BANNER) {
    console.log(PRIMARY(pc.bold(line)));
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log();
  console.log(pc.dim("       detect vibecoded patterns in your code  ✨"));
  console.log();
}

export async function createConfig(): Promise<void> {
  const configPath = "./vibrant.config.js";
  const fileExists = await Bun.file(configPath)
    .exists()
    .catch(() => false);

  if (fileExists) {
    console.log();
    console.log(pc.yellow("  ⚠ vibrant.config.js already exists"));
    console.log();
    return;
  }

  try {
    await Bun.write(configPath, defaultConfig);
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
