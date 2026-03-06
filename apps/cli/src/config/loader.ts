import { promises as fs } from "node:fs";
import { resolve, dirname, join, extname } from "node:path";
import { pathToFileURL } from "node:url";
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
  configPath?: string,
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
    const { build } = await import("esbuild");
    const tempFile = filepath.replace(/\.ts$/, ".js");

    try {
      await build({
        entryPoints: [filepath],
        outfile: tempFile,
        format: "esm",
        platform: "node",
        target: "node18",
        bundle: true,
        write: true,
        minify: false,
        sourcemap: false,
      });

      const config = await import(pathToFileURL(tempFile).href).then(
        (m) => m.default || m,
      );
      await fs.unlink(tempFile).catch(() => {});

      return mergeWithDefaults(config);
    } catch {
      throw new Error(`Failed to load TypeScript config: ${filepath}`);
    }
  }

  const config = await import(pathToFileURL(filepath).href).then(
    (m) => m.default || m,
  );
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
  // Rules focused on detecting REAL vibecoding patterns
  // Avoid rules that generate too many false positives
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
      // Ignore common UI component libraries
      "**/components/ui/**",
      "**/shadcn*/**",
      "**/ui/**",
    ],
    rules: {
      // AI-generated patterns - CRITICAL
      "ai-todo-comments": "error",
      "unimplemented-error": "error",
      "console-log-debugging": "warn",

      // Security - CRITICAL
      "hardcoded-credentials": "error",
      "no-sql-injection": "error",
      "no-unsafe-inner-html": "error",

      // Type safety - CRITICAL
      "no-explicit-any": "error",

      // Error handling - WARNING (not error, can be valid)
      "empty-catch-block": "warn",

      // Code quality - WARNING
      "magic-numbers": "warn",
      "ai-comment-emojis": "warn",
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  };
}

export async function resolveExtends(
  config: Config,
  basePath: string,
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

export function normalizeRuleConfig(
  config: RuleConfig,
): [string, ...unknown[]] {
  if (typeof config === "string") {
    return [config];
  }
  if (Array.isArray(config)) {
    return config as [string, ...unknown[]];
  }
  return ["off"];
}
