import { c, theme } from "../ui/theme.js";
import * as logger from "../ui/logger.js";

const defaultConfig = `module.exports = {
  // Directories to ignore during analysis
  ignore: ['node_modules', '.git', 'dist', '.next'],
  
  // Output format: 'pretty', 'json', or 'compact'
  format: 'pretty',
  
  // Rules configuration
  rules: {
    'generic-comment': 'warn',
    'generic-variable-name': 'info',
    'no-explicit-any': 'warn',
  }
};
`;

export async function createConfig(): Promise<void> {
  const configPath = "./vibrant.config.js";

  try {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      logger.warn(`${configPath} already exists`);
      return;
    }
  } catch {
    // continue
  }

  try {
    await Bun.write(configPath, defaultConfig);
    logger.newLine();
    logger.success(`Created ${c.cyan(configPath)}`);
    logger.newLine();
    logger.info("You can now customize your configuration:");
    logger.log(c.dim("  • ignore: Array of directory patterns to exclude"));
    logger.log(c.dim("  • format: Output format (pretty, json, compact)"));
    logger.log(c.dim("  • rules: Enable/disable specific rules"));
    logger.newLine();
  } catch (err) {
    logger.error(`Failed to create ${configPath}`);
    throw err;
  }
}
