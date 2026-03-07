import { Job } from "bullmq";
import type { ImageGenJobData } from "../../lib/queue";

export async function processImageGen(job: Job<ImageGenJobData>) {
  console.log(`[image-gen] Processing job ${job.id}`, job.data);
  // TODO: Implement actual image generation
  return { success: true };
}
