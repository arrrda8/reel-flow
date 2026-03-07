import { Job } from "bullmq";
import type { RenderJobData } from "../../lib/queue";

export async function processRender(job: Job<RenderJobData>) {
  console.log(`[render] Processing job ${job.id}`, job.data);
  // TODO: Implement actual video rendering
  return { success: true };
}
