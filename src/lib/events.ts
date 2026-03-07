import IORedis from "ioredis";

const publisher = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

export type ProjectEvent = {
  type: "job-progress" | "job-completed" | "job-failed" | "research-update";
  jobType: string;
  jobId: string;
  sceneId?: string;
  progress?: number;
  data?: Record<string, unknown>;
  error?: string;
};

export async function publishEvent(projectId: string, event: ProjectEvent) {
  await publisher.publish(`project:${projectId}`, JSON.stringify(event));
}
