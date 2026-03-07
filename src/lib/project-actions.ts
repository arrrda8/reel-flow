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
// generateConcept - AI concept generation (Step 2)
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
  duration: number,
  locale: string,
): Promise<GenerateConceptResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  if (!ideaText.trim()) {
    return { success: false, error: "Please enter a video idea first" };
  }

  try {
    const [project] = await db
      .select({ llmProvider: projects.llmProvider })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
      .limit(1);

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    const { createAIProviderForUser } = await import("@/lib/ai");
    const { getResearchPrompt, getConceptPrompt } = await import("@/lib/ai/prompts/concept");

    const providerType = (project.llmProvider ?? "anthropic") as "anthropic" | "openai" | "gemini";
    const provider = await createAIProviderForUser(session.user.id, providerType);

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

    return { success: true, treatment, researchReport };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate concept.";
    return { success: false, error: message };
  }
}
