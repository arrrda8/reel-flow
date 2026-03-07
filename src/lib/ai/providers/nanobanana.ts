export interface NanoBananaGenerateOptions {
  prompt: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
}

export class NanoBananaProvider {
  private baseUrl: string;

  constructor(
    private apiKey: string,
    baseUrl = "https://api.nanobanana.com/v2",
  ) {
    this.baseUrl = baseUrl;
  }

  async generateImage(options: NanoBananaGenerateOptions): Promise<ArrayBuffer> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio ?? "9:16",
        width: options.width,
        height: options.height,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`NanoBanana API error: ${res.status} - ${errorText}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.startsWith("image/")) {
      return res.arrayBuffer();
    }

    const data = await res.json();
    if (data.url) {
      const imageRes = await fetch(data.url);
      return imageRes.arrayBuffer();
    }

    throw new Error("Unexpected NanoBanana response format");
  }
}
