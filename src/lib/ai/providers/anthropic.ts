import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AIProvider, GenerateTextOptions } from "../types";
import { AIProviderError } from "../types";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateText(prompt: string, options?: GenerateTextOptions): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        system: options?.systemPrompt ?? "",
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content[0];
      if (block.type !== "text") throw new AIProviderError("Unexpected response type", this.name);
      return block.text;
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
        this.name,
      );
    }
  }

  async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>, options?: GenerateTextOptions): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON matching the requested schema. No markdown, no code fences, just raw JSON.`;
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
      await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
