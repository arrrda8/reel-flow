import { z } from "zod";

export interface GenerateTextOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIProvider {
  readonly name: string;
  generateText(prompt: string, options?: GenerateTextOptions): Promise<string>;
  generateStructured<T>(prompt: string, schema: z.ZodSchema<T>, options?: GenerateTextOptions): Promise<T>;
  validateKey(): Promise<boolean>;
}

export type LLMProviderType = "anthropic" | "openai" | "gemini";

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
