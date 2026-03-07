const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  speed?: number;
}

export class ElevenLabsProvider {
  constructor(private apiKey: string) {}

  async listVoices(): Promise<ElevenLabsVoice[]> {
    const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
      headers: { "xi-api-key": this.apiKey },
    });
    if (!res.ok) throw new Error(`ElevenLabs API error: ${res.status}`);
    const data = await res.json();
    return data.voices;
  }

  async getVoicePreviewUrl(voiceId: string): Promise<string> {
    const voices = await this.listVoices();
    const voice = voices.find((v) => v.voice_id === voiceId);
    return voice?.preview_url ?? "";
  }

  async textToSpeech(
    voiceId: string,
    text: string,
    settings?: VoiceSettings,
  ): Promise<ArrayBuffer> {
    const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: settings
          ? {
              stability: settings.stability,
              similarity_boost: settings.similarity_boost,
              speed: settings.speed ?? 1.0,
            }
          : undefined,
      }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`ElevenLabs TTS error: ${res.status} - ${errorText}`);
    }
    return res.arrayBuffer();
  }
}
