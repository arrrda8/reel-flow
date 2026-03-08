const KIE_BASE = "https://api.kie.ai/api/v1";

export interface KieModel {
  id: string;
  name: string;
  description: string;
}

/** Available video generation models on kie.ai */
export const KIE_MODELS: KieModel[] = [
  {
    id: "kling-3.0",
    name: "Kling 3.0",
    description: "Latest Kling model, 3-15s, multi-shot, native audio",
  },
  {
    id: "kling-2.6",
    name: "Kling 2.6",
    description: "Image-to-video, 5-10s, native audio",
  },
  {
    id: "runway",
    name: "Runway Gen-4",
    description: "Image-to-video, 5-10s, up to 1080p",
  },
  {
    id: "veo3",
    name: "Veo 3.1",
    description: "Google Veo, high quality, 16:9",
  },
];

export interface KieGenerateOptions {
  imageUrl: string;
  model: string;
  duration?: number;
  prompt?: string;
  aspectRatio?: string;
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
    const model = options.model;

    // Kling models use /jobs/createTask with a different body format
    if (model === "kling-3.0" || model === "kling-2.6") {
      return this.generateKling(options);
    }

    // Veo uses /veo/generate
    if (model === "veo3") {
      return this.generateVeo(options);
    }

    // Runway uses /runway/generate
    return this.generateRunway(options);
  }

  private async generateKling(options: KieGenerateOptions): Promise<string> {
    const modelName =
      options.model === "kling-3.0"
        ? "kling-3.0/video"
        : "kling-2.6/image-to-video";

    const body: Record<string, unknown> = {
      model: modelName,
      input: {
        prompt: options.prompt || "Animate this image with natural, cinematic motion",
        image_urls: [options.imageUrl],
        sound: false,
        duration: String(options.duration ?? 5),
      },
      callBackUrl: "https://example.com/noop",
    };

    // Kling 3.0 supports mode
    if (options.model === "kling-3.0") {
      (body.input as Record<string, unknown>).mode = "std";
      (body.input as Record<string, unknown>).aspect_ratio =
        options.aspectRatio || "16:9";
    }

    const res = await fetch(`${KIE_BASE}/jobs/createTask`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`kie.ai Kling error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    if (data.code !== 200) {
      throw new Error(data.msg || `kie.ai error code: ${data.code}`);
    }

    return data.data?.taskId;
  }

  private async generateVeo(options: KieGenerateOptions): Promise<string> {
    const body = {
      prompt: options.prompt || "Animate this image with natural, cinematic motion",
      imageUrls: [options.imageUrl],
      model: "veo3",
      generationType: "REFERENCE_2_VIDEO",
      aspect_ratio: options.aspectRatio || "16:9",
      callBackUrl: "https://example.com/noop",
    };

    const res = await fetch(`${KIE_BASE}/veo/generate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`kie.ai Veo error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    if (data.code !== 200) {
      throw new Error(data.msg || `kie.ai error code: ${data.code}`);
    }

    return data.data?.taskId;
  }

  private async generateRunway(options: KieGenerateOptions): Promise<string> {
    const body = {
      prompt: options.prompt || "Animate this image with natural, cinematic motion",
      imageUrl: options.imageUrl,
      duration: options.duration ?? 5,
      quality: "720p",
      callBackUrl: "https://example.com/noop",
    };

    const res = await fetch(`${KIE_BASE}/runway/generate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`kie.ai Runway error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    if (data.code !== 200) {
      throw new Error(data.msg || `kie.ai error code: ${data.code}`);
    }

    return data.data?.taskId;
  }

  async getTaskStatus(taskId: string): Promise<{
    state: string;
    resultJson?: string;
    failMsg?: string;
  }> {
    const res = await fetch(
      `${KIE_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: this.headers() }
    );

    if (!res.ok) {
      throw new Error(`kie.ai status error: ${res.status}`);
    }

    const data = await res.json();
    if (data.code !== 200) {
      throw new Error(data.msg || `kie.ai status error code: ${data.code}`);
    }

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
        if (status.resultJson) {
          try {
            const result = JSON.parse(status.resultJson);
            // Different models return video URL in different fields
            const url =
              result.video_url ||
              result.videoUrl ||
              result.url ||
              result.output;
            if (url) return { videoUrl: url };
          } catch {
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
