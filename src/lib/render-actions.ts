"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { projects, scenes, sceneImages, videoClips, voiceOvers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPresignedUrl } from "@/lib/storage";

/**
 * Start rendering the final video for a project.
 * Downloads all scene assets, concatenates video/images, mixes audio,
 * and uploads the result to MinIO.
 */
export async function startRender(
  projectId: string,
  renderSettings?: {
    resolution?: string;
    fps?: number;
    format?: string;
    quality?: string;
  },
): Promise<{ renderKey: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Verify ownership
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  // Load all scene data ordered by orderIndex
  const projectScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(scenes.orderIndex);

  if (projectScenes.length === 0) {
    throw new Error("No scenes found. Please create scenes first.");
  }

  // Gather render input for each scene
  const renderScenes = [];
  for (const scene of projectScenes) {
    // Get the selected image for this scene
    const [img] = await db
      .select({ fileUrl: sceneImages.fileUrl })
      .from(sceneImages)
      .where(
        and(
          eq(sceneImages.sceneId, scene.id),
          eq(sceneImages.isSelected, true),
          eq(sceneImages.status, "completed"),
        ),
      )
      .limit(1);

    // Get the completed video clip for this scene
    const [video] = await db
      .select({ fileUrl: videoClips.fileUrl })
      .from(videoClips)
      .where(
        and(
          eq(videoClips.sceneId, scene.id),
          eq(videoClips.status, "completed"),
        ),
      )
      .limit(1);

    // Get the completed voice-over for this scene
    const [voice] = await db
      .select({ fileUrl: voiceOvers.fileUrl })
      .from(voiceOvers)
      .where(
        and(
          eq(voiceOvers.sceneId, scene.id),
          eq(voiceOvers.status, "completed"),
        ),
      )
      .limit(1);

    renderScenes.push({
      videoKey: video?.fileUrl || null,
      imageKey: img?.fileUrl || null,
      audioKey: voice?.fileUrl || null,
      duration: scene.estimatedDuration ?? 5,
      narration: scene.narrationText,
    });
  }

  // Merge render settings: client overrides > project DB settings > defaults
  const dbSettings = project.renderSettings as Record<string, unknown> | null;
  const resolution = renderSettings?.resolution
    || (dbSettings?.resolution as string)
    || "1080p";
  const fps = renderSettings?.fps
    || (dbSettings?.fps as number)
    || 30;
  const format = renderSettings?.format
    || (dbSettings?.format as string)
    || "mp4";

  const musicSettings = project.musicSettings as Record<string, unknown> | null;
  const musicVolume = (musicSettings?.volume as number) ?? 80;

  // Dynamically import render logic to avoid loading ffmpeg unnecessarily
  const { renderVideo } = await import("@/lib/ffmpeg-render");

  const renderKey = await renderVideo(projectId, {
    scenes: renderScenes,
    musicTrackUrl: (musicSettings?.trackId as string) || null,
    musicVolume,
    subtitleStyle: project.subtitleStyle as Record<string, unknown> | null,
    resolution,
    fps,
    format: format.toLowerCase(),
    aspectRatio: project.aspectRatio || "16:9",
  });

  // Update project with final video URL and status
  await db
    .update(projects)
    .set({
      finalVideoUrl: renderKey,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  return { renderKey };
}

/**
 * Get a presigned download URL for the rendered video.
 */
export async function getRenderDownloadUrl(
  projectId: string,
  format?: string,
): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Verify ownership
  const [project] = await db
    .select({ id: projects.id, finalVideoUrl: projects.finalVideoUrl })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  // Use stored finalVideoUrl if available, otherwise guess the key
  const ext = (format || "mp4").toLowerCase();
  const key = project.finalVideoUrl || `projects/${projectId}/render/final.${ext}`;

  try {
    return await getPresignedUrl(key, 3600);
  } catch {
    return null;
  }
}
