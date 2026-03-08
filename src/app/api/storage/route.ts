import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Proxy route for MinIO storage access.
 * MinIO runs on an internal Docker network, so presigned URLs
 * use internal hostnames that browsers can't reach.
 * This route proxies the file through the Next.js server.
 *
 * Supports HTTP Range requests for video/audio streaming.
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

    // Parse Range header for video/audio streaming
    const rangeHeader = request.headers.get("range");
    let range: { start: number; end?: number } | undefined;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        range = {
          start: parseInt(match[1], 10),
          end: match[2] ? parseInt(match[2], 10) : undefined,
        };
      }
    }

    const result = await getFileStream(key, range);

    if (result.range) {
      // 206 Partial Content for range requests
      return new NextResponse(result.stream as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": result.contentType || "application/octet-stream",
          "Content-Length": String(result.range.end - result.range.start + 1),
          "Content-Range": `bytes ${result.range.start}-${result.range.end}/${result.size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // Full response
    return new NextResponse(result.stream as ReadableStream, {
      headers: {
        "Content-Type": result.contentType || "application/octet-stream",
        "Content-Length": String(result.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "File not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
