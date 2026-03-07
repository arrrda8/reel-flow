import { Job } from "bullmq";
import type { VoiceOverJobData } from "../../lib/queue";

export async function processVoiceOver(job: Job<VoiceOverJobData>) {
  console.log(`[voice-over] Processing job ${job.id}`, job.data);
  // TODO: Implement actual voice over generation
  return { success: true };
}
