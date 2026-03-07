import { Job } from "bullmq";
import type { VideoGenJobData } from "../../lib/queue";

export async function processVideoGen(job: Job<VideoGenJobData>) {
  console.log(`[video-gen] Processing job ${job.id}`, job.data);
  // TODO: Implement actual video generation
  return { success: true };
}
