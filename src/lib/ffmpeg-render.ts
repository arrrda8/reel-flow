import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { downloadFileToPath, uploadFile } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RenderInput {
  scenes: Array<{
    videoKey: string | null;
    imageKey: string | null;
    audioKey: string | null;
    duration: number;
    narration: string | null;
  }>;
  musicTrackUrl: string | null;
  musicVolume: number; // 0-100
  subtitleStyle: Record<string, unknown> | null;
  resolution: string; // "720p" | "1080p" | "4k"
  fps: number;
  format: string; // "mp4" | "mov" | "webm"
  aspectRatio: string;
}

// ---------------------------------------------------------------------------
// Resolution mapping
// ---------------------------------------------------------------------------

function getResolutionSize(resolution: string, aspectRatio: string): { width: number; height: number } {
  const isVertical = aspectRatio === "9:16";
  const isSquare = aspectRatio === "1:1";

  switch (resolution.toLowerCase()) {
    case "4k":
      if (isVertical) return { width: 2160, height: 3840 };
      if (isSquare) return { width: 2160, height: 2160 };
      return { width: 3840, height: 2160 };
    case "720p":
      if (isVertical) return { width: 720, height: 1280 };
      if (isSquare) return { width: 720, height: 720 };
      return { width: 1280, height: 720 };
    case "1080p":
    default:
      if (isVertical) return { width: 1080, height: 1920 };
      if (isSquare) return { width: 1080, height: 1080 };
      return { width: 1920, height: 1080 };
  }
}

// ---------------------------------------------------------------------------
// FFmpeg promise wrapper
// ---------------------------------------------------------------------------

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

// ---------------------------------------------------------------------------
// Helper: convert a still image into a video segment
// ---------------------------------------------------------------------------

async function imageToVideo(
  imagePath: string,
  outputPath: string,
  duration: number,
  fps: number,
  width: number,
  height: number,
): Promise<void> {
  const cmd = ffmpeg()
    .input(imagePath)
    .inputOptions(["-loop", "1"])
    .inputOptions(["-t", String(duration)])
    .outputOptions([
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
      "-r", String(fps),
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-preset", "medium",
      "-t", String(duration),
    ])
    .output(outputPath);

  await runFfmpeg(cmd);
}

// ---------------------------------------------------------------------------
// Helper: concatenate video segments using concat demuxer
// ---------------------------------------------------------------------------

async function concatenateVideos(
  segments: string[],
  outputPath: string,
  workDir: string,
): Promise<void> {
  if (segments.length === 0) {
    throw new Error("No video segments to concatenate");
  }

  if (segments.length === 1) {
    // Single segment — just copy it
    await fs.copyFile(segments[0], outputPath);
    return;
  }

  // Write concat list file
  const listPath = join(workDir, "concat_list.txt");
  const listContent = segments.map((s) => `file '${s}'`).join("\n");
  await fs.writeFile(listPath, listContent, "utf-8");

  const cmd = ffmpeg()
    .input(listPath)
    .inputOptions(["-f", "concat", "-safe", "0"])
    .outputOptions(["-c", "copy"])
    .output(outputPath);

  await runFfmpeg(cmd);
}

// ---------------------------------------------------------------------------
// Helper: normalize a video segment to consistent format for concat
// ---------------------------------------------------------------------------

async function normalizeSegment(
  inputPath: string,
  outputPath: string,
  duration: number,
  fps: number,
  width: number,
  height: number,
): Promise<void> {
  const cmd = ffmpeg()
    .input(inputPath)
    .outputOptions([
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
      "-r", String(fps),
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-preset", "medium",
      "-an", // strip audio — we mix it separately
      "-t", String(duration),
    ])
    .output(outputPath);

  await runFfmpeg(cmd);
}

// ---------------------------------------------------------------------------
// Helper: mix voice-over audio tracks and optional background music
// ---------------------------------------------------------------------------

async function mixAudioAndFinalize(
  videoPath: string,
  sceneFiles: Array<{ audio?: string; duration: number }>,
  input: RenderInput,
  outputPath: string,
  workDir: string,
): Promise<void> {
  // Collect all voice-over audio files with their time offsets
  const audioInputs: Array<{ path: string; offsetSecs: number }> = [];
  let currentOffset = 0;

  for (const sf of sceneFiles) {
    if (sf.audio) {
      audioInputs.push({ path: sf.audio, offsetSecs: currentOffset });
    }
    currentOffset += sf.duration;
  }

  const hasVoiceOvers = audioInputs.length > 0;
  const hasMusicTrack = !!input.musicTrackUrl;

  // If no audio at all, just copy the video
  if (!hasVoiceOvers && !hasMusicTrack) {
    await fs.copyFile(videoPath, outputPath);
    return;
  }

  // Build a complex filter for mixing audio
  const cmd = ffmpeg().input(videoPath);

  // Add voice-over inputs
  for (const ai of audioInputs) {
    cmd.input(ai.path);
  }

  // Add music track if present
  let musicInputIdx = -1;
  if (hasMusicTrack) {
    const musicPath = join(workDir, "music_track.mp3");
    await downloadFileToPath(input.musicTrackUrl!, musicPath);
    cmd.input(musicPath);
    musicInputIdx = 1 + audioInputs.length; // 0 = video, 1..N = voice-overs, N+1 = music
  }

  // Build filter complex
  const filterParts: string[] = [];
  const musicVol = input.musicVolume / 100;

  if (hasVoiceOvers) {
    // Delay each voice-over to its correct position and mix
    for (let i = 0; i < audioInputs.length; i++) {
      const inputIdx = i + 1; // input 0 is video
      const delayMs = Math.round(audioInputs[i].offsetSecs * 1000);
      filterParts.push(`[${inputIdx}:a]adelay=${delayMs}|${delayMs}[vo${i}]`);
    }

    // Mix all voice-overs together
    const voLabels = audioInputs.map((_, i) => `[vo${i}]`).join("");
    filterParts.push(`${voLabels}amix=inputs=${audioInputs.length}:duration=longest:normalize=0[voice_mix]`);

    if (hasMusicTrack) {
      // Mix music at lower volume under the voice-overs
      filterParts.push(`[${musicInputIdx}:a]volume=${musicVol}[music_vol]`);
      filterParts.push(`[voice_mix][music_vol]amix=inputs=2:duration=first:normalize=0[final_audio]`);
    } else {
      filterParts.push(`[voice_mix]acopy[final_audio]`);
    }
  } else if (hasMusicTrack) {
    // Only music, no voice-overs
    filterParts.push(`[${musicInputIdx}:a]volume=${musicVol}[final_audio]`);
  }

  const filterStr = filterParts.join(";");

  // Determine output codec based on format
  const outputOptions: string[] = [
    "-filter_complex", filterStr,
    "-map", "0:v",
    "-map", "[final_audio]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
  ];

  cmd.outputOptions(outputOptions).output(outputPath);

  await runFfmpeg(cmd);
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export async function renderVideo(
  projectId: string,
  input: RenderInput,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const workDir = join(tmpdir(), `reelflow-render-${randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  const { width, height } = getResolutionSize(input.resolution, input.aspectRatio);

  try {
    // ------------------------------------------------------------------
    // Step 1: Download all assets from MinIO to temp dir
    // ------------------------------------------------------------------
    const sceneFiles: Array<{ video?: string; image?: string; audio?: string; duration: number }> = [];

    for (let i = 0; i < input.scenes.length; i++) {
      const scene = input.scenes[i];
      const entry: (typeof sceneFiles)[0] = { duration: scene.duration };

      if (scene.videoKey) {
        const path = join(workDir, `scene_${i}.mp4`);
        await downloadFileToPath(scene.videoKey, path);
        entry.video = path;
      } else if (scene.imageKey) {
        const ext = scene.imageKey.endsWith(".webp") ? "webp"
          : scene.imageKey.endsWith(".jpg") || scene.imageKey.endsWith(".jpeg") ? "jpg"
          : "png";
        const path = join(workDir, `scene_${i}.${ext}`);
        await downloadFileToPath(scene.imageKey, path);
        entry.image = path;
      }

      if (scene.audioKey) {
        const path = join(workDir, `audio_${i}.mp3`);
        await downloadFileToPath(scene.audioKey, path);
        entry.audio = path;
      }

      sceneFiles.push(entry);
      onProgress?.(Math.round(((i + 1) / input.scenes.length) * 30));
    }

    // ------------------------------------------------------------------
    // Step 2: Create normalized video segments from each scene
    // ------------------------------------------------------------------
    const segments: string[] = [];

    for (let i = 0; i < sceneFiles.length; i++) {
      const sf = sceneFiles[i];
      const segPath = join(workDir, `normalized_${i}.mp4`);

      if (sf.video) {
        // Normalize video clip to consistent resolution/fps
        await normalizeSegment(sf.video, segPath, sf.duration, input.fps, width, height);
        segments.push(segPath);
      } else if (sf.image) {
        // Convert image to video segment
        await imageToVideo(sf.image, segPath, sf.duration, input.fps, width, height);
        segments.push(segPath);
      }
      // If neither video nor image, skip this scene
    }

    if (segments.length === 0) {
      throw new Error("No video or image assets to render. Please generate visuals first.");
    }

    onProgress?.(50);

    // ------------------------------------------------------------------
    // Step 3: Concatenate all segments
    // ------------------------------------------------------------------
    const concatPath = join(workDir, "concat.mp4");
    await concatenateVideos(segments, concatPath, workDir);
    onProgress?.(65);

    // ------------------------------------------------------------------
    // Step 4: Mix audio (voice-overs + background music)
    // ------------------------------------------------------------------
    const ext = input.format.toLowerCase() === "mov" ? "mov"
      : input.format.toLowerCase() === "webm" ? "webm"
      : "mp4";
    const outputPath = join(workDir, `final.${ext}`);
    await mixAudioAndFinalize(concatPath, sceneFiles, input, outputPath, workDir);
    onProgress?.(90);

    // ------------------------------------------------------------------
    // Step 5: Upload to MinIO
    // ------------------------------------------------------------------
    const buffer = await fs.readFile(outputPath);
    const mimeType = ext === "mov" ? "video/quicktime"
      : ext === "webm" ? "video/webm"
      : "video/mp4";
    const key = `projects/${projectId}/render/final.${ext}`;
    await uploadFile(key, buffer, mimeType);
    onProgress?.(100);

    return key;
  } finally {
    // Clean up temp dir
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
