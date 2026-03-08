import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — rendering can take a while

// Registry of allowed actions — maps action names to their module+function
// This ensures only explicitly registered functions can be called
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTION_REGISTRY: Record<string, () => Promise<{ fn: (...args: any[]) => any }>> = {
  // voice-actions
  listVoices: async () => ({
    fn: (await import("@/lib/voice-actions")).listVoices,
  }),
  generateVoiceOver: async () => ({
    fn: (await import("@/lib/voice-actions")).generateVoiceOver,
  }),
  generateAllVoiceOvers: async () => ({
    fn: (await import("@/lib/voice-actions")).generateAllVoiceOvers,
  }),
  getVoiceOverUrl: async () => ({
    fn: (await import("@/lib/voice-actions")).getVoiceOverUrl,
  }),
  loadExistingVoiceOvers: async () => ({
    fn: (await import("@/lib/voice-actions")).loadExistingVoiceOvers,
  }),

  // image-actions
  generateImagePrompt: async () => ({
    fn: (await import("@/lib/image-actions")).generateImagePrompt,
  }),
  generateImage: async () => ({
    fn: (await import("@/lib/image-actions")).generateImage,
  }),
  getImageUrl: async () => ({
    fn: (await import("@/lib/image-actions")).getImageUrl,
  }),
  loadSceneImages: async () => ({
    fn: (await import("@/lib/image-actions")).loadSceneImages,
  }),
  selectImageVariant: async () => ({
    fn: (await import("@/lib/image-actions")).selectImageVariant,
  }),

  // video-actions
  listKieModels: async () => ({
    fn: (await import("@/lib/video-actions")).listKieModels,
  }),
  generateVideo: async () => ({
    fn: (await import("@/lib/video-actions")).generateVideo,
  }),
  getSceneImageKeys: async () => ({
    fn: (await import("@/lib/video-actions")).getSceneImageKeys,
  }),
  getVideoPresignedUrl: async () => ({
    fn: (await import("@/lib/video-actions")).getVideoPresignedUrl,
  }),
  checkKieApiKey: async () => ({
    fn: (await import("@/lib/video-actions")).checkKieApiKey,
  }),
  loadExistingVideos: async () => ({
    fn: (await import("@/lib/video-actions")).loadExistingVideos,
  }),

  // project-actions
  updateProjectSettings: async () => ({
    fn: (await import("@/lib/project-actions")).updateProjectSettings,
  }),
  saveScenes: async () => ({
    fn: (await import("@/lib/project-actions")).saveScenes,
  }),

  // preview-actions
  loadPreviewData: async () => ({
    fn: (await import("@/lib/preview-actions")).loadPreviewData,
  }),

  // render-actions
  startRender: async () => ({
    fn: (await import("@/lib/render-actions")).startRender,
  }),
  getRenderDownloadUrl: async () => ({
    fn: (await import("@/lib/render-actions")).getRenderDownloadUrl,
  }),
};

export async function POST(request: Request) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, args } = body as { action: string; args: unknown[] };

  if (!action || !ACTION_REGISTRY[action]) {
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  }

  try {
    const { fn } = await ACTION_REGISTRY[action]();
    const result = await fn(...(args || []));
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
