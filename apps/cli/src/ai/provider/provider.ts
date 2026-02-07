import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AIProviderType,
  AIConfig,
  AIFileContent,
  AIAnalysisResult,
} from "../types.js";
import { AIError } from "../types.js";
import { analysisSchema, type AnalysisResult } from "../schemas.js";
import { PROVIDER_INFO } from "./provider-config.js";
import { SYSTEM_PROMPT, buildPromptWithFiles } from "../prompts.js";

function createOpenAIClient(config: AIConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey || process.env.OPENAI_API_KEY,
  });
}

function createAnthropicClient(config: AIConfig): Anthropic {
  return new Anthropic({
    apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
  });
}

function createGeminiClient(config: AIConfig): GoogleGenerativeAI {
  const apiKey = config.apiKey ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";
  return new GoogleGenerativeAI(apiKey);
}

function parseResponse(text: string): AnalysisResult {
  try {
    const parsed = JSON.parse(text);
    return analysisSchema.parse(parsed);
  } catch (error) {
    throw new AIError(
      `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function analyze(
  config: AIConfig,
  files: AIFileContent[],
): Promise<AIAnalysisResult> {
  if (!files || files.length === 0) return { issues: [] };

  const provider = config.provider;

  try {
    const prompt = buildPromptWithFiles(files);
    let text: string;

    switch (provider) {
      case "openai": {
        const client = createOpenAIClient(config);
        const model = process.env.OPENAI_MODEL || PROVIDER_INFO.openai.defaultModel;
        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
        });
        text = response.choices[0]?.message?.content || "";
        break;
      }

      case "claude": {
        const client = createAnthropicClient(config);
        const model = process.env.CLAUDE_MODEL || PROVIDER_INFO.claude.defaultModel;
        const response = await client.messages.create({
          model,
          max_tokens: 4096,
          temperature: 0.1,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });
        text = response.content[0]?.type === "text"
          ? response.content[0].text
          : "";
        break;
      }

      case "gemini": {
        const client = createGeminiClient(config);
        const model = process.env.GEMINI_MODEL || PROVIDER_INFO.gemini.defaultModel;
        const genAI = client.getGenerativeModel({ model });
        const result = await genAI.generateContent(prompt);
        const response = result.response;
        text = response.text() || "";
        break;
      }

      case "ollama": {
        const baseUrl = config.baseUrl || process.env.OLLAMA_HOST || "http://localhost:11434";
        const model = process.env.OLLAMA_MODEL || PROVIDER_INFO.ollama.defaultModel;
        
        const response = await fetch(`${baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
            stream: false,
            options: { temperature: 0.1 },
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json() as { response?: string };
        text = data.response || "";
        break;
      }

      default:
        throw new AIError(`Unknown provider: ${provider}`);
    }

    const parsed = parseResponse(text);

    return {
      issues: parsed.issues.map((issue) => ({
        ...issue,
        ruleId: issue.ruleId || `ai:${provider}:vibecode`,
      })),
    };
  } catch (error) {
    if (error instanceof AIError) throw error;

    const message = error instanceof Error ? error.message : String(error);

    if (provider === "gemini" && message.toLowerCase().includes("quota")) {
      throw new AIError(
        `Gemini API quota exceeded. Free tier limit reached.\n\nOptions:\n  • Wait a few minutes and try again\n  • Enable billing: https://aistudio.google.com/\n  • Try another provider`,
        "gemini",
      );
    }

    throw new AIError(`${provider} API error: ${message}`, provider);
  }
}

export { PROVIDER_INFO };
export type { AnalysisResult };
