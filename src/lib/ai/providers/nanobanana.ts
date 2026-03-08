const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface NanoBananaGenerateOptions {
  prompt: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
}

/**
 * Nano Banana 2 image provider — Google's Gemini 3.1 Flash Image model
 * with 4K resolution support. Uses a Google AI Studio API key.
 */
export class NanoBananaProvider {
  constructor(private apiKey: string) {}

  async generateImage(options: NanoBananaGenerateOptions): Promise<ArrayBuffer> {
    const model = "gemini-3.1-flash-image-preview";
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
            imageSize: "4K",
          },
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Nano Banana 2 API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();

    // Extract base64 image from generateContent response
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("Nano Banana 2 returned no candidates");
    }

    const parts = candidates[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error("Nano Banana 2 returned no image parts");
    }

    // Find the inline image data
    const imagePart = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.data
    );
    if (!imagePart?.inlineData?.data) {
      throw new Error("Nano Banana 2 response contains no image data");
    }

    const binary = Buffer.from(imagePart.inlineData.data, "base64");
    return binary.buffer.slice(
      binary.byteOffset,
      binary.byteOffset + binary.byteLength
    );
  }
}
