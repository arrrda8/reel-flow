import { NextResponse } from "next/server";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

const SECRET = process.env.STORAGE_PUBLIC_SECRET || process.env.AUTH_SECRET || "reelflow-public-storage";

/**
 * Public storage proxy for external services (e.g. kie.ai video generation).
 * Uses HMAC signature to prevent unauthorized access.
 *
 * Usage: GET /api/storage/public?key=...&sig=...&exp=...
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const sig = url.searchParams.get("sig");
  const exp = url.searchParams.get("exp");

  if (!key || !sig || !exp) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Check expiry
  const expiryTs = parseInt(exp, 10);
  if (isNaN(expiryTs) || Date.now() > expiryTs) {
    return NextResponse.json({ error: "URL expired" }, { status: 403 });
  }

  // Verify HMAC signature
  const expectedSig = createHmac("sha256", SECRET)
    .update(`${key}:${exp}`)
    .digest("hex");

  if (sig !== expectedSig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
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
