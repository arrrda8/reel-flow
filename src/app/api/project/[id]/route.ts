import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, session.user.id)),
      with: {
        scenes: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orderBy: (scenes: any, { asc }: any) => [asc(scenes.orderIndex)],
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}
