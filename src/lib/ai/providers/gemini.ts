import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { AIProvider, GenerateTextOptions } from "../types";
import { AIProviderError } from "../types";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateText(prompt: string, options?: GenerateTextOptions): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          maxOutputTokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.7,
        },
        systemInstruction: options?.systemPrompt || undefined,
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) throw new AIProviderError("Empty response", this.name);
      return text;
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
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      await model.generateContent("Hi");
      return true;
    } catch {
      return false;
    }
  }
}
