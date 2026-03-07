export interface KieModel {
  id: string;
  name: string;
  description: string;
}

export interface KieGenerateOptions {
  imageUrl: string;
  model: string;
  duration?: number;
  prompt?: string;
}

export interface KieJobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  progress?: number;
  error?: string;
}

export class KieProvider {
  private baseUrl: string;

  constructor(
    private apiKey: string,
    baseUrl = "https://api.kie.ai/v1",
  ) {
    this.baseUrl = baseUrl;
  }

  async listModels(): Promise<KieModel[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`kie.ai API error: ${res.status}`);
    const data = await res.json();
    return data.models ?? data;
  }

  async generateVideo(options: KieGenerateOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: options.imageUrl,
        model: options.model,
        duration: options.duration,
        prompt: options.prompt,
      }),
    });
    if (!res.ok) throw new Error(`kie.ai generation error: ${res.status}`);
    const data = await res.json();
    return data.job_id ?? data.id;
  }

  async getJobStatus(jobId: string): Promise<KieJobStatus> {
    const res = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`kie.ai status error: ${res.status}`);
    return res.json();
  }

  async waitForCompletion(jobId: string, maxWaitMs = 300_000): Promise<KieJobStatus> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const status = await this.getJobStatus(jobId);
      if (status.status === "completed" || status.status === "failed") return status;
      await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error("Video generation timed out");
  }
}
