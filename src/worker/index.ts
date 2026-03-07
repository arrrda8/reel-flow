import { Worker } from "bullmq";
import { processVoiceOver } from "./processors/voice-over";
import { processImageGen } from "./processors/image-gen";
import { processVideoGen } from "./processors/video-gen";
import { processResearch } from "./processors/research";
import { processRender } from "./processors/render";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const parsedUrl = new URL(redisUrl);

const connection = {
  host: parsedUrl.hostname,
  port: parseInt(parsedUrl.port || "6379"),
  maxRetriesPerRequest: null as null,
};

console.log("[worker] Starting BullMQ workers...");

const voiceOverWorker = new Worker("voice-over", processVoiceOver, {
  connection,
});
const imageGenWorker = new Worker("image-gen", processImageGen, {
  connection,
});
const videoGenWorker = new Worker("video-gen", processVideoGen, {
  connection,
});
const researchWorker = new Worker("research", processResearch, { connection });
const renderWorker = new Worker("render", processRender, { connection });

const workers = [
  voiceOverWorker,
  imageGenWorker,
  videoGenWorker,
  researchWorker,
  renderWorker,
];

for (const worker of workers) {
  worker.on("completed", (job) => {
    console.log(`[${worker.name}] Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[${worker.name}] Job ${job?.id} failed:`, err.message);
  });
}

console.log("[worker] All workers started successfully");

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  console.log(`[worker] Received ${signal}, shutting down gracefully...`);
  await Promise.all(workers.map((w) => w.close()));
  console.log("[worker] All workers closed");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
