import type { AIProvider, LLMProviderType } from "./types";
import { AIProviderError } from "./types";

export async function createAIProvider(
  providerType: LLMProviderType,
  apiKey: string,
): Promise<AIProvider> {
  switch (providerType) {
    case "anthropic": {
      const { AnthropicProvider } = await import("./providers/anthropic");
      return new AnthropicProvider(apiKey);
    }
    case "openai": {
      const { OpenAIProvider } = await import("./providers/openai");
      return new OpenAIProvider(apiKey);
    }
    case "gemini": {
      const { GeminiProvider } = await import("./providers/gemini");
      return new GeminiProvider(apiKey);
    }
    default:
      throw new AIProviderError(`Unknown provider: ${providerType}`, providerType);
  }
}

export async function createAIProviderForUser(
  userId: string,
  providerType: LLMProviderType,
): Promise<AIProvider> {
  const { db } = await import("@/db");
  const { apiKeys } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const { decrypt } = await import("@/lib/encryption");

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, providerType)))
    .limit(1);

  if (!keyRow) {
    throw new AIProviderError(
      `No API key found for ${providerType}. Please add one in Settings → API Keys.`,
      providerType,
    );
  }

  const apiKey = decrypt(keyRow.encryptedKey, keyRow.iv);
  return createAIProvider(providerType, apiKey);
}

export async function getDecryptedKey(
  userId: string,
  providerName: "elevenlabs" | "gemini" | "kling" | "anthropic" | "openai" | "nanobanana" | "kie",
): Promise<string> {
  const { db } = await import("@/db");
  const { apiKeys } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const { decrypt } = await import("@/lib/encryption");

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, providerName)))
    .limit(1);

  if (!keyRow) {
    throw new AIProviderError(
      `No API key found for ${providerName}. Please add one in Settings → API Keys.`,
      providerName,
    );
  }

  return decrypt(keyRow.encryptedKey, keyRow.iv);
}
