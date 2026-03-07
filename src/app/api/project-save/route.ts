import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, ...fields } = body;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  try {
    // Only allow known safe fields
    const allowedFields: Record<string, unknown> = {};
    const safeKeys = [
      "ideaText",
      "treatment",
      "researchReport",
    ];

    for (const key of safeKeys) {
      if (key in fields) {
        allowedFields[key] = fields[key];
      }
    }

    allowedFields.updatedAt = new Date();

    const result = await db
      .update(projects)
      .set(allowedFields)
      .where(
        and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
      )
      .returning({ id: projects.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save project data" },
      { status: 500 }
    );
  }
}
