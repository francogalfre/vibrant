import type { Config } from "../core/types.js";

/**
 * Default configuration - works out of the box
 * Zero-config philosophy: sensible defaults, minimal setup
 */
export const defaultConfig: Config = {
  // Include all common source directories
  files: ["src/**/*", "lib/**/*", "app/**/*", "pages/**/*", "components/**/*"],
  
  // Ignore common non-source directories
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
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/*.config.ts",
    "**/*.config.js",
  ],
  
  // Default format
  format: "pretty",
  
  // All rules enabled by default with sensible severities
  rules: {
    // Type safety (error)
    "no-explicit-any": "error",
    
    // Best practices (error)
    "unimplemented-error": "error",
    "empty-function-body": "error",
    "hardcoded-credentials": "error",
    "empty-catch-block": "error",
    
    // Code quality (warn)
    "console-log-debugging": "warn",
    "generic-variable-name": "warn",
    "magic-numbers": "warn",
    "generic-comment": "warn",
  },
  
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
};

/**
 * Preset configurations for different project types
 */
export const presets = {
  // Strict preset - maximum quality enforcement
  strict: {
    ...defaultConfig,
    rules: {
      ...defaultConfig.rules,
      "no-explicit-any": "error",
      "console-log-debugging": "error",
      "generic-variable-name": "error",
      "magic-numbers": "error",
      "generic-comment": "error",
    },
  },
  
  // Relaxed preset - good for prototyping and legacy code
  relaxed: {
    ...defaultConfig,
    rules: {
      "no-explicit-any": "warn",
      "console-log-debugging": "warn",
      "generic-variable-name": "off",
      "magic-numbers": "off",
      "generic-comment": "off",
      "unimplemented-error": "warn",
      "empty-function-body": "warn",
      "hardcoded-credentials": "error",
      "empty-catch-block": "warn",
    },
  },
  
  // Minimal preset - only critical issues
  minimal: {
    ...defaultConfig,
    rules: {
      "no-explicit-any": "off",
      "console-log-debugging": "off",
      "generic-variable-name": "off",
      "magic-numbers": "off",
      "generic-comment": "off",
      "unimplemented-error": "error",
      "empty-function-body": "off",
      "hardcoded-credentials": "error",
      "empty-catch-block": "warn",
    },
  },
  
  // AI preset - optimized for AI-generated code detection
  ai: {
    ...defaultConfig,
    rules: {
      ...defaultConfig.rules,
      "no-explicit-any": "warn",
      "console-log-debugging": "error",
      "generic-variable-name": "error",
      "magic-numbers": "warn",
      "generic-comment": "error",
      "unimplemented-error": "error",
      "empty-function-body": "error",
      "hardcoded-credentials": "error",
      "empty-catch-block": "error",
    },
  },
};

export type PresetName = keyof typeof presets;

/**
 * Apply a preset to configuration
 */
export function applyPreset(config: Config, presetName: PresetName): Config {
  const preset = presets[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}. Available: ${Object.keys(presets).join(", ")}`);
  }
  
  return {
    ...preset,
    ...config,
    rules: {
      ...preset.rules,
      ...config.rules,
    },
  };
}

/**
 * Detect project type and suggest best preset
 */
export function detectProjectType(): { type: string; preset: PresetName } {
  const fs = require("fs");
  const path = require("path");
  const cwd = process.cwd();
  
  // Check for package.json
  const hasPackageJson = fs.existsSync(path.join(cwd, "package.json"));
  
  if (!hasPackageJson) {
    return { type: "unknown", preset: "minimal" };
  }
  
  const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Detect framework
  if (deps["next"]) return { type: "nextjs", preset: "strict" };
  if (deps["react"]) return { type: "react", preset: "strict" };
  if (deps["vue"]) return { type: "vue", preset: "strict" };
  if (deps["@angular/core"]) return { type: "angular", preset: "strict" };
  if (deps["typescript"]) return { type: "typescript", preset: "strict" };
  
  // Detect project stage
  if (packageJson.version?.startsWith("0.")) {
    return { type: "early-stage", preset: "relaxed" };
  }
  
  return { type: "javascript", preset: "default" };
}
