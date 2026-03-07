import { Job } from "bullmq";
import type { ResearchJobData } from "../../lib/queue";

export async function processResearch(job: Job<ResearchJobData>) {
  console.log(`[research] Processing job ${job.id}`, job.data);
  // TODO: Implement actual research processing
  return { success: true };
}
