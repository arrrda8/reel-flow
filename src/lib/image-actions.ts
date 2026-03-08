"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { apiKeys, projects, scenes, sceneImages } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { uploadFile, getPresignedUrl } from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { NanoBananaProvider } from "@/lib/ai/providers/nanobanana";
import { createAIProviderForUser } from "@/lib/ai";

async function getNanoBananaProvider(): Promise<NanoBananaProvider> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.userId, session.user.id), eq(apiKeys.provider, "nanobanana"))
    )
    .limit(1);

  if (!keyRow)
    throw new Error(
      "No NanoBanana API key found. Please add one in Settings -> API Keys."
    );

  const key = decrypt(keyRow.encryptedKey, keyRow.iv);
  return new NanoBananaProvider(key);
}

export async function generateImagePrompt(
  projectId: string,
  sceneVisual: string,
  sceneNarration: string
): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [project] = await db
    .select({ llmProvider: projects.llmProvider })
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
    )
    .limit(1);
  if (!project) throw new Error("Project not found");

  const providerType = (project.llmProvider ?? "anthropic") as
    | "anthropic"
    | "openai"
    | "gemini";
  const provider = await createAIProviderForUser(
    session.user.id,
    providerType
  );

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
  aspectRatio: string
): Promise<{ success: true; imageKey: string; imageId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Verify project ownership
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
    )
    .limit(1);
  if (!project) throw new Error("Project not found");

  // Verify scene belongs to project
  const [scene] = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(and(eq(scenes.id, sceneId), eq(scenes.projectId, projectId)))
    .limit(1);
  if (!scene) throw new Error("Scene not found");

  const nanoBanana = await getNanoBananaProvider();
  const imageBuffer = await nanoBanana.generateImage({ prompt, aspectRatio });

  const key = `projects/${projectId}/images/${sceneId}_v${variantIndex}.png`;
  await uploadFile(key, Buffer.from(imageBuffer), "image/png");

  // Save to sceneImages table
  const [inserted] = await db
    .insert(sceneImages)
    .values({
      sceneId,
      fileUrl: key,
      variantIndex,
      isSelected: variantIndex === 0,
      promptUsed: prompt,
      status: "completed",
    })
    .returning({ id: sceneImages.id });

  return { success: true, imageKey: key, imageId: inserted.id };
}

/** Get a presigned URL for a stored image key. */
export async function getImageUrl(imageKey: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return getPresignedUrl(imageKey, 3600);
}

/** Existing image variant data returned to the client. */
export interface SceneImageData {
  id: string;
  sceneId: string;
  variantIndex: number;
  fileUrl: string | null;
  isSelected: boolean;
  promptUsed: string | null;
  presignedUrl: string | null;
}

/** Load all existing scene images for a project (with presigned URLs). */
export async function loadSceneImages(
  projectId: string
): Promise<SceneImageData[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Verify project ownership
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
    )
    .limit(1);
  if (!project) throw new Error("Project not found");

  // Get all scenes for this project
  const projectScenes = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(eq(scenes.projectId, projectId));

  if (projectScenes.length === 0) return [];

  const sceneIds = projectScenes.map((s) => s.id);

  // Get all images for these scenes
  const images = await db
    .select()
    .from(sceneImages)
    .where(
      and(
        eq(sceneImages.status, "completed"),
      )
    );

  // Filter to only images belonging to our scenes
  const projectImages = images.filter((img) => sceneIds.includes(img.sceneId));

  // Generate presigned URLs
  const result: SceneImageData[] = await Promise.all(
    projectImages.map(async (img) => ({
      id: img.id,
      sceneId: img.sceneId,
      variantIndex: img.variantIndex,
      fileUrl: img.fileUrl,
      isSelected: img.isSelected,
      promptUsed: img.promptUsed,
      presignedUrl: img.fileUrl ? await getPresignedUrl(img.fileUrl, 3600) : null,
    }))
  );

  return result;
}

/** Update the selected variant for a scene (deselect others, select the given one). */
export async function selectImageVariant(
  sceneId: string,
  variantIndex: number
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Deselect all variants for this scene
  await db
    .update(sceneImages)
    .set({ isSelected: false })
    .where(eq(sceneImages.sceneId, sceneId));

  // Select the chosen variant
  await db
    .update(sceneImages)
    .set({ isSelected: true })
    .where(
      and(
        eq(sceneImages.sceneId, sceneId),
        eq(sceneImages.variantIndex, variantIndex)
      )
    );
}
