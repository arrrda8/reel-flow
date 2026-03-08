import * as Minio from "minio";

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
  expirySeconds = 3600
): Promise<string> {
  return getMinioClient().presignedGetObject(BUCKET, key, expirySeconds);
}

export async function deleteFile(key: string): Promise<void> {
  await getMinioClient().removeObject(BUCKET, key);
}
