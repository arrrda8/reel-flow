import OpenAI from "openai";
import { z } from "zod";
import type { AIProvider, GenerateTextOptions } from "../types";
import { AIProviderError } from "../types";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateText(prompt: string, options?: GenerateTextOptions): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        messages: [
          ...(options?.systemPrompt ? [{ role: "system" as const, content: options.systemPrompt }] : []),
          { role: "user" as const, content: prompt },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) throw new AIProviderError("Empty response", this.name);
      return content;
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
        this.name,
      );
    }
  }

  async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>, options?: GenerateTextOptions): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no code fences, just raw JSON.`;
    const text = await this.generateText(jsonPrompt, {
      ...options,
      temperature: options?.temperature ?? 0.3,
    });
    const cleaned = text.replace(/^```json?\n?|\n?```$/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
  }

  async validateKey(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
