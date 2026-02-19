export type AIProviderType = "openai" | "gemini" | "claude" | "ollama" | "openrouter";

export interface AIConfig {
  provider: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
}

export interface AIFileContent {
  path: string;
  content: string;
}

export interface AIIssue {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warn" | "warning" | "info";
  ruleId: string;
  message: string;
  suggestion: string;
  explanation?: string;
}

export interface AIDiagnosis {
  summary: string;
  highlights: string[];
  recommendations: string[];
}

export interface AIAnalysisResult {
  issues: AIIssue[];
  summary?: string;
  highlights?: string[];
  recommendations?: string[];
}

export class AIError extends Error {
  constructor(
    message: string,
    public provider?: AIProviderType,
    public code?: string,
  ) {
    super(message);
    this.name = "AIError";
  }
}
