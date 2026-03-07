import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { projects } from "@/db/schema";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(500),
  platform: z.enum(["youtube", "shorts", "reels", "tiktok", "custom"]),
  targetDuration: z.coerce.number().int().min(10).max(600),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key && typeof key === "string") {
        fieldErrors[key] = issue.message;
      }
    }
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input", fieldErrors },
      { status: 400 }
    );
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
      return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }

    return NextResponse.json({ success: true, projectId: newProject.id });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
