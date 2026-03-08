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
    name: "Veo 3.1 Fast",
    description: "Google Veo, fast mode, image-to-video",
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

    if (model === "kling-3.0") return this.generateKling3(options);
    if (model === "kling-2.6") return this.generateKling26(options);
    if (model === "veo3") return this.generateVeo(options);
    return this.generateRunway(options);
  }

  private async generateKling3(options: KieGenerateOptions): Promise<string> {
    // Kling 3.0 single-shot image-to-video
    const body = {
      model: "kling-3.0/video",
      callBackUrl: "https://example.com/noop",
      input: {
        multi_shots: false,
        prompt: options.prompt || "Animate this image with natural, cinematic motion",
        image_urls: [options.imageUrl],
        duration: String(options.duration ?? 5),
        aspect_ratio: options.aspectRatio || "16:9",
        mode: "std",
        sound: false,
      },
    };

    return this.createTask(body);
  }

  private async generateKling26(options: KieGenerateOptions): Promise<string> {
    // Kling 2.6 image-to-video
    const body = {
      model: "kling-2.6/image-to-video",
      callBackUrl: "https://example.com/noop",
      input: {
        prompt: options.prompt || "Animate this image with natural, cinematic motion",
        image_urls: [options.imageUrl],
        sound: false,
        duration: String(options.duration ?? 5),
      },
    };

    return this.createTask(body);
  }

  private async createTask(body: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${KIE_BASE}/jobs/createTask`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`kie.ai error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    if (data.code !== 200) {
      throw new Error(data.msg || `kie.ai error code: ${data.code}`);
    }

    const taskId = data.data?.taskId;
    if (!taskId) {
      throw new Error("kie.ai did not return a taskId");
    }
    return taskId;
  }

  private async generateVeo(options: KieGenerateOptions): Promise<string> {
    // Veo 3.1 Fast — use FIRST_AND_LAST_FRAMES_2_VIDEO for image-to-video
    const body = {
      prompt: options.prompt || "Animate this image with natural, cinematic motion",
      imageUrls: [options.imageUrl],
      model: "veo3_fast",
      generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO",
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
      throw new Error(data.msg || `kie.ai Veo error code: ${data.code}`);
    }

    const taskId = data.data?.taskId;
    if (!taskId) {
      throw new Error("kie.ai Veo did not return a taskId");
    }
    return taskId;
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
      throw new Error(data.msg || `kie.ai Runway error code: ${data.code}`);
    }

    const taskId = data.data?.taskId;
    if (!taskId) {
      throw new Error("kie.ai Runway did not return a taskId");
    }
    return taskId;
  }

  async getTaskStatus(taskId: string): Promise<{
    state: string;
    resultJson?: string;
    failMsg?: string;
  } | null> {
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

    // Can be null if the task hasn't been registered yet
    return data.data ?? null;
  }

  async waitForCompletion(
    taskId: string,
    maxWaitMs = 300_000
  ): Promise<{ videoUrl: string }> {
    // Wait before first poll — tasks need time to register
    await new Promise((r) => setTimeout(r, 5000));

    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      const status = await this.getTaskStatus(taskId);

      // Task not yet registered — keep polling
      if (!status) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      if (status.state === "success") {
        if (status.resultJson) {
          try {
            const result = JSON.parse(status.resultJson);
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
