import { NextRequest } from "next/server";
import IORedis from "ioredis";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  // Dynamic import to avoid pulling in postgres at build time
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Rate limit: 10 SSE connections per user per minute
  const { success: rateLimitOk } = rateLimit(`sse:${session.user.id}`, 10, 60_000);
  if (!rateLimitOk) {
    return new Response("Too many requests", { status: 429 });
  }

  const { projectId } = await params;

  // Verify project ownership to prevent IDOR
  const { db } = await import("@/db/index");
  const { projects } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id!)))
    .limit(1);

  if (!project) {
    return new Response("Forbidden", { status: 403 });
  }

  const subscriber = new IORedis(
    process.env.REDIS_URL || "redis://localhost:6379"
  );
  const channel = `project:${projectId}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Subscribe to project channel
      subscriber.subscribe(channel).catch((err) => {
        console.error(`[SSE] Failed to subscribe to ${channel}:`, err);
        controller.close();
      });

      subscriber.on("message", (_ch: string, message: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // Keepalive every 30 seconds
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 30_000);

      // Cleanup on abort (client disconnect)
      req.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.quit().catch(() => {});
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
