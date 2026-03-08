"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { apiKeys, projects, scenes, videoClips, sceneImages } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { uploadFile, getPresignedUrl } from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { KieProvider, KIE_MODELS } from "@/lib/ai/providers/kie";
import type { KieModel } from "@/lib/ai/providers/kie";

async function getKieProvider(): Promise<KieProvider> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.userId, session.user.id), eq(apiKeys.provider, "kie"))
    )
    .limit(1);

  if (!keyRow)
    throw new Error(
      "No kie.ai API key found. Please add one in Settings -> API Keys."
    );

  const key = decrypt(keyRow.encryptedKey, keyRow.iv);
  return new KieProvider(key);
}

export async function listKieModels(): Promise<KieModel[]> {
  // Models are hardcoded — just verify the user has an API key
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [keyRow] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(
      and(eq(apiKeys.userId, session.user.id), eq(apiKeys.provider, "kie"))
    )
    .limit(1);

  if (!keyRow) return [];

  return KIE_MODELS;
}

export async function generateVideo(
  projectId: string,
  sceneId: string,
  imageKey: string,
  model: string,
  duration?: number
): Promise<{ success: true; videoKey: string; videoId: string }> {
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

  // Get a presigned URL for the source image
  const imageUrl = await getPresignedUrl(imageKey, 3600);

  const provider = await getKieProvider();
  const taskId = await provider.generateVideo({
    imageUrl,
    model,
    duration,
  });

  const result = await provider.waitForCompletion(taskId);

  if (!result.videoUrl) throw new Error("No video URL in result");

  // Download and store the video
  const videoRes = await fetch(result.videoUrl);
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
  const key = `projects/${projectId}/video/${sceneId}.mp4`;
  await uploadFile(key, videoBuffer, "video/mp4");

  // Save to videoClips table
  const [inserted] = await db
    .insert(videoClips)
    .values({
      sceneId,
      fileUrl: key,
      clipIndex: 0,
      durationMs: duration ? duration * 1000 : undefined,
      status: "completed",
    })
    .returning({ id: videoClips.id });

  return { success: true, videoKey: key, videoId: inserted.id };
}

// ---------------------------------------------------------------------------
// getSceneImageKeys – fetch selected image key per scene for a project
// ---------------------------------------------------------------------------

export interface SceneImageInfo {
  sceneId: string;
  imageKey: string | null;
}

export async function getSceneImageKeys(
  projectId: string
): Promise<SceneImageInfo[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Verify ownership
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
    )
    .limit(1);
  if (!project) throw new Error("Project not found");

  // Get all scenes for the project
  const projectScenes = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(eq(scenes.projectId, projectId));

  const result: SceneImageInfo[] = [];

  for (const scene of projectScenes) {
    // Get the selected image (or first completed one)
    const [img] = await db
      .select({ fileUrl: sceneImages.fileUrl })
      .from(sceneImages)
      .where(
        and(
          eq(sceneImages.sceneId, scene.id),
          eq(sceneImages.isSelected, true),
          eq(sceneImages.status, "completed")
        )
      )
      .limit(1);

    result.push({
      sceneId: scene.id,
      imageKey: img?.fileUrl ?? null,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// getVideoPresignedUrl – get a presigned URL for a video stored in MinIO
// ---------------------------------------------------------------------------

export async function getVideoPresignedUrl(
  videoKey: string
): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  return getPresignedUrl(videoKey, 3600);
}

// ---------------------------------------------------------------------------
// checkKieApiKey – check if user has a kie.ai API key configured
// ---------------------------------------------------------------------------

export async function checkKieApiKey(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const [keyRow] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(
      and(eq(apiKeys.userId, session.user.id), eq(apiKeys.provider, "kie"))
    )
    .limit(1);

  return !!keyRow;
}
