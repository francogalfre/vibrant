/** @type {import('vibrant').Config} */
module.exports = {
  // Directories to ignore during analysis
  ignores: ["node_modules", ".git", "dist", ".next", "build"],

  // Output format: 'pretty', 'stylish', 'compact', 'json'
  format: "pretty",

  // Rule configuration
  rules: {
    "generic-comment": "warn",
    "generic-variable-name": "info",
    "no-explicit-any": "warn",
    "console-log-debugging": "warn",
    "empty-function-body": "warn",
    "magic-numbers": "warn",
    "unimplemented-error": "warn",
    "hardcoded-credentials": "error",
    "empty-catch-block": "error",
  },

  // Language options
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
};
