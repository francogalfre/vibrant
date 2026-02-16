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
  
  // Only rules that detect REAL BUGS
  // No opinionated style rules (naming, magic numbers, etc.)
  rules: {
    // Type safety - CRITICAL
    "no-explicit-any": "error" as const,
    
    // Incomplete code - CRITICAL  
    "unimplemented-error": "error" as const,
    "empty-function-body": "error" as const,
    
    // Error handling - CRITICAL
    "empty-catch-block": "error" as const,
    
    // Security - CRITICAL
    "hardcoded-credentials": "error" as const,
    "no-sql-injection": "error" as const,
    "no-unsafe-inner-html": "error" as const,
    
    // Performance - CRITICAL
    "no-await-in-loop": "error" as const,
    
    // Possible bugs - CRITICAL
    "no-unreachable": "error" as const,
    "use-isnan": "error" as const,
    
    // Debug code - WARNING (not critical, might be intentional)
    "console-log-debugging": "warn" as const,
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
  // Strict preset - all real bugs as errors
  strict: {
    ...defaultConfig,
    rules: {
      "no-explicit-any": "error" as const,
      "unimplemented-error": "error" as const,
      "empty-function-body": "error" as const,
      "empty-catch-block": "error" as const,
      "hardcoded-credentials": "error" as const,
      "no-sql-injection": "error" as const,
      "no-unsafe-inner-html": "error" as const,
      "no-await-in-loop": "error" as const,
      "no-unreachable": "error" as const,
      "use-isnan": "error" as const,
      "console-log-debugging": "error" as const,
    },
  },
  
  // Relaxed preset - prototyping friendly
  relaxed: {
    ...defaultConfig,
    rules: {
      "no-explicit-any": "warn" as const,
      "unimplemented-error": "warn" as const,
      "empty-function-body": "warn" as const,
      "empty-catch-block": "warn" as const,
      "hardcoded-credentials": "error" as const,
      "no-sql-injection": "warn" as const,
      "no-unsafe-inner-html": "error" as const,
      "no-await-in-loop": "warn" as const,
      "no-unreachable": "warn" as const,
      "use-isnan": "error" as const,
      "console-log-debugging": "warn" as const,
    },
  },
  
  // Minimal preset - only crashing bugs
  minimal: {
    ...defaultConfig,
    rules: {
      "no-explicit-any": "off" as const,
      "unimplemented-error": "error" as const,
      "empty-function-body": "off" as const,
      "empty-catch-block": "warn" as const,
      "hardcoded-credentials": "error" as const,
      "no-sql-injection": "error" as const,
      "no-unsafe-inner-html": "error" as const,
      "no-await-in-loop": "off" as const,
      "no-unreachable": "error" as const,
      "use-isnan": "error" as const,
      "console-log-debugging": "off" as const,
    },
  },
  
  // AI preset - strict for AI-generated code
  ai: {
    ...defaultConfig,
    rules: {
      "no-explicit-any": "error" as const,
      "unimplemented-error": "error" as const,
      "empty-function-body": "error" as const,
      "empty-catch-block": "error" as const,
      "hardcoded-credentials": "error" as const,
      "no-sql-injection": "error" as const,
      "no-unsafe-inner-html": "error" as const,
      "no-await-in-loop": "error" as const,
      "no-unreachable": "error" as const,
      "use-isnan": "error" as const,
      "console-log-debugging": "warn" as const,
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
  
  return { type: "javascript", preset: "strict" };
}
