# ReelFlow SaaS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform ReelFlow from a UI prototype with mock AI integrations into a functional SaaS with real AI provider support (BYOK), proper navigation, and modern design.

**Architecture:** AI Provider abstraction layer with factory pattern. Each LLM provider (Anthropic/OpenAI/Gemini) implements a unified interface. Specialized providers for ElevenLabs (voice), NanoBanana 2 (images), and kie.ai (video). All API keys encrypted with AES-256-GCM in DB.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, Drizzle ORM, PostgreSQL, BullMQ/Redis, MinIO, Framer Motion, Zustand

---

## Phase 1: Foundation — AI Provider Abstraction Layer

### Task 1.1: Create AI Provider Interface & Types

**Files:**
- Create: `src/lib/ai/types.ts`

**Step 1: Create the AI provider types file**

```typescript
// src/lib/ai/types.ts
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
```

**Step 2: Commit**

```bash
git add src/lib/ai/types.ts
git commit -m "feat: add AI provider interface and types"
```

---

### Task 1.2: Implement Anthropic Provider

**Files:**
- Create: `src/lib/ai/providers/anthropic.ts`

**Step 1: Install Anthropic SDK**

```bash
bun add @anthropic-ai/sdk
```

**Step 2: Create the Anthropic provider**

```typescript
// src/lib/ai/providers/anthropic.ts
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
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON matching this schema. No markdown, no code fences, just raw JSON.\nSchema: ${JSON.stringify(zodToJsonDescription(schema))}`;
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

function zodToJsonDescription(schema: z.ZodSchema): Record<string, unknown> {
  if ("_def" in schema && schema._def) {
    return { type: schema._def.typeName ?? "unknown" };
  }
  return { type: "object" };
}
```

**Step 3: Commit**

```bash
git add src/lib/ai/providers/anthropic.ts
git commit -m "feat: add Anthropic AI provider implementation"
```

---

### Task 1.3: Implement OpenAI Provider

**Files:**
- Create: `src/lib/ai/providers/openai.ts`

**Step 1: Install OpenAI SDK**

```bash
bun add openai
```

**Step 2: Create the OpenAI provider**

```typescript
// src/lib/ai/providers/openai.ts
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
```

**Step 3: Commit**

```bash
git add src/lib/ai/providers/openai.ts
git commit -m "feat: add OpenAI AI provider implementation"
```

---

### Task 1.4: Implement Gemini Provider

**Files:**
- Create: `src/lib/ai/providers/gemini.ts`

**Step 1: Install Google AI SDK**

```bash
bun add @google/generative-ai
```

**Step 2: Create the Gemini provider**

```typescript
// src/lib/ai/providers/gemini.ts
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
```

**Step 3: Commit**

```bash
git add src/lib/ai/providers/gemini.ts
git commit -m "feat: add Gemini AI provider implementation"
```

---

### Task 1.5: Create AI Provider Factory

**Files:**
- Create: `src/lib/ai/factory.ts`
- Create: `src/lib/ai/index.ts`

**Step 1: Create the factory**

```typescript
// src/lib/ai/factory.ts
import { auth } from "@/auth";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { eq, and } from "drizzle-orm";
import type { AIProvider, LLMProviderType } from "./types";
import { AIProviderError } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";

export async function createAIProvider(providerType: LLMProviderType): Promise<AIProvider> {
  const session = await auth();
  if (!session?.user?.id) throw new AIProviderError("Not authenticated", providerType);

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, session.user.id), eq(apiKeys.provider, providerType)))
    .limit(1);

  if (!keyRow) {
    throw new AIProviderError(
      `No API key found for ${providerType}. Please add one in Settings → API Keys.`,
      providerType,
    );
  }

  const apiKey = decrypt(keyRow.encryptedKey, keyRow.iv);

  switch (providerType) {
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "openai":
      return new OpenAIProvider(apiKey);
    case "gemini":
      return new GeminiProvider(apiKey);
    default:
      throw new AIProviderError(`Unknown provider: ${providerType}`, providerType);
  }
}

export async function createSpecializedProvider(
  providerName: "elevenlabs" | "nanobanana" | "kie",
): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new AIProviderError("Not authenticated", providerName);

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, session.user.id), eq(apiKeys.provider, providerName)))
    .limit(1);

  if (!keyRow) {
    throw new AIProviderError(
      `No API key found for ${providerName}. Please add one in Settings → API Keys.`,
      providerName,
    );
  }

  return decrypt(keyRow.encryptedKey, keyRow.iv);
}
```

```typescript
// src/lib/ai/index.ts
export { createAIProvider, createSpecializedProvider } from "./factory";
export type { AIProvider, LLMProviderType, GenerateTextOptions } from "./types";
export { AIProviderError } from "./types";
```

**Step 2: Commit**

```bash
git add src/lib/ai/
git commit -m "feat: add AI provider factory with key decryption"
```

---

### Task 1.6: Update DB Schema — Add New Providers to Enum

**Files:**
- Modify: `src/db/schema.ts` — Update `apiProviderEnum` to include `nanobanana` and `kie`

**Step 1: Update the enum**

In `src/db/schema.ts`, find the `apiProviderEnum` definition and update it:

```typescript
export const apiProviderEnum = pgEnum("api_provider", [
  "elevenlabs",
  "gemini",
  "kling",
  "anthropic",
  "openai",
  "nanobanana",
  "kie",
]);
```

**Step 2: Generate and run migration**

```bash
bun drizzle-kit generate
bun drizzle-kit push
```

**Step 3: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add nanobanana and kie to API provider enum"
```

---

### Task 1.7: Fix API Key Testing (Replace Mock)

**Files:**
- Modify: `src/lib/settings-actions.ts` — Replace mock `testApiKey()` with real validation

**Step 1: Replace the testApiKey function**

Find the `testApiKey` function (around line 305-346) and replace it:

```typescript
export async function testApiKey(keyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, session.user.id)))
    .limit(1);

  if (!keyRow) throw new Error("Key not found");

  const decryptedKey = decrypt(keyRow.encryptedKey, keyRow.iv);
  let isValid = false;

  try {
    switch (keyRow.provider) {
      case "anthropic": {
        const { AnthropicProvider } = await import("@/lib/ai/providers/anthropic");
        const provider = new AnthropicProvider(decryptedKey);
        isValid = await provider.validateKey();
        break;
      }
      case "openai": {
        const { OpenAIProvider } = await import("@/lib/ai/providers/openai");
        const provider = new OpenAIProvider(decryptedKey);
        isValid = await provider.validateKey();
        break;
      }
      case "gemini": {
        const { GeminiProvider } = await import("@/lib/ai/providers/gemini");
        const provider = new GeminiProvider(decryptedKey);
        isValid = await provider.validateKey();
        break;
      }
      case "elevenlabs": {
        const res = await fetch("https://api.elevenlabs.io/v1/user", {
          headers: { "xi-api-key": decryptedKey },
        });
        isValid = res.ok;
        break;
      }
      default:
        // For providers without validation (nanobanana, kie) mark as valid
        isValid = true;
    }
  } catch {
    isValid = false;
  }

  await db
    .update(apiKeys)
    .set({ isValid, lastTestedAt: new Date() })
    .where(eq(apiKeys.id, keyId));

  return { isValid };
}
```

**Step 2: Add missing import if needed**

Make sure `decrypt` is imported from `@/lib/encryption` at the top of settings-actions.ts.

**Step 3: Commit**

```bash
git add src/lib/settings-actions.ts
git commit -m "feat: replace mock API key testing with real provider validation"
```

---

## Phase 2: Real Concept & Research Generation

### Task 2.1: Create Concept Generation Prompts

**Files:**
- Create: `src/lib/ai/prompts/concept.ts`

**Step 1: Create the prompts file**

```typescript
// src/lib/ai/prompts/concept.ts

export function getResearchPrompt(ideaText: string, platform: string, locale: string): string {
  const lang = locale === "de" ? "German" : "English";
  return `You are a research assistant for short-form video content creation.

Research the following video idea and provide comprehensive findings:

**Idea:** ${ideaText}
**Platform:** ${platform}
**Language:** Respond in ${lang}

Provide your research as JSON with this exact structure:
{
  "topic": "Main topic title",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "sources": ["Source 1", "Source 2", "Source 3"],
  "summary": "2-3 sentence summary of key findings"
}

Focus on:
- Current trends and statistics related to this topic
- Key facts that would make compelling video content
- Audience engagement angles for ${platform}
- Viral potential and hook opportunities`;
}

export function getConceptPrompt(
  ideaText: string,
  platform: string,
  duration: number,
  locale: string,
  researchSummary: string,
): string {
  const lang = locale === "de" ? "German" : "English";
  const sceneCount = Math.max(3, Math.round(duration / 10));

  return `You are a creative director for short-form faceless video content.

Create a detailed video treatment based on this brief:

**Idea:** ${ideaText}
**Platform:** ${platform}
**Target Duration:** ${duration} seconds (~${sceneCount} scenes)
**Language:** Respond in ${lang}

**Research Context:**
${researchSummary}

Provide the treatment as JSON with this exact structure:
{
  "title": "Catchy video title",
  "hook": "Opening hook (first 3 seconds) that grabs attention",
  "scenes": [
    {
      "narration": "What the narrator says in this scene",
      "visual": "Description of what the viewer sees"
    }
  ],
  "cta": "Call to action for the end"
}

Requirements:
- Create exactly ${sceneCount} scenes
- Each scene narration should be ~${Math.round(duration / sceneCount)} seconds when spoken
- Hook must be attention-grabbing for ${platform}
- Visuals should be achievable with AI image generation (no text overlays, no specific people)
- CTA should encourage engagement (like, follow, comment)`;
}
```

**Step 2: Commit**

```bash
git add src/lib/ai/prompts/concept.ts
git commit -m "feat: add concept and research generation prompts"
```

---

### Task 2.2: Replace Mock generateConcept with Real Implementation

**Files:**
- Modify: `src/lib/project-actions.ts` — Replace `generateConcept()` function (lines ~571-724)

**Step 1: Replace the generateConcept function**

Find `generateConcept` in `src/lib/project-actions.ts` and replace the entire function:

```typescript
export async function generateConcept(
  projectId: string,
  ideaText: string,
  platform: string,
  duration: number,
  locale: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Get the project to find which LLM provider to use
  const [project] = await db
    .select({ llmProvider: projects.llmProvider })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);

  if (!project) throw new Error("Project not found");

  const { createAIProvider } = await import("@/lib/ai");
  const { getResearchPrompt, getConceptPrompt } = await import("@/lib/ai/prompts/concept");
  const { z } = await import("zod");

  const provider = await createAIProvider(project.llmProvider as "anthropic" | "openai" | "gemini");

  // Step 1: Research
  const researchSchema = z.object({
    topic: z.string(),
    keyPoints: z.array(z.string()),
    sources: z.array(z.string()),
    summary: z.string(),
  });

  const researchPrompt = getResearchPrompt(ideaText, platform, locale);
  const researchReport = await provider.generateStructured(researchPrompt, researchSchema);

  // Step 2: Concept/Treatment
  const treatmentSchema = z.object({
    title: z.string(),
    hook: z.string(),
    scenes: z.array(z.object({
      narration: z.string(),
      visual: z.string(),
    })),
    cta: z.string(),
  });

  const conceptPrompt = getConceptPrompt(ideaText, platform, duration, locale, researchReport.summary);
  const treatment = await provider.generateStructured(conceptPrompt, treatmentSchema);

  // Save to DB
  await db
    .update(projects)
    .set({
      ideaText,
      treatment,
      researchReport,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  return { treatment, researchReport };
}
```

**Step 2: Remove the old mock helper functions** (sceneTemplates array, mock data generators below the old generateConcept)

**Step 3: Commit**

```bash
git add src/lib/project-actions.ts
git commit -m "feat: replace mock concept generation with real AI provider calls"
```

---

## Phase 3: ElevenLabs Voice Integration

### Task 3.1: Create ElevenLabs Provider

**Files:**
- Create: `src/lib/ai/providers/elevenlabs.ts`

**Step 1: Create the ElevenLabs provider**

```typescript
// src/lib/ai/providers/elevenlabs.ts

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  speed?: number;
}

export class ElevenLabsProvider {
  constructor(private apiKey: string) {}

  async listVoices(): Promise<ElevenLabsVoice[]> {
    const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
      headers: { "xi-api-key": this.apiKey },
    });
    if (!res.ok) throw new Error(`ElevenLabs API error: ${res.status}`);
    const data = await res.json();
    return data.voices;
  }

  async getVoicePreviewUrl(voiceId: string): Promise<string> {
    const voices = await this.listVoices();
    const voice = voices.find((v) => v.voice_id === voiceId);
    return voice?.preview_url ?? "";
  }

  async textToSpeech(
    voiceId: string,
    text: string,
    settings?: VoiceSettings,
  ): Promise<ArrayBuffer> {
    const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: settings
          ? {
              stability: settings.stability,
              similarity_boost: settings.similarity_boost,
              speed: settings.speed ?? 1.0,
            }
          : undefined,
      }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`ElevenLabs TTS error: ${res.status} - ${errorText}`);
    }
    return res.arrayBuffer();
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/ai/providers/elevenlabs.ts
git commit -m "feat: add ElevenLabs provider for voice listing and TTS"
```

---

### Task 3.2: Create Voice Server Actions

**Files:**
- Create: `src/lib/voice-actions.ts`

**Step 1: Create voice actions**

```typescript
// src/lib/voice-actions.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { apiKeys, projects, scenes } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { uploadFile } from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { ElevenLabsProvider } from "@/lib/ai/providers/elevenlabs";

async function getElevenLabsProvider(): Promise<ElevenLabsProvider> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, session.user.id), eq(apiKeys.provider, "elevenlabs")))
    .limit(1);

  if (!keyRow) throw new Error("No ElevenLabs API key found. Please add one in Settings → API Keys.");

  const key = decrypt(keyRow.encryptedKey, keyRow.iv);
  return new ElevenLabsProvider(key);
}

export async function listVoices() {
  const provider = await getElevenLabsProvider();
  const voices = await provider.listVoices();
  return voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    category: v.category,
    labels: v.labels,
    previewUrl: v.preview_url,
  }));
}

export async function generateVoiceOver(
  projectId: string,
  sceneId: string,
  voiceId: string,
  text: string,
  settings?: { stability: number; similarityBoost: number; speed: number },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Verify project ownership
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const provider = await getElevenLabsProvider();
  const audioBuffer = await provider.textToSpeech(voiceId, text, settings ? {
    stability: settings.stability,
    similarity_boost: settings.similarityBoost,
    speed: settings.speed,
  } : undefined);

  // Upload to MinIO
  const key = `projects/${projectId}/voice/${sceneId}.mp3`;
  await uploadFile(key, Buffer.from(audioBuffer), "audio/mpeg");

  // Update scene with voice-over URL
  await db
    .update(scenes)
    .set({ voiceOverUrl: key, updatedAt: new Date() })
    .where(eq(scenes.id, sceneId));

  return { success: true, audioKey: key };
}

export async function generateAllVoiceOvers(
  projectId: string,
  voiceId: string,
  settings?: { stability: number; similarityBoost: number; speed: number },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const projectScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(scenes.order);

  const results = [];
  for (const scene of projectScenes) {
    if (!scene.narration) continue;
    const result = await generateVoiceOver(projectId, scene.id, voiceId, scene.narration, settings);
    results.push({ sceneId: scene.id, ...result });
  }

  return results;
}
```

**Step 2: Commit**

```bash
git add src/lib/voice-actions.ts
git commit -m "feat: add voice-over server actions with ElevenLabs integration"
```

---

### Task 3.3: Update Voice-Over Step Component (Real Voices)

**Files:**
- Modify: `src/components/wizard/steps/step-voice-over.tsx` — Replace mock voices with real ElevenLabs API

**Step 1: Rewrite the component to use real voice data**

Replace the hardcoded `VOICES` array and mock generation logic. Key changes:
- Import `listVoices` and `generateVoiceOver` from `@/lib/voice-actions`
- Use `useEffect` to fetch voices on mount
- Replace mock audio preview with real `previewUrl` from ElevenLabs
- Replace mock generation with real `generateVoiceOver` calls
- Add error handling for missing API key (show inline warning)

The component should:
1. On mount: call `listVoices()` — if it fails with "No ElevenLabs API key", show a banner linking to Settings
2. Display real voices in the existing card grid
3. Play preview using the `previewUrl` from ElevenLabs
4. On "Generate All": iterate scenes, call `generateVoiceOver()` per scene, update progress
5. Per-scene audio player uses the returned MinIO URL via `getPresignedUrl()`

**Step 2: Commit**

```bash
git add src/components/wizard/steps/step-voice-over.tsx
git commit -m "feat: connect voice-over step to real ElevenLabs API"
```

---

## Phase 4: Image Generation (NanoBanana 2)

### Task 4.1: Create NanoBanana Provider

**Files:**
- Create: `src/lib/ai/providers/nanobanana.ts`

**Step 1: Create the provider**

Note: The NanoBanana 2 API details need to be confirmed. This is the expected structure based on common image generation APIs:

```typescript
// src/lib/ai/providers/nanobanana.ts

export interface NanoBananaGenerateOptions {
  prompt: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
}

export class NanoBananaProvider {
  private baseUrl: string;

  constructor(
    private apiKey: string,
    baseUrl = "https://api.nanobanana.com/v2",
  ) {
    this.baseUrl = baseUrl;
  }

  async generateImage(options: NanoBananaGenerateOptions): Promise<ArrayBuffer> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio ?? "9:16",
        width: options.width,
        height: options.height,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`NanoBanana API error: ${res.status} - ${errorText}`);
    }

    // API may return image directly or a URL — adapt based on actual docs
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.startsWith("image/")) {
      return res.arrayBuffer();
    }

    // If JSON response with URL
    const data = await res.json();
    if (data.url) {
      const imageRes = await fetch(data.url);
      return imageRes.arrayBuffer();
    }

    throw new Error("Unexpected NanoBanana response format");
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/ai/providers/nanobanana.ts
git commit -m "feat: add NanoBanana 2 provider for image generation"
```

---

### Task 4.2: Create Image Generation Server Actions

**Files:**
- Create: `src/lib/image-actions.ts`

**Step 1: Create image actions**

```typescript
// src/lib/image-actions.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { apiKeys, projects, scenes, sceneImages } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { uploadFile } from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { NanoBananaProvider } from "@/lib/ai/providers/nanobanana";
import { createAIProvider } from "@/lib/ai";

async function getNanoBananaProvider(): Promise<NanoBananaProvider> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, session.user.id), eq(apiKeys.provider, "nanobanana")))
    .limit(1);

  if (!keyRow) throw new Error("No NanoBanana API key found. Please add one in Settings → API Keys.");

  const key = decrypt(keyRow.encryptedKey, keyRow.iv);
  return new NanoBananaProvider(key);
}

export async function generateImagePrompt(
  projectId: string,
  sceneVisual: string,
  sceneNarration: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [project] = await db
    .select({ llmProvider: projects.llmProvider })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const provider = await createAIProvider(project.llmProvider as "anthropic" | "openai" | "gemini");

  const prompt = `Create a detailed image generation prompt for an AI image generator based on this scene:

Visual description: ${sceneVisual}
Narration context: ${sceneNarration}

Write a single, detailed prompt (1-2 sentences) that describes the visual scene. Focus on:
- Specific visual elements, composition, and lighting
- Art style (photorealistic, cinematic, illustration, etc.)
- Mood and atmosphere
- No text, no words, no letters in the image

Respond with ONLY the prompt text, nothing else.`;

  return provider.generateText(prompt, { maxTokens: 200, temperature: 0.7 });
}

export async function generateImage(
  projectId: string,
  sceneId: string,
  prompt: string,
  variantIndex: number,
  aspectRatio: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const nanoBanana = await getNanoBananaProvider();
  const imageBuffer = await nanoBanana.generateImage({ prompt, aspectRatio });

  // Upload to MinIO
  const key = `projects/${projectId}/images/${sceneId}_v${variantIndex}.webp`;
  await uploadFile(key, Buffer.from(imageBuffer), "image/webp");

  // Upsert scene image record
  await db
    .insert(sceneImages)
    .values({
      sceneId,
      variantIndex,
      prompt,
      imageUrl: key,
      status: "completed",
    })
    .onConflictDoUpdate({
      target: [sceneImages.sceneId, sceneImages.variantIndex],
      set: { prompt, imageUrl: key, status: "completed", updatedAt: new Date() },
    });

  return { success: true, imageKey: key };
}
```

**Step 2: Commit**

```bash
git add src/lib/image-actions.ts
git commit -m "feat: add image generation server actions with NanoBanana 2"
```

---

### Task 4.3: Update Image Generation Step Component

**Files:**
- Modify: `src/components/wizard/steps/step-images.tsx` — Connect to real image generation

**Step 1: Update the component**

Key changes:
- Import `generateImage`, `generateImagePrompt` from `@/lib/image-actions`
- Import `getPresignedUrl` for displaying generated images
- Replace gradient placeholders with real image display
- On "Generate": first generate prompt via LLM, then generate image via NanoBanana 2
- Allow editing the prompt before regenerating
- Show real images from MinIO presigned URLs
- Error handling for missing API keys

**Step 2: Commit**

```bash
git add src/components/wizard/steps/step-images.tsx
git commit -m "feat: connect image generation step to NanoBanana 2 API"
```

---

## Phase 5: Video Generation (kie.ai)

### Task 5.1: Create kie.ai Provider

**Files:**
- Create: `src/lib/ai/providers/kie.ts`

**Step 1: Create the provider**

Note: kie.ai API details need confirmation. Structure based on expected image-to-video API:

```typescript
// src/lib/ai/providers/kie.ts

export interface KieModel {
  id: string;
  name: string;
  description: string;
}

export interface KieGenerateOptions {
  imageUrl: string;
  model: string;
  duration?: number;
  prompt?: string;
}

export interface KieJobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  progress?: number;
  error?: string;
}

export class KieProvider {
  private baseUrl: string;

  constructor(
    private apiKey: string,
    baseUrl = "https://api.kie.ai/v1",
  ) {
    this.baseUrl = baseUrl;
  }

  async listModels(): Promise<KieModel[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`kie.ai API error: ${res.status}`);
    const data = await res.json();
    return data.models ?? data;
  }

  async generateVideo(options: KieGenerateOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: options.imageUrl,
        model: options.model,
        duration: options.duration,
        prompt: options.prompt,
      }),
    });
    if (!res.ok) throw new Error(`kie.ai generation error: ${res.status}`);
    const data = await res.json();
    return data.job_id ?? data.id;
  }

  async getJobStatus(jobId: string): Promise<KieJobStatus> {
    const res = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`kie.ai status error: ${res.status}`);
    return res.json();
  }

  async waitForCompletion(jobId: string, maxWaitMs = 300_000): Promise<KieJobStatus> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const status = await this.getJobStatus(jobId);
      if (status.status === "completed" || status.status === "failed") return status;
      await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error("Video generation timed out");
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/ai/providers/kie.ts
git commit -m "feat: add kie.ai provider for video generation"
```

---

### Task 5.2: Create Video Generation Server Actions

**Files:**
- Create: `src/lib/video-actions.ts`

**Step 1: Create video actions with polling support**

```typescript
// src/lib/video-actions.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { apiKeys, projects, scenes, videoClips } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { uploadFile, getPresignedUrl } from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { KieProvider } from "@/lib/ai/providers/kie";

async function getKieProvider(): Promise<KieProvider> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, session.user.id), eq(apiKeys.provider, "kie")))
    .limit(1);

  if (!keyRow) throw new Error("No kie.ai API key found. Please add one in Settings → API Keys.");

  const key = decrypt(keyRow.encryptedKey, keyRow.iv);
  return new KieProvider(key);
}

export async function listKieModels() {
  const provider = await getKieProvider();
  return provider.listModels();
}

export async function generateVideo(
  projectId: string,
  sceneId: string,
  imageKey: string,
  model: string,
  duration?: number,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Get presigned URL for the source image
  const imageUrl = await getPresignedUrl(imageKey, 3600);

  const provider = await getKieProvider();
  const jobId = await provider.generateVideo({
    imageUrl,
    model,
    duration,
  });

  // Poll for completion
  const result = await provider.waitForCompletion(jobId);

  if (result.status === "failed") {
    throw new Error(result.error ?? "Video generation failed");
  }

  if (!result.videoUrl) throw new Error("No video URL in result");

  // Download and upload to MinIO
  const videoRes = await fetch(result.videoUrl);
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
  const key = `projects/${projectId}/video/${sceneId}.mp4`;
  await uploadFile(key, videoBuffer, "video/mp4");

  // Save to DB
  await db
    .insert(videoClips)
    .values({
      sceneId,
      clipIndex: 0,
      videoUrl: key,
      status: "completed",
    })
    .onConflictDoUpdate({
      target: [videoClips.sceneId, videoClips.clipIndex],
      set: { videoUrl: key, status: "completed", updatedAt: new Date() },
    });

  return { success: true, videoKey: key };
}
```

**Step 2: Commit**

```bash
git add src/lib/video-actions.ts
git commit -m "feat: add video generation server actions with kie.ai"
```

---

### Task 5.3: Update Video Generation Step Component

**Files:**
- Modify: `src/components/wizard/steps/step-video.tsx` — Connect to real kie.ai API

**Step 1: Update the component**

Key changes:
- Import `listKieModels`, `generateVideo` from `@/lib/video-actions`
- Add model selection dropdown (fetched from kie.ai API)
- Replace mock generation with real API calls
- Show real video previews from MinIO presigned URLs
- Handle long-running generation with progress polling

**Step 2: Commit**

```bash
git add src/components/wizard/steps/step-video.tsx
git commit -m "feat: connect video generation step to kie.ai API"
```

---

## Phase 6: Navigation & Layout Overhaul

### Task 6.1: Create Sidebar Navigation Component

**Files:**
- Create: `src/components/layout/sidebar.tsx`

**Step 1: Create the sidebar**

```typescript
// src/components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  House,
  FolderOpen,
  GearSix,
  ShieldCheck,
  Plus,
} from "@phosphor-icons/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/projects", label: "Projekte", icon: FolderOpen },
  { href: "/settings", label: "Einstellungen", icon: GearSix },
];

const adminItems = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-surface/50">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="font-heading text-lg font-bold tracking-tight">
          ReelFlow
        </span>
      </div>

      {/* New Project Button */}
      <div className="p-3">
        <Link
          href="/projects/new"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus weight="bold" className="size-4" />
          Neues Projekt
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <item.icon weight={isActive ? "fill" : "regular"} className="size-5" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-border" />
            {adminItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  <item.icon weight={isActive ? "fill" : "regular"} className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add sidebar navigation component"
```

---

### Task 6.2: Update App Layout to Use Sidebar

**Files:**
- Modify: `src/app/(app)/layout.tsx` — Replace TopBar-only layout with sidebar + top-bar

**Step 1: Update the layout**

Replace the current layout with a sidebar + main content structure:

```typescript
// Rough structure:
// <div className="flex h-screen">
//   <Sidebar isAdmin={isAdmin} />
//   <div className="flex flex-1 flex-col overflow-hidden">
//     <TopBar />  (simplified — no logo, just user menu + language switcher)
//     <main className="flex-1 overflow-auto">{children}</main>
//   </div>
// </div>
```

**Step 2: Simplify TopBar** — Remove logo (now in sidebar), keep only user dropdown + language switcher

**Step 3: Commit**

```bash
git add src/app/\(app\)/layout.tsx src/components/layout/top-bar.tsx
git commit -m "feat: update app layout with sidebar navigation"
```

---

## Phase 7: Settings Page — API Keys for All Providers

### Task 7.1: Update Settings API Keys Section

**Files:**
- Modify: `src/components/settings/` — Update API key management to show all required providers

**Step 1: Update the API keys form**

The settings page should display API key inputs for all 6 providers:
- **LLM Providers** (user picks one): Anthropic, OpenAI, Gemini
- **Specialized Providers** (all needed): ElevenLabs, NanoBanana 2, kie.ai

Each provider shows:
- Provider name + icon
- Masked key or "Not configured" status
- Add/Replace key button
- Test key button (calls real `testApiKey()`)
- Delete key button
- Status badge (valid/invalid/untested)

**Step 2: Commit**

```bash
git add src/components/settings/
git commit -m "feat: update settings API keys section for all providers"
```

---

## Phase 8: i18n — Language Switching

### Task 8.1: Fix Language Switching

**Files:**
- Modify: `src/i18n/request.ts` — Use user preference instead of hardcoded "de"
- Modify: `src/components/layout/top-bar.tsx` — Make language switcher functional

**Step 1: Update i18n request to use cookie/preference**

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value ?? "de";

  return {
    locale,
    messages: (await import(`@/i18n/messages/${locale}.json`)).default,
  };
});
```

**Step 2: Create server action for language switching**

```typescript
// Add to settings-actions.ts or create src/lib/locale-actions.ts
export async function setLocale(locale: "de" | "en") {
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
```

**Step 3: Connect language switcher in TopBar to call `setLocale`**

**Step 4: Commit**

```bash
git add src/i18n/request.ts src/lib/locale-actions.ts src/components/layout/top-bar.tsx
git commit -m "feat: implement functional language switching (DE/EN)"
```

---

## Phase 9: Design Refinement

### Task 9.1: Clean Up Color Palette & Design Tokens

**Files:**
- Modify: `src/app/globals.css` — Refine OKLCH tokens for cleaner, less "AI" look

**Step 1: Update design tokens**

Key changes:
- Reduce gradient usage throughout the app
- More neutral base colors, accent only for CTAs
- Remove overly "techy" gradients from cards and backgrounds
- Ensure Light Mode works as default

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: refine color palette for cleaner, modern design"
```

---

### Task 9.2: Clean Up Wizard Step Components

**Files:**
- Modify: All step components in `src/components/wizard/steps/`

**Step 1: Remove excessive gradient placeholders**

Replace gradient-based placeholder elements with clean, minimal skeleton states. Remove unnecessary glow effects and overly decorative elements.

**Step 2: Commit**

```bash
git add src/components/wizard/steps/
git commit -m "style: clean up wizard steps for modern minimal design"
```

---

## Phase 10: Admin Panel

### Task 10.1: Improve Admin Panel

**Files:**
- Modify: `src/app/(app)/admin/page.tsx` (or create if it doesn't exist)

**Step 1: Add functional admin features**

- User list with search/filter
- Activate/deactivate user toggle
- System health checks (DB, Redis, MinIO connectivity)
- Simple feature flags (registration open/closed)

**Step 2: Commit**

```bash
git add src/app/\(app\)/admin/
git commit -m "feat: improve admin panel with user management and health checks"
```

---

## Execution Order Summary

| Phase | Description | Dependencies |
|-------|-------------|-------------|
| 1 | AI Provider Abstraction | None |
| 2 | Real Concept Generation | Phase 1 |
| 3 | ElevenLabs Voice | Phase 1 (factory) |
| 4 | NanoBanana Images | Phase 1 (factory) |
| 5 | kie.ai Video | Phase 4 (needs images) |
| 6 | Navigation & Layout | None (parallel with 1-5) |
| 7 | Settings API Keys UI | Phase 1 (providers exist) |
| 8 | i18n Language Switch | None (parallel) |
| 9 | Design Refinement | Phase 6 (layout done) |
| 10 | Admin Panel | None (parallel) |

**Parallelizable:** Phases 6, 8, 10 can run in parallel with Phases 1-5.

---

## Total Estimated Tasks: ~25 individual tasks across 10 phases
