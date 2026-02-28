import type {
  AIProviderType,
  AIConfig,
  AIFileContent,
  AIAnalysisResult,
} from "../types.js";
import { AIError } from "../types.js";
import { analysisSchema, type AnalysisResult } from "../schemas.js";
import { PROVIDER_INFO } from "./provider-config.js";
import { SYSTEM_PROMPT, buildPrompt } from "../prompts.js";
import { summarizeFiles, chunkFiles, calculateSavings, type CodeSummary } from "../summarizer.js";
import pc from "picocolors";

async function getOpenAIClient(config: AIConfig): Promise<any> {
  const { default: OpenAI } = await import("openai");
  return new OpenAI({
    apiKey: config.apiKey || process.env.OPENAI_API_KEY,
  });
}

async function getAnthropicClient(config: AIConfig): Promise<any> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  return new Anthropic({
    apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
  });
}

async function getGeminiClient(config: AIConfig): Promise<any> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const apiKey = config.apiKey ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";
  return new GoogleGenerativeAI(apiKey);
}

async function getOpenRouter(config: AIConfig): Promise<any> {
  const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
  const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
  return createOpenRouter({ apiKey });
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
      const err = error as any;
      const message = err.message || String(error);
      
      const isRateLimit = 
        message.includes("429") ||
        message.includes("rate limit") ||
        message.includes("quota") ||
        message.includes("resource exhausted");
      
      if (!isRateLimit || i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  
  throw new Error("Max retries exceeded");
}

function parseResponse(text: string): AnalysisResult {
  let jsonText = text.trim();
  
  // Extract JSON from markdown code blocks if present
  const jsonBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonText = jsonBlockMatch[1].trim();
  }
  
  // Remove any text before the first { or [
  const jsonStart = jsonText.search(/[{[]/);
  if (jsonStart > 0) {
    jsonText = jsonText.slice(jsonStart);
  }
  
  // Find matching closing brace/bracket
  let depth = 0;
  let endPos = 0;
  const openChar = jsonText[0];
  const closeChar = openChar === '{' ? '}' : ']';
  
  for (let i = 0; i < jsonText.length; i++) {
    if (jsonText[i] === openChar) depth++;
    if (jsonText[i] === closeChar) depth--;
    if (depth === 0) {
      endPos = i + 1;
      break;
    }
  }
  
  if (endPos > 0) {
    jsonText = jsonText.slice(0, endPos);
  }
  
  try {
    const parsed = JSON.parse(jsonText);
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
    isSingleFile?: boolean;
  }
): Promise<AIAnalysisResult & { metadata?: { originalTokens: number; summaryTokens: number; savings: string } }> {
  if (!files || files.length === 0) return { issues: [] };

  const provider = config.provider;
  const useSummarizer = options?.useSummarizer !== false;
  const maxChunkTokens = options?.maxChunkTokens || 800;
  const isSingleFile = options?.isSingleFile ?? (files.length === 1);

  try {
    let prompt: string;
    let summaries: CodeSummary[] = [];
    let originalTokens = 0;
    let summaryTokens = 0;

    if (useSummarizer) {
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

      if (summaryTokens > maxChunkTokens * 2) {
        const chunks = chunkFiles(summaries, maxChunkTokens);
        prompt = buildPrompt(chunks.slice(0, 1).map((chunk, i) => ({
          path: `chunk-${i + 1}.txt`,
          content: chunk,
        })), isSingleFile);
      } else {
        prompt = buildPrompt(summaries.map(s => ({
          path: s.path,
          content: s.summary,
        })), isSingleFile);
      }
    } else {
      prompt = buildPrompt(files, isSingleFile);
    }

    async function callProvider(): Promise<string> {
      switch (provider) {
        case "openai": {
          const client = await getOpenAIClient(config);
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
          const client = await getAnthropicClient(config);
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
          const client = await getGeminiClient(config);
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
              stream: true,
              options: { temperature: 0.1 },
            }),
          });

          if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
          }

          if (!response.body) {
            throw new Error("No response body");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let result = "";
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter(Boolean);
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.response) {
                  process.stdout.write(data.response);
                  result += data.response;
                }
                if (data.done) {
                  console.log();
                }
              } catch {}
            }
          }
          
          return result || "";
        }

        case "openrouter": {
          const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
          if (!apiKey) {
            throw new AIError(
              "OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable.",
              "openrouter",
            );
          }

          const openrouter = await getOpenRouter(config);
          const requestedModel = process.env.OPENROUTER_MODEL;
          
          const modelsToTry = requestedModel 
            ? [requestedModel]
            : PROVIDER_INFO.openrouter.models;
          
          let lastError: Error | null = null;
          
          for (const model of modelsToTry) {
            try {
              // eslint-disable-next-line no-console
              console.log(pc.dim(`   Trying model: ${model}...`));
              
              const { streamText } = await import("ai");
              const result = await streamText({
                model: openrouter.chat(model),
                prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
                temperature: 0.1,
              });
              
              let fullText = "";
              // eslint-disable-next-line no-console
              console.log(pc.gray("   "));
              
              for await (const chunk of result.textStream) {
                // eslint-disable-next-line no-console
                process.stdout.write(pc.dim(chunk));
                fullText += chunk;
              }
              // eslint-disable-next-line no-console
              console.log();
              
              return fullText;
            } catch (error) {
              lastError = error as Error;
              // eslint-disable-next-line no-console
              console.log(pc.dim(`   ⚠ Model ${model} failed: ${lastError.message}`));
            }
          }
          
          throw new AIError(
            `All OpenRouter models failed. Last error: ${lastError?.message}`,
            "openrouter",
          );
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
      summary: parsed.summary,
      highlights: parsed.highlights,
      recommendations: parsed.recommendations,
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
