import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
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
import { summarizeFiles, chunkFiles, calculateSavings, type CodeSummary } from "../summarizer.js";

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

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      // Check if it's a rate limit error
      const isRateLimit = 
        message.includes("429") ||
        message.includes("rate limit") ||
        message.includes("quota") ||
        message.includes("resource exhausted");
      
      if (!isRateLimit || i === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, i);
      console.log(`⏳ Rate limited. Retrying in ${delay}ms... (attempt ${i + 2}/${maxRetries})`);
      await sleep(delay);
    }
  }
  
  throw new Error("Max retries exceeded");
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
  options?: {
    useSummarizer?: boolean;
    maxChunkTokens?: number;
    verbose?: boolean;
  }
): Promise<AIAnalysisResult & { metadata?: { originalTokens: number; summaryTokens: number; savings: string } }> {
  if (!files || files.length === 0) return { issues: [] };

  const provider = config.provider;
  const useSummarizer = options?.useSummarizer !== false;
  const maxChunkTokens = options?.maxChunkTokens || 1500;

  try {
    let prompt: string;
    let summaries: CodeSummary[] = [];
    let originalTokens = 0;
    let summaryTokens = 0;

    if (useSummarizer) {
      // Use smart summarization to reduce tokens
      summaries = summarizeFiles(files);
      const savings = calculateSavings(summaries);
      originalTokens = savings.originalTokens;
      summaryTokens = savings.summaryTokens;

      if (options?.verbose) {
        console.log(`\n📊 Token Optimization:`);
        console.log(`   Original: ${originalTokens.toLocaleString()} tokens`);
        console.log(`   Summarized: ${summaryTokens.toLocaleString()} tokens`);
        console.log(`   Savings: ${savings.savingsPercent.toFixed(1)}%\n`);
      }

      // If still too large, chunk it
      if (summaryTokens > maxChunkTokens * 2) {
        const chunks = chunkFiles(summaries, maxChunkTokens);
        // For now, analyze first chunk (can be extended to analyze all chunks)
        prompt = buildPromptWithFiles(chunks.slice(0, 1).map((chunk, i) => ({
          path: `chunk-${i + 1}.txt`,
          content: chunk,
        })));
      } else {
        prompt = buildPromptWithFiles(summaries.map(s => ({
          path: s.path,
          content: s.summary,
        })));
      }
    } else {
      // Fallback to full content
      prompt = buildPromptWithFiles(files);
    }

    async function callProvider(): Promise<string> {
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
          return response.choices[0]?.message?.content || "";
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
          return response.content[0]?.type === "text"
            ? response.content[0].text
            : "";
        }

        case "gemini": {
          const client = createGeminiClient(config);
          const model = process.env.GEMINI_MODEL || PROVIDER_INFO.gemini.defaultModel;
          const genAI = client.getGenerativeModel({ 
            model,
            systemInstruction: SYSTEM_PROMPT
          });
          const result = await genAI.generateContent(prompt);
          const response = result.response;
          return response.text() || "";
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
          return data.response || "";
        }

        case "openrouter": {
          const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
          if (!apiKey) {
            throw new AIError(
              "OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable.",
              "openrouter",
            );
          }

          const openrouter = createOpenRouter({ apiKey });
          const model = process.env.OPENROUTER_MODEL || PROVIDER_INFO.openrouter.defaultModel;

          const { text } = await generateText({
            model: openrouter.chat(model),
            prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
            temperature: 0.1,
          });

          return text;
        }

        default:
          throw new AIError(`Unknown provider: ${provider}`);
      }
    }

    const text = await withRetry(callProvider, 3, 1000);
    const parsed = parseResponse(text);

    const result: AIAnalysisResult & { metadata?: { originalTokens: number; summaryTokens: number; savings: string } } = {
      issues: parsed.issues.map((issue) => ({
        ...issue,
        ruleId: issue.ruleId || `ai:${provider}:vibecode`,
      })),
    };

    // Add metadata if summarizer was used
    if (useSummarizer && originalTokens > 0) {
      result.metadata = {
        originalTokens,
        summaryTokens,
        savings: `${((1 - summaryTokens / originalTokens) * 100).toFixed(1)}%`,
      };
    }

    return result;
  } catch (error) {
    if (error instanceof AIError) throw error;

    const message = error instanceof Error ? error.message : String(error);

    if (provider === "gemini" && message.toLowerCase().includes("quota")) {
      throw new AIError(
        `Gemini API quota exceeded. Free tier limit reached.\n\nOptions:\n  • Wait a few minutes and try again\n  • Try Ollama (free, local): vibrant . --ai --provider ollama\n  • Enable billing: https://aistudio.google.com/`,
        "gemini",
      );
    }

    throw new AIError(`${provider} API error: ${message}`, provider);
  }
}

export { PROVIDER_INFO };
export type { AnalysisResult };
