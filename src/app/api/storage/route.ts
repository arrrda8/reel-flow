import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Proxy route for MinIO storage access.
 * MinIO runs on an internal Docker network, so presigned URLs
 * use internal hostnames that browsers can't reach.
 * This route proxies the file through the Next.js server.
 *
 * Usage: GET /api/storage?key=projects/xxx/voice/scene.mp3
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  try {
    const { getFileStream } = await import("@/lib/storage");
    const { stream, contentType } = await getFileStream(key);

    return new NextResponse(stream as ReadableStream, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "File not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
