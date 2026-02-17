import { promises as fs } from "node:fs";
import { resolve, dirname, join, extname } from "node:path";
import type { Config, RuleConfig, Plugin } from "../core/types.js";

const CONFIG_FILES = [
  "vibrant.config.js",
  "vibrant.config.mjs",
  "vibrant.config.cjs",
  "vibrant.config.ts",
  ".vibrantrc",
  ".vibrantrc.js",
  ".vibrantrc.mjs",
  ".vibrantrc.cjs",
  ".vibrantrc.ts",
  ".vibrantrc.json",
];

interface LoadedConfig {
  config: Config;
  filepath: string;
}

export async function loadConfig(
  cwd: string = process.cwd(),
  configPath?: string
): Promise<Config> {
  if (configPath) {
    const resolvedPath = resolve(cwd, configPath);
    return await loadConfigFile(resolvedPath);
  }

  const configFile = await findConfigFile(cwd);
  if (configFile) {
    return await loadConfigFile(configFile);
  }

  return getDefaultConfig();
}

async function findConfigFile(cwd: string): Promise<string | null> {
  let currentDir = cwd;

  while (true) {
    for (const filename of CONFIG_FILES) {
      const filepath = join(currentDir, filename);
      try {
        await fs.access(filepath);
        return filepath;
      } catch {
        continue;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

async function loadConfigFile(filepath: string): Promise<Config> {
  const ext = extname(filepath);
  
  if (ext === ".json" || filepath.endsWith("rc")) {
    const content = await fs.readFile(filepath, "utf-8");
    return JSON.parse(content);
  }

  if (ext === ".ts") {
    const { execSync } = await import("node:child_process");
    const tempFile = filepath.replace(/\.ts$/, ".js");
    
    try {
      execSync(`bun build "${filepath}" --outfile="${tempFile}" --target=bun`, {
        stdio: "ignore",
      });
      
      const config = await import(tempFile).then((m) => m.default || m);
      await fs.unlink(tempFile).catch(() => {});
      
      return mergeWithDefaults(config);
    } catch {
      throw new Error(`Failed to load TypeScript config: ${filepath}`);
    }
  }

  const config = await import(filepath).then((m) => m.default || m);
  return mergeWithDefaults(config);
}

function mergeWithDefaults(userConfig: Partial<Config>): Config {
  const ignores = userConfig.ignores || userConfig.ignore || [];
  
  const defaults = getDefaultConfig();
  
  return {
    ...defaults,
    ...userConfig,
    ignores: ignores.length > 0 ? ignores : defaults.ignores,
    rules: {
      ...defaults.rules,
      ...userConfig.rules,
    },
    languageOptions: {
      ...defaults.languageOptions,
      ...userConfig.languageOptions,
    },
  };
}

function getDefaultConfig(): Config {
  // ONLY REAL BUGS - No opinionated rules
  return {
    ignores: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/test/**",
      "**/tests/**",
      "**/__tests__/**",
    ],
    rules: {
      // Type safety - CRITICAL
      "no-explicit-any": "error",
      
      // Incomplete code - CRITICAL  
      "unimplemented-error": "error",
      "empty-function-body": "error",
      
      // Error handling - CRITICAL
      "empty-catch-block": "error",
      
      // Security - CRITICAL
      "hardcoded-credentials": "error",
      
      // Debug code - WARNING
      "console-log-debugging": "warn",
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  };
}

export async function resolveExtends(
  config: Config,
  basePath: string
): Promise<Config> {
  if (!config.extends) return config;

  const extendsList = Array.isArray(config.extends)
    ? config.extends
    : [config.extends];

  let resolvedConfig: Config = { rules: {} };

  for (const extendPath of extendsList) {
    if (extendPath.startsWith("vibrant-config-")) {
      const packageName = extendPath;
      const pkg = await import(packageName).catch(() => null);
      if (pkg && pkg.default) {
        resolvedConfig = mergeConfigs(resolvedConfig, pkg.default);
      }
    } else {
      const resolvedPath = resolve(basePath, extendPath);
      const extended = await loadConfigFile(resolvedPath);
      resolvedConfig = mergeConfigs(resolvedConfig, extended);
    }
  }

  return mergeConfigs(resolvedConfig, config);
}

function mergeConfigs(base: Config, override: Config): Config {
  return {
    ...base,
    ...override,
    rules: {
      ...base.rules,
      ...override.rules,
    },
    plugins: {
      ...base.plugins,
      ...override.plugins,
    },
    settings: {
      ...base.settings,
      ...override.settings,
    },
  };
}

export function normalizeRuleConfig(config: RuleConfig): [string, ...unknown[]] {
  if (typeof config === "string") {
    return [config];
  }
  if (Array.isArray(config)) {
    return config as [string, ...unknown[]];
  }
  return ["off"];
}

const defaultConfigContent = `/** @type {import('vibrant').Config} */
module.exports = {
  // Directories to ignore during analysis
  ignores: ['node_modules', '.git', 'dist', '.next', 'build'],
  
  // Output format: 'pretty', 'stylish', 'compact', 'json'
  format: 'pretty',
  
  // Rule configuration
  rules: {
    'generic-comment': 'warn',
    'generic-variable-name': 'info',
    'no-explicit-any': 'warn',
    'console-log-debugging': 'warn',
    'empty-function-body': 'warn',
    'magic-numbers': 'warn',
    'unimplemented-error': 'warn',
    'hardcoded-credentials': 'error',
    'empty-catch-block': 'error',
  },
  
  // Language options
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
};
`;

export async function createConfig(): Promise<void> {
  const configPath = "./vibrant.config.js";

  try {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      console.warn(`${configPath} already exists`);
      return;
    }
  } catch {
    // continue
  }

  try {
    await Bun.write(configPath, defaultConfigContent);
    console.log(`Created ${configPath}`);
    console.log("");
    console.log("You can now customize your configuration:");
    console.log("  • ignores: Array of directory patterns to exclude");
    console.log("  • format: Output format (pretty, stylish, compact, json)");
    console.log("  • rules: Configure individual rules");
    console.log("  • extends: Extend from shareable configs");
    console.log("");
  } catch (err) {
    console.error(`Failed to create ${configPath}`);
    throw err;
  }
}
