import { Queue } from "bullmq";

function getRedisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

function createConnection() {
  const url = new URL(getRedisUrl());
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    maxRetriesPerRequest: null as null,
  };
}

const connection = createConnection();

// ---------------------------------------------------------------------------
// Queues
// ---------------------------------------------------------------------------

export const voiceOverQueue = new Queue("voice-over", { connection });
export const imageGenQueue = new Queue("image-gen", { connection });
export const videoGenQueue = new Queue("video-gen", { connection });
export const researchQueue = new Queue("research", { connection });
export const renderQueue = new Queue("render", { connection });

// ---------------------------------------------------------------------------
// Job data types
// ---------------------------------------------------------------------------

export type VoiceOverJobData = {
  sceneId: string;
  projectId: string;
  userId: string;
  narrationText: string;
  voiceId: string;
  voiceSettings: Record<string, unknown>;
};

export type ImageGenJobData = {
  sceneId: string;
  projectId: string;
  userId: string;
  prompt: string;
  aspectRatio: string;
  variantIndex: number;
};

export type VideoGenJobData = {
  sceneId: string;
  projectId: string;
  userId: string;
  imageUrl: string;
  targetDurationMs: number;
  clipIndex: number;
};

export type ResearchJobData = {
  projectId: string;
  userId: string;
  ideaText: string;
  platform: string;
  targetDuration: number;
  locale: string;
};

export type RenderJobData = {
  projectId: string;
  userId: string;
  quality: string;
  format: string;
  transition: string;
  burnSubtitles: boolean;
};
