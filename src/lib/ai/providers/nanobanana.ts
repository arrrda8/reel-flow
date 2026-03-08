const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface NanoBananaGenerateOptions {
  prompt: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
}

/**
 * NanoBanana image provider — uses Google Gemini image generation API
 * with a Google AI Studio API key.
 */
export class NanoBananaProvider {
  constructor(private apiKey: string) {}

  async generateImage(options: NanoBananaGenerateOptions): Promise<ArrayBuffer> {
    // Use Gemini's image generation model
    const model = "gemini-2.5-flash-image";
    const url = `${GEMINI_BASE}/models/${model}:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: options.prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: options.aspectRatio ?? "9:16",
          },
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini Image API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();

    // Extract base64 image from response
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("Gemini Image API returned no candidates");
    }

    const parts = candidates[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error("Gemini Image API returned no image parts");
    }

    // Find the image part (inlineData with base64)
    const imagePart = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.data
    );
    if (!imagePart?.inlineData?.data) {
      throw new Error("Gemini Image API response contains no image data");
    }

    // Convert base64 to ArrayBuffer
    const base64 = imagePart.inlineData.data;
    const binary = Buffer.from(base64, "base64");
    return binary.buffer.slice(
      binary.byteOffset,
      binary.byteOffset + binary.byteLength
    );
  }
}
