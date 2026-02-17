import type { AIProviderType } from "../types";

export const PROVIDERS: readonly AIProviderType[] = [
  "openai",
  "claude",
  "gemini",
  "ollama",
  "openrouter",
] as const;

export const PROVIDER_INFO: Record<
  AIProviderType,
  {
    name: string;
    envKey: string | null;
    defaultModel: string;
    models: readonly string[];
  }
> = {
  openai: {
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  },
  claude: {
    name: "Anthropic Claude",
    envKey: "ANTHROPIC_API_KEY",
    defaultModel: "claude-3-haiku-20240307",
    models: [
      "claude-3-haiku-20240307",
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
    ],
  },
  gemini: {
    name: "Google Gemini",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    defaultModel: "gemini-2.0-flash-lite",
    models: ["gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
  ollama: {
    name: "Ollama (Local)",
    envKey: null,
    defaultModel: "qwen2.5:7b",
    models: ["qwen2.5:7b", "llama3.1", "codellama:13b", "mistral"],
  },
  openrouter: {
    name: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    defaultModel: "mistral/mistral-small-3.1-24b-instruct:free",
    models: [
      "mistral/mistral-small-3.1-24b-instruct:free",
      "google/gemma-3-12b-instruct:free",
      "qwen/qwen3-coder:free",
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.2-3b-instruct:free",
    ],
  },
};
