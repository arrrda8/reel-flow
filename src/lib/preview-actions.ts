"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { projects, scenes, sceneImages, videoClips, voiceOvers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPresignedUrl } from "@/lib/storage";

export interface PreviewScene {
  index: number;
  narration: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  duration: number;
}

export interface PreviewData {
  scenes: PreviewScene[];
  subtitleStyle: Record<string, unknown> | null;
  aspectRatio: string;
  totalDuration: number;
}

export async function loadPreviewData(projectId: string): Promise<PreviewData> {
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

  const previewScenes: PreviewScene[] = [];
  let totalDuration = 0;

  for (const scene of projectScenes) {
    // Get selected image
    const [img] = await db
      .select({ fileUrl: sceneImages.fileUrl })
      .from(sceneImages)
      .where(and(
        eq(sceneImages.sceneId, scene.id),
        eq(sceneImages.isSelected, true),
        eq(sceneImages.status, "completed")
      ))
      .limit(1);

    // Get video clip
    const [video] = await db
      .select({ fileUrl: videoClips.fileUrl })
      .from(videoClips)
      .where(and(
        eq(videoClips.sceneId, scene.id),
        eq(videoClips.status, "completed")
      ))
      .limit(1);

    // Get voice over
    const [voice] = await db
      .select({ fileUrl: voiceOvers.fileUrl })
      .from(voiceOvers)
      .where(and(
        eq(voiceOvers.sceneId, scene.id),
        eq(voiceOvers.status, "completed")
      ))
      .limit(1);

    const duration = scene.estimatedDuration ?? 5;
    totalDuration += duration;

    previewScenes.push({
      index: scene.orderIndex,
      narration: scene.narrationText,
      imageUrl: img?.fileUrl ? await getPresignedUrl(img.fileUrl, 3600) : null,
      videoUrl: video?.fileUrl ? await getPresignedUrl(video.fileUrl, 3600) : null,
      audioUrl: voice?.fileUrl ? await getPresignedUrl(voice.fileUrl, 3600) : null,
      duration,
    });
  }

  return {
    scenes: previewScenes,
    subtitleStyle: project.subtitleStyle as Record<string, unknown> | null,
    aspectRatio: project.aspectRatio || "16:9",
    totalDuration,
  };
}
