import type { AIConfig, AIProviderType } from "../types";

export function detectProvider(
  requestedProvider?: AIProviderType,
): AIConfig | null {
  // Offline mode doesn't require API keys
  if (requestedProvider === "offline") {
    return {
      provider: "offline",
    };
  }

  if (requestedProvider) {
    const apiKey = getApiKey(requestedProvider);
    const baseUrl = getBaseUrl(requestedProvider);

    if (!apiKey && !baseUrl) {
      return null;
    }

    return {
      provider: requestedProvider,
      apiKey,
      baseUrl,
    };
  }

  const available = getAvailableProviders();
  if (available.length === 0) return null;

  const provider = available[0];
  const apiKey = getApiKey(provider);
  const baseUrl = getBaseUrl(provider);

  return {
    provider,
    apiKey,
    baseUrl,
  };
}

function getApiKey(provider: AIProviderType): string | undefined {
  const keys: Record<AIProviderType, string | undefined> = {
    openai: getEnv("OPENAI_API_KEY"),
    claude: getEnv("ANTHROPIC_API_KEY"),
    gemini: getEnv("GOOGLE_GENERATIVE_AI_API_KEY") || getEnv("GEMINI_API_KEY"),
    ollama: undefined,
    offline: undefined,
  };
  return keys[provider];
}

function getBaseUrl(provider: AIProviderType): string | undefined {
  if (provider !== "ollama") return undefined;
  return getEnv("OLLAMA_HOST") || getEnv("OLLAMA_BASE_URL");
}

function getEnv(key: string): string | undefined {
  if (typeof Bun !== "undefined" && Bun.env?.[key]) return Bun.env[key];
  return process.env[key];
}

export function getAvailableProviders(): AIProviderType[] {
  const providers: AIProviderType[] = [];

  if (getEnv("OPENAI_API_KEY")) providers.push("openai");
  if (getEnv("GOOGLE_GENERATIVE_AI_API_KEY") || getEnv("GEMINI_API_KEY"))
    providers.push("gemini");
  if (getEnv("ANTHROPIC_API_KEY")) providers.push("claude");
  if (getEnv("OLLAMA_HOST") || getEnv("OLLAMA_BASE_URL"))
    providers.push("ollama");

  return providers;
}

export function getProviderSetupInstructions(
  provider?: AIProviderType,
): string {
  return `
❌ No AI provider configured

Please set one of these environment variables:

${
  provider
    ? `  ${getEnvKey(provider)} - for ${provider}`
    : `  OPENAI_API_KEY              - for OpenAI (gpt-4o-mini)
  GOOGLE_GENERATIVE_AI_API_KEY - for Google Gemini (gemini-2.0-flash-lite)
  GEMINI_API_KEY               - for Google Gemini (alias)
  ANTHROPIC_API_KEY           - for Anthropic Claude (claude-3-haiku-20240307)
  OLLAMA_HOST or OLLAMA_BASE_URL - for local Ollama
  
  Or use offline mode (no API key required):
    vibrant . --ai --provider offline`
}

Example:
  export ${provider ? getEnvKey(provider) : "OPENAI_API_KEY"}="your-api-key-here"

Or configure in .env file.

💡 Tip: Use --provider offline for free pattern-based analysis (no API calls)`;
}

function getEnvKey(provider: AIProviderType): string {
  const keys: Record<AIProviderType, string> = {
    openai: "OPENAI_API_KEY",
    claude: "ANTHROPIC_API_KEY",
    gemini: "GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY",
    ollama: "OLLAMA_HOST or OLLAMA_BASE_URL",
    offline: "(no API key needed)",
  };
  return keys[provider];
}
