import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, ideaText, platform, duration, locale } = body;

  if (!projectId || !ideaText?.trim()) {
    return NextResponse.json(
      { error: "Project ID and idea text are required" },
      { status: 400 }
    );
  }

  try {
    const [project] = await db
      .select({ llmProvider: projects.llmProvider })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { createAIProviderForUser } = await import("@/lib/ai");
    const { getResearchPrompt, getConceptPrompt } = await import(
      "@/lib/ai/prompts/concept"
    );

    const providerType = (project.llmProvider ?? "anthropic") as
      | "anthropic"
      | "openai"
      | "gemini";
    const provider = await createAIProviderForUser(session.user.id, providerType);

    // Step 1: Research
    const researchSchema = z.object({
      topic: z.string(),
      keyPoints: z.array(z.string()),
      sources: z.array(z.string()),
      summary: z.string(),
    });

    const researchPrompt = getResearchPrompt(ideaText, platform, locale);
    const researchReport = await provider.generateStructured(
      researchPrompt,
      researchSchema
    );

    // Step 2: Concept/Treatment
    const treatmentSchema = z.object({
      title: z.string(),
      hook: z.string(),
      scenes: z.array(
        z.object({
          narration: z.string(),
          visual: z.string(),
        })
      ),
      cta: z.string(),
    });

    const conceptPrompt = getConceptPrompt(
      ideaText,
      platform,
      duration,
      locale,
      researchReport.summary
    );
    const treatment = await provider.generateStructured(
      conceptPrompt,
      treatmentSchema
    );

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

    return NextResponse.json({ success: true, treatment, researchReport });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate concept.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
