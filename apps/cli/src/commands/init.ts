import { c, theme } from "../ui/theme.js";
import * as logger from "../ui/logger.js";

const defaultConfig = `module.exports = {
  // Directories to ignore during analysis
  ignore: ['node_modules', '.git', 'dist', '.next', 'build', 'coverage'],
  
  // Output format: 'pretty', 'compact' or 'plan'
  format: 'pretty',
  
  // AI Provider configuration (optional)
  // provider: 'openai', // 'openai' | 'claude' | 'gemini' | 'ollama'
};
`;

const vibrantBanner = [
  " _  _  __  ____  ____   __   __ _  ____ ",
  "/ )( \\(  )(  _ \\(  _ \\ / _\\ (  ( \\(_  _)",
  "\\ \/ / )(  ) _ ( )   //    \\/    /  )(",
  " \\__/ (__)(____/(__\\_)\\_/\\_/\\_)__)(__)",
];

async function showBanner(): Promise<void> {
  const violet = c.hex("#8b5cf6");
  const lightViolet = c.hex("#a78bfa");
  const paleViolet = c.hex("#ddd6fe");

  console.log();

  // Show VIBRANT banner with animation
  for (let i = 0; i < vibrantBanner.length; i++) {
    const line = vibrantBanner[i];
    let coloredLine = line;

    if (i === 0) {
      coloredLine = violet.bold(line);
    } else if (i === 1) {
      coloredLine = violet(line);
    } else if (i === 2) {
      coloredLine = lightViolet(line);
    } else {
      coloredLine = paleViolet(line);
    }

    console.log("  " + coloredLine);
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  console.log();
  console.log(
    paleViolet(
      "       detect vibecoded patterns in your code  " + theme.icons.sparkles,
    ),
  );
  console.log();
}

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

    // Show animated banner
    await showBanner();

    logger.success(`${theme.icons.check} Created ${c.cyan(configPath)}`);
    logger.newLine();
    logger.info(`${theme.icons.lightbulb} Configuration options:`);
    logger.log(
      c.dim(`  • ignore:   Files and directories to exclude from analysis`),
    );
    logger.log(c.dim(`  • format:   Output style (pretty, compact, plan)`));
    logger.log(
      c.dim(`  • provider: AI provider for enhanced analysis (optional)`),
    );
    logger.newLine();
    logger.info(
      `${theme.icons.rocket} Run ${c.white("vibrant .")} to analyze your code!`,
    );
    console.log();
  } catch (err) {
    logger.error(`Failed to create ${configPath}`);
    throw err;
  }
}
