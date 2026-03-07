"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { apiKeys, projects, scenes, voiceOvers } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { uploadFile, getPresignedUrl } from "@/lib/storage";
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

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const provider = await getElevenLabsProvider();
  const audioBuffer = await provider.textToSpeech(
    voiceId,
    text,
    settings
      ? {
          stability: settings.stability,
          similarity_boost: settings.similarityBoost,
          speed: settings.speed,
        }
      : undefined,
  );

  const key = `projects/${projectId}/voice/${sceneId}.mp3`;
  await uploadFile(key, Buffer.from(audioBuffer), "audio/mpeg");

  // Insert or update voiceOver record for this scene
  const [existing] = await db
    .select({ id: voiceOvers.id })
    .from(voiceOvers)
    .where(eq(voiceOvers.sceneId, sceneId))
    .limit(1);

  if (existing) {
    await db
      .update(voiceOvers)
      .set({ fileUrl: key, status: "completed" })
      .where(eq(voiceOvers.id, existing.id));
  } else {
    await db.insert(voiceOvers).values({
      sceneId,
      fileUrl: key,
      status: "completed",
    });
  }

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
    .orderBy(scenes.orderIndex);

  const results = [];
  for (const scene of projectScenes) {
    if (!scene.narrationText) continue;
    const result = await generateVoiceOver(projectId, scene.id, voiceId, scene.narrationText, settings);
    results.push({ sceneId: scene.id, ...result });
  }

  return results;
}

export async function getVoiceOverUrl(audioKey: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  return getPresignedUrl(audioKey, 3600);
}
