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

export async function createConfig(): Promise<void> {
  const configPath = "./vibrant.config.js";
  const fileExists = await Bun.file(configPath)
    .exists()
    .catch(() => false);

  console.log();

  if (fileExists) {
    console.log(pc.yellow("  ⚠ vibrant.config.js already exists"));
    console.log();
    return;
  }

  try {
    await Bun.write(configPath, defaultConfig);

    console.log(PRIMARY(pc.bold("  Vibrant")));
    console.log();
    console.log(pc.green("  ✓ Created vibrant.config.js"));
    console.log();
    console.log(pc.dim("  Configuration options:"));
    console.log(pc.dim("    • ignore   - Files and directories to exclude"));
    console.log(pc.dim("    • format   - Output style (pretty, compact, plan)"));
    console.log(pc.dim("    • provider - AI provider for enhanced analysis"));
    console.log();
    console.log(`  Run ${PRIMARY("vibrant .")} to analyze your code!`);
    console.log();
  } catch (err) {
    console.log(pc.red("  ✖ Failed to create vibrant.config.js"));
    throw err;
  }
}
