"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { projects, scenes } from "@/db/schema";
import type { Treatment, ResearchReport } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(500, "Project name is too long"),
  platform: z.enum(["youtube", "shorts", "reels", "tiktok", "custom"], {
    message: "Please select a platform",
  }),
  targetDuration: z.coerce
    .number()
    .min(10, "Duration must be at least 10 seconds")
    .max(7200, "Duration cannot exceed 2 hours"),
  aspectRatio: z
    .string()
    .regex(/^\d+:\d+$/, "Invalid aspect ratio format"),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProjectWithSceneCount = {
  id: string;
  name: string;
  platform: "youtube" | "shorts" | "reels" | "tiktok" | "custom";
  aspectRatio: string;
  targetDuration: number;
  currentStep: number;
  status: "draft" | "in_progress" | "rendering" | "completed";
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  sceneCount: number;
};

export type CreateProjectResult =
  | { success: true; projectId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

// ---------------------------------------------------------------------------
// getProjects - Fetch all projects for the authenticated user
// ---------------------------------------------------------------------------

export async function getProjects(): Promise<ProjectWithSceneCount[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const result = await db
    .select({
      id: projects.id,
      name: projects.name,
      platform: projects.platform,
      aspectRatio: projects.aspectRatio,
      targetDuration: projects.targetDuration,
      currentStep: projects.currentStep,
      status: projects.status,
      thumbnailUrl: projects.thumbnailUrl,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      sceneCount: sql<number>`cast(count(${scenes.id}) as int)`,
    })
    .from(projects)
    .leftJoin(scenes, eq(scenes.projectId, projects.id))
    .where(eq(projects.userId, session.user.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.updatedAt));

  return result;
}

// ---------------------------------------------------------------------------
// createProject - Create a new project
// ---------------------------------------------------------------------------

export async function createProject(
  _prevState: CreateProjectResult | null,
  formData: FormData
): Promise<CreateProjectResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in to create a project" };
  }

  const raw = {
    name: formData.get("name"),
    platform: formData.get("platform"),
    targetDuration: formData.get("targetDuration"),
    aspectRatio: formData.get("aspectRatio"),
  };

  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key && typeof key === "string") {
        fieldErrors[key] = issue.message;
      }
    }
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError, fieldErrors };
  }

  const { name, platform, targetDuration, aspectRatio } = parsed.data;

  try {
    const [newProject] = await db
      .insert(projects)
      .values({
        userId: session.user.id,
        name: name.trim(),
        platform,
        targetDuration,
        aspectRatio,
      })
      .returning({ id: projects.id });

    if (!newProject) {
      return { success: false, error: "Failed to create project" };
    }

    revalidatePath("/dashboard");
    return { success: true, projectId: newProject.id };
  } catch {
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// getProjectById - Fetch a single project with scenes (verifies ownership)
// ---------------------------------------------------------------------------

export type ProjectWithScenes = typeof projects.$inferSelect & {
  scenes: (typeof scenes.$inferSelect)[];
};

export type GetProjectResult =
  | { success: true; project: ProjectWithScenes }
  | { success: false; error: string };

export async function getProjectById(
  id: string
): Promise<GetProjectResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, session.user.id)),
      with: {
        scenes: {
          orderBy: (scenes, { asc }) => [asc(scenes.orderIndex)],
        },
      },
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    return { success: true, project };
  } catch {
    return {
      success: false,
      error: "Failed to fetch project. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// updateProjectStep - Update the current step of a project
// ---------------------------------------------------------------------------

export async function updateProjectStep(
  projectId: string,
  step: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const result = await db
      .update(projects)
      .set({ currentStep: step, updatedAt: new Date() })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.userId, session.user.id)
        )
      )
      .returning({ id: projects.id });

    if (result.length === 0) {
      return { success: false, error: "Project not found" };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to update project step.",
    };
  }
}

// ---------------------------------------------------------------------------
// deleteProject - Delete a project by ID
// ---------------------------------------------------------------------------

export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const result = await db
      .delete(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.userId, session.user.id)
        )
      )
      .returning({ id: projects.id });

    if (result.length === 0) {
      return { success: false, error: "Project not found" };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to delete project. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// updateProjectSettings - Save Step 1 (Project Setup) fields
// ---------------------------------------------------------------------------

const updateSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(500, "Project name is too long"),
  platform: z.enum(["youtube", "shorts", "reels", "tiktok", "custom"], {
    message: "Please select a platform",
  }),
  targetDuration: z.coerce
    .number()
    .min(10, "Duration must be at least 10 seconds")
    .max(7200, "Duration cannot exceed 2 hours"),
  aspectRatio: z
    .string()
    .regex(/^\d+:\d+$/, "Invalid aspect ratio format"),
  stylePresetId: z.string().nullable(),
  llmProvider: z.enum(["elevenlabs", "gemini", "kling", "anthropic", "openai"], {
    message: "Please select a provider",
  }),
  promptReviewEnabled: z.boolean(),
});

export type UpdateSettingsResult =
  | { success: true }
  | { success: false; error: string };

export async function updateProjectSettings(
  projectId: string,
  data: {
    name: string;
    platform: string;
    targetDuration: number;
    aspectRatio: string;
    stylePresetId: string | null;
    llmProvider: string;
    promptReviewEnabled: boolean;
  }
): Promise<UpdateSettingsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  const parsed = updateSettingsSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  const {
    name,
    platform,
    targetDuration,
    aspectRatio,
    stylePresetId,
    llmProvider,
    promptReviewEnabled,
  } = parsed.data;

  try {
    const result = await db
      .update(projects)
      .set({
        name: name.trim(),
        platform,
        targetDuration,
        aspectRatio,
        stylePresetId,
        llmProvider,
        promptReviewEnabled,
        updatedAt: new Date(),
      })
      .where(
        and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
      )
      .returning({ id: projects.id });

    if (result.length === 0) {
      return { success: false, error: "Project not found" };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to save project settings.",
    };
  }
}

// ---------------------------------------------------------------------------
// updateProjectIdea - Save Step 2 idea text
// ---------------------------------------------------------------------------

export async function updateProjectIdea(
  projectId: string,
  ideaText: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const result = await db
      .update(projects)
      .set({ ideaText, updatedAt: new Date() })
      .where(
        and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
      )
      .returning({ id: projects.id });

    if (result.length === 0) {
      return { success: false, error: "Project not found" };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to save idea text.",
    };
  }
}

// ---------------------------------------------------------------------------
// updateProjectTreatment - Save Step 2 treatment & research report
// ---------------------------------------------------------------------------

export async function updateProjectTreatment(
  projectId: string,
  treatment: Treatment,
  researchReport: ResearchReport
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const result = await db
      .update(projects)
      .set({ treatment, researchReport, updatedAt: new Date() })
      .where(
        and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
      )
      .returning({ id: projects.id });

    if (result.length === 0) {
      return { success: false, error: "Project not found" };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to save treatment.",
    };
  }
}

// ---------------------------------------------------------------------------
// saveScenes - Save Step 3 scenes (upsert: delete removed, update existing, insert new)
// ---------------------------------------------------------------------------

const sceneMoodValues = [
  "motivating",
  "informative",
  "dramatic",
  "calm",
  "energetic",
  "melancholic",
  "mysterious",
  "uplifting",
] as const;

const sceneSchema = z.object({
  id: z.string().uuid().optional(), // undefined = new scene
  orderIndex: z.number().int().min(0),
  narrationText: z.string().nullable(),
  visualDescription: z.string().nullable(),
  imagePrompt: z.string().nullable(),
  estimatedDuration: z.number().int().min(1).max(600).nullable(),
  mood: z.enum(sceneMoodValues),
});

export type SaveScenesResult =
  | { success: true }
  | { success: false; error: string };

export async function saveScenes(
  projectId: string,
  incomingScenes: {
    id?: string;
    orderIndex: number;
    narrationText: string | null;
    visualDescription: string | null;
    imagePrompt: string | null;
    estimatedDuration: number | null;
    mood: "motivating" | "informative" | "dramatic" | "calm" | "energetic" | "melancholic" | "mysterious" | "uplifting";
  }[]
): Promise<SaveScenesResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  // Validate each scene
  for (const scene of incomingScenes) {
    const parsed = sceneSchema.safeParse(scene);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid scene data";
      return { success: false, error: firstError };
    }
  }

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  try {
    // Get existing scene IDs for this project
    const existingScenes = await db
      .select({ id: scenes.id })
      .from(scenes)
      .where(eq(scenes.projectId, projectId));

    const existingIds = new Set(existingScenes.map((s) => s.id));
    const incomingIds = new Set(
      incomingScenes.filter((s) => s.id).map((s) => s.id!)
    );

    // Determine which scenes to delete (exist in DB but not in incoming)
    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

    // Delete removed scenes
    for (const id of toDelete) {
      await db.delete(scenes).where(eq(scenes.id, id));
    }

    // Upsert scenes
    for (const scene of incomingScenes) {
      const now = new Date();
      if (scene.id && existingIds.has(scene.id)) {
        // Update existing
        await db
          .update(scenes)
          .set({
            orderIndex: scene.orderIndex,
            narrationText: scene.narrationText,
            visualDescription: scene.visualDescription,
            imagePrompt: scene.imagePrompt,
            estimatedDuration: scene.estimatedDuration,
            mood: scene.mood,
            updatedAt: now,
          })
          .where(eq(scenes.id, scene.id));
      } else {
        // Insert new
        await db.insert(scenes).values({
          projectId,
          orderIndex: scene.orderIndex,
          narrationText: scene.narrationText,
          visualDescription: scene.visualDescription,
          imagePrompt: scene.imagePrompt,
          estimatedDuration: scene.estimatedDuration,
          mood: scene.mood,
        });
      }
    }

    // Update project timestamp
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to save scenes. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// generateConcept - Mock AI concept generation (Step 2)
// ---------------------------------------------------------------------------

export type GenerateConceptResult =
  | {
      success: true;
      treatment: Treatment;
      researchReport: ResearchReport;
    }
  | { success: false; error: string };

export async function generateConcept(
  projectId: string,
  ideaText: string,
  platform: string,
  targetDuration: number,
  _locale?: string
): Promise<GenerateConceptResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  if (!ideaText.trim()) {
    return { success: false, error: "Please enter a video idea first" };
  }

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  // --- Mock AI generation ---
  // In the future, this will call the actual AI provider (Anthropic, OpenAI, etc.)
  // For now, we generate realistic mock data based on the idea text.

  const ideaTrimmed = ideaText.trim();
  const shortIdea =
    ideaTrimmed.length > 80
      ? ideaTrimmed.substring(0, 80) + "..."
      : ideaTrimmed;

  // Determine number of scenes based on target duration
  let sceneCount = 3;
  if (targetDuration <= 30) {
    sceneCount = 3;
  } else if (targetDuration <= 60) {
    sceneCount = 4;
  } else if (targetDuration <= 120) {
    sceneCount = 5;
  } else if (targetDuration <= 300) {
    sceneCount = 7;
  } else {
    sceneCount = 10;
  }

  // Platform-specific CTA
  const platformCtas: Record<string, string> = {
    youtube: "Like, subscribe, and hit the notification bell for more content like this!",
    shorts: "Follow for more quick tips! Drop a comment below.",
    reels: "Save this for later and share with someone who needs to see this!",
    tiktok: "Follow for Part 2! Comment what you want to see next.",
    custom: "Thanks for watching! Stay tuned for more.",
  };

  // Generate mock scenes
  const mockScenes: { narration: string; visual: string }[] = [];

  const sceneTemplates = [
    {
      narration: `Did you know that ${shortIdea.toLowerCase()} is one of the most searched topics right now? Let me break it down for you.`,
      visual: "Dynamic text animation with topic keywords flying in, dark gradient background with glowing accents.",
    },
    {
      narration: `The first thing you need to understand is the core concept. This is what separates those who succeed from those who don't.`,
      visual: "Split-screen comparison showing before and after, clean minimal design with iconography.",
    },
    {
      narration: `Here's what the research shows -- and this surprised even me when I first discovered it.`,
      visual: "Animated statistics and data points appearing on screen, infographic style with charts.",
    },
    {
      narration: `Now let's look at a real-world example that puts everything into perspective.`,
      visual: "Case study imagery with highlighted quotes, documentary-style footage overlay.",
    },
    {
      narration: `The key takeaway here is simple but powerful: small consistent actions lead to extraordinary results.`,
      visual: "Progress timeline animation showing growth, motivational imagery with warm tones.",
    },
    {
      narration: `But wait -- there's a common mistake that almost everyone makes when starting out.`,
      visual: "Red warning icon with cautionary text, dramatic lighting shift to emphasize the point.",
    },
    {
      narration: `Experts in the field recommend this approach because it has been proven time and time again.`,
      visual: "Expert quote cards with professional headshots, trust indicators and credentials displayed.",
    },
    {
      narration: `Let me share the step-by-step process that you can start implementing today.`,
      visual: "Numbered step list appearing one by one, clean instructional layout with checkmarks.",
    },
    {
      narration: `The results speak for themselves. People who apply this method see improvements within weeks.`,
      visual: "Before and after transformation visuals, success metrics displayed with upward trending graphs.",
    },
    {
      narration: `So what are you waiting for? The best time to start is right now.`,
      visual: "Call-to-action screen with bold typography, energetic colors and subscribe/follow buttons.",
    },
  ];

  for (let i = 0; i < sceneCount; i++) {
    mockScenes.push(sceneTemplates[i % sceneTemplates.length]);
  }

  const researchReport: ResearchReport = {
    topic: ideaTrimmed,
    keyPoints: [
      `${shortIdea} is trending across social media with growing audience interest`,
      "Research shows that visual storytelling increases engagement by up to 65%",
      `The target demographic for ${platform} responds best to concise, value-driven content`,
      "Hook-driven intros increase viewer retention by 40% in the first 5 seconds",
      "Including actionable takeaways improves share rates significantly",
    ],
    sources: [
      "Social Media Trends Report 2025",
      "Content Marketing Institute Research",
      "Platform Creator Analytics Dashboard",
    ],
    summary: `This concept explores "${shortIdea}" through a ${sceneCount}-scene structure optimized for ${platform}. The content is designed to hook viewers immediately, deliver value through a clear narrative arc, and end with a strong call-to-action. The estimated runtime of ${targetDuration} seconds allows for a balanced pace that maintains engagement throughout.`,
  };

  const treatment: Treatment = {
    title: ideaTrimmed.length > 100 ? ideaTrimmed.substring(0, 100) : ideaTrimmed,
    hook: `Stop scrolling -- this will change the way you think about ${shortIdea.toLowerCase()}.`,
    scenes: mockScenes,
    cta: platformCtas[platform] ?? platformCtas.custom,
  };

  // Save to database
  try {
    await db
      .update(projects)
      .set({
        ideaText: ideaTrimmed,
        treatment,
        researchReport,
        updatedAt: new Date(),
      })
      .where(
        and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
      );
  } catch {
    return {
      success: false,
      error: "Failed to save generated concept.",
    };
  }

  return { success: true, treatment, researchReport };
}
