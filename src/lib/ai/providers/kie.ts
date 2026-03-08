const KIE_BASE = "https://api.kie.ai/api/v1";

export interface KieModel {
  id: string;
  name: string;
  description: string;
}

/** Hardcoded list of available video generation models on kie.ai */
export const KIE_MODELS: KieModel[] = [
  {
    id: "runway",
    name: "Runway Gen-4",
    description: "Image-to-video, 5-10s, up to 1080p",
  },
  {
    id: "veo3",
    name: "Veo 3.1",
    description: "Image-to-video, high quality, 16:9",
  },
];

export interface KieGenerateOptions {
  imageUrl: string;
  model: string;
  duration?: number;
  prompt?: string;
  aspectRatio?: string;
  quality?: string;
}

export interface KieTaskStatus {
  taskId: string;
  state: "waiting" | "queuing" | "generating" | "success" | "fail";
  resultJson?: string;
  failMsg?: string;
  progress?: number;
}

export class KieProvider {
  constructor(private apiKey: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  listModels(): KieModel[] {
    return KIE_MODELS;
  }

  async generateVideo(options: KieGenerateOptions): Promise<string> {
    // Select endpoint based on model
    const endpoint =
      options.model === "veo3"
        ? `${KIE_BASE}/veo/generate`
        : `${KIE_BASE}/runway/generate`;

    const body: Record<string, unknown> = {
      prompt: options.prompt || "Animate this image with natural motion",
      imageUrl: options.imageUrl,
      duration: options.duration ?? 5,
      callBackUrl: "https://example.com/noop",
    };

    if (options.model !== "veo3") {
      // Runway-specific params
      body.quality = options.quality || "720p";
      body.aspectRatio = options.aspectRatio || "16:9";
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`kie.ai generation error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();

    if (data.code !== 200) {
      throw new Error(data.msg || `kie.ai error code: ${data.code}`);
    }

    return data.data?.taskId;
  }

  async getTaskStatus(taskId: string): Promise<KieTaskStatus> {
    const res = await fetch(
      `${KIE_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: this.headers() }
    );

    if (!res.ok) {
      throw new Error(`kie.ai status error: ${res.status}`);
    }

    const data = await res.json();
    return data.data;
  }

  async waitForCompletion(
    taskId: string,
    maxWaitMs = 300_000
  ): Promise<{ videoUrl: string }> {
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      const status = await this.getTaskStatus(taskId);

      if (status.state === "success") {
        // Parse resultJson to get video URL
        if (status.resultJson) {
          try {
            const result = JSON.parse(status.resultJson);
            const url = result.url || result.videoUrl || result.output;
            if (url) return { videoUrl: url };
          } catch {
            // Try treating resultJson as direct URL
            if (status.resultJson.startsWith("http")) {
              return { videoUrl: status.resultJson };
            }
          }
        }
        throw new Error("Video completed but no URL found in result");
      }

      if (status.state === "fail") {
        throw new Error(status.failMsg || "Video generation failed");
      }

      // Poll every 5 seconds
      await new Promise((r) => setTimeout(r, 5000));
    }

    throw new Error("Video generation timed out after 5 minutes");
  }
}
