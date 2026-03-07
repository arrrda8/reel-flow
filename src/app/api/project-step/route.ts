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

  const { projectId, step } = await request.json();

  if (!projectId || typeof step !== "number") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const result = await db
      .update(projects)
      .set({ currentStep: step, updatedAt: new Date() })
      .where(
        and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
      )
      .returning({ id: projects.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
