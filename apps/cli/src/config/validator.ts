import { z } from "zod";
import type { Config, RuleConfig } from "../core/types.js";
import { rules } from "../rules/index.js";

// Schema for validating configuration
export const configSchema = z.object({
  name: z.string().optional(),
  files: z.array(z.string()).optional(),
  ignores: z.array(z.string()).optional(),
  format: z.enum(["pretty", "compact", "plan", "json"]).optional(),
  languageOptions: z.object({
    ecmaVersion: z.number().optional(),
    sourceType: z.enum(["script", "module"]).optional(),
    globals: z.record(z.union([z.boolean(), z.enum(["readonly", "writable", "off"])])).optional(),
  }).optional(),
  linterOptions: z.object({
    noInlineConfig: z.boolean().optional(),
    reportUnusedDisableDirectives: z.boolean().optional(),
  }).optional(),
  rules: z.record(z.union([
    z.enum(["error", "warn", "off", "info"]),
    z.tuple([z.enum(["error", "warn", "off", "info"]), z.unknown()]),
    z.tuple([z.enum(["error", "warn", "off", "info"]), z.unknown(), z.unknown()]),
  ])).optional(),
  settings: z.record(z.unknown()).optional(),
  extends: z.union([z.string(), z.array(z.string())]).optional(),
});

export type ValidatedConfig = z.infer<typeof configSchema>;

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  config?: ValidatedConfig;
}

/**
 * Validate a configuration object
 */
export function validateConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // First, validate against Zod schema
  const parseResult = configSchema.safeParse(config);
  
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        field: issue.path.join("."),
        message: issue.message,
        value: issue.path.length > 0 ? (config as Record<string, unknown>)?.[issue.path[0]] : undefined,
      });
    }
    
    return { valid: false, errors, warnings };
  }

  const validatedConfig = parseResult.data;

  // Validate rules exist
  if (validatedConfig.rules) {
    for (const ruleId of Object.keys(validatedConfig.rules)) {
      if (!rules[ruleId]) {
        warnings.push({
          field: `rules.${ruleId}`,
          message: `Unknown rule "${ruleId}". This rule will be ignored.`,
          value: ruleId,
        });
      }
    }
  }

  // Validate format
  if (validatedConfig.format) {
    const validFormats = ["pretty", "compact", "plan", "json"];
    if (!validFormats.includes(validatedConfig.format)) {
      errors.push({
        field: "format",
        message: `Invalid format "${validatedConfig.format}". Must be one of: ${validFormats.join(", ")}`,
        value: validatedConfig.format,
      });
    }
  }

  // Validate severity levels in rules
  if (validatedConfig.rules) {
    for (const [ruleId, ruleConfig] of Object.entries(validatedConfig.rules)) {
      const severity = Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig;
      const validSeverities = ["error", "warn", "off", "info"];
      
      if (!validSeverities.includes(severity)) {
        errors.push({
          field: `rules.${ruleId}`,
          message: `Invalid severity "${severity}". Must be one of: ${validSeverities.join(", ")}`,
          value: severity,
        });
      }
    }
  }

  // Validate extends
  if (validatedConfig.extends) {
    const extendsList = Array.isArray(validatedConfig.extends) 
      ? validatedConfig.extends 
      : [validatedConfig.extends];
    
    for (const extend of extendsList) {
      if (typeof extend !== "string") {
        errors.push({
          field: "extends",
          message: `Invalid extends value. Must be a string or array of strings.`,
          value: extend,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: validatedConfig,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];
  
  if (result.errors.length > 0) {
    lines.push("❌ Configuration Errors:");
    for (const error of result.errors) {
      lines.push(`   • ${error.field}: ${error.message}`);
    }
    lines.push("");
  }
  
  if (result.warnings.length > 0) {
    lines.push("⚠️  Configuration Warnings:");
    for (const warning of result.warnings) {
      lines.push(`   • ${warning.field}: ${warning.message}`);
    }
    lines.push("");
  }
  
  return lines.join("\n");
}

/**
 * Check if a rule configuration is valid
 */
export function isValidRuleConfig(config: unknown): config is RuleConfig {
  if (typeof config === "string") {
    return ["error", "warn", "off", "info"].includes(config);
  }
  
  if (Array.isArray(config) && config.length > 0) {
    return ["error", "warn", "off", "info"].includes(config[0] as string);
  }
  
  return false;
}

/**
 * Normalize rule configuration
 */
export function normalizeRuleConfig(config: RuleConfig): [string, ...unknown[]] {
  if (typeof config === "string") {
    return [config];
  }
  return config;
}