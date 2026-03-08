import * as Minio from "minio";
import { createHmac } from "crypto";

let _minioClient: Minio.Client | null = null;

function getMinioClient(): Minio.Client {
  if (!_minioClient) {
    const endpoint = process.env.MINIO_ENDPOINT;
    if (!endpoint) {
      throw new Error(
        "MINIO_ENDPOINT is not configured. Please set MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY environment variables."
      );
    }
    _minioClient = new Minio.Client({
      endPoint: endpoint,
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });
  }
  return _minioClient;
}

const BUCKET = process.env.MINIO_BUCKET || "reelflow-assets";

export async function ensureBucket() {
  const exists = await getMinioClient().bucketExists(BUCKET);
  if (!exists) {
    await getMinioClient().makeBucket(BUCKET);
  }
}

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error(`File type not allowed: ${contentType}`);
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${buffer.length} bytes (max ${MAX_FILE_SIZE})`);
  }
  await ensureBucket();
  await getMinioClient().putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return key;
}

export async function getPresignedUrl(
  key: string,
  _expirySeconds = 3600
): Promise<string> {
  // Return a proxy URL instead of a MinIO presigned URL.
  // MinIO runs on an internal Docker network, so presigned URLs
  // use internal hostnames that browsers can't reach.
  return `/api/storage?key=${encodeURIComponent(key)}`;
}

/**
 * Generate a publicly accessible signed URL for external services (e.g. kie.ai).
 * Uses HMAC signature with expiry for security.
 */
export function getPublicFileUrl(key: string, expirySeconds = 3600): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  const secret = process.env.STORAGE_PUBLIC_SECRET || process.env.AUTH_SECRET || "reelflow-public-storage";
  const exp = String(Date.now() + expirySeconds * 1000);
  const sig = createHmac("sha256", secret)
    .update(`${key}:${exp}`)
    .digest("hex");

  // Key is embedded in URL path so external services can detect file type from extension
  // e.g. /api/storage/public/projects/xxx/images/scene_v0.png?sig=...&exp=...
  return `${baseUrl}/api/storage/public/${key}?sig=${sig}&exp=${exp}`;
}

export async function deleteFile(key: string): Promise<void> {
  await getMinioClient().removeObject(BUCKET, key);
}

/**
 * Get a readable stream for a file, with content type detection.
 * Used by the /api/storage proxy route to serve files to the browser.
 */
export async function getFileStream(
  key: string
): Promise<{ stream: ReadableStream; contentType: string }> {
  const stat = await getMinioClient().statObject(BUCKET, key);
  const nodeStream = await getMinioClient().getObject(BUCKET, key);

  // Convert Node.js Readable to Web ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err: Error) => {
        controller.error(err);
      });
    },
  });

  const contentType = stat.metaData?.["content-type"] || guessContentType(key);
  return { stream, contentType };
}

function guessContentType(key: string): string {
  if (key.endsWith(".mp3")) return "audio/mpeg";
  if (key.endsWith(".wav")) return "audio/wav";
  if (key.endsWith(".ogg")) return "audio/ogg";
  if (key.endsWith(".mp4")) return "video/mp4";
  if (key.endsWith(".webm")) return "video/webm";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}
