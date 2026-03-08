# Reel-Flow Full Fix & Feature Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all broken features (video persistence, Runway/Veo polling, music, render, preview, language) and improve UX (editable prompts, subtitles, wizard layout).

**Architecture:** Server actions via `/api/actions` proxy, MinIO storage with proxy streaming, FFmpeg server-side rendering via BullMQ job queue, Pixabay Music API for free tracks, next-intl for i18n.

**Tech Stack:** Next.js 16, Zustand, Drizzle ORM, MinIO, FFmpeg (fluent-ffmpeg), BullMQ/Redis, Pixabay Music API, next-intl

---

## Phase 1: Critical Bug Fixes

### Task 1: Video Persistence on Reload

Videos disappear when navigating away and back because step-video.tsx doesn't load existing videos from DB on mount.

**Files:**
- Create: `src/lib/video-actions.ts` — add `loadExistingVideos` function
- Modify: `src/components/wizard/steps/step-video.tsx` — add useEffect to load on mount
- Modify: `src/app/api/actions/route.ts` — register new action

**Step 1: Add `loadExistingVideos` server action**

In `src/lib/video-actions.ts`, add after `getVideoPresignedUrl`:

```typescript
export async function loadExistingVideos(
  projectId: string
): Promise<Record<string, { videoKey: string; videoUrl: string }>> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const projectScenes = await db
    .select({ id: scenes.id, sortIndex: scenes.sortIndex })
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(scenes.sortIndex);

  const result: Record<string, { videoKey: string; videoUrl: string }> = {};

  for (const scene of projectScenes) {
    const [clip] = await db
      .select({ fileUrl: videoClips.fileUrl })
      .from(videoClips)
      .where(
        and(
          eq(videoClips.sceneId, scene.id),
          eq(videoClips.status, "completed")
        )
      )
      .limit(1);

    if (clip?.fileUrl) {
      result[String(scene.sortIndex)] = {
        videoKey: clip.fileUrl,
        videoUrl: await getPresignedUrl(clip.fileUrl, 3600),
      };
    }
  }

  return result;
}
```

**Step 2: Register in action registry**

In `src/app/api/actions/route.ts`, add `loadExistingVideos` to the video-actions entry.

**Step 3: Load videos on mount in step-video.tsx**

Add useEffect after the existing init useEffect:

```typescript
// Load existing videos from DB
useEffect(() => {
  let cancelled = false;
  async function loadExisting() {
    if (!projectData?.id) return;
    try {
      const existing = await callAction<Record<string, { videoKey: string; videoUrl: string }>>(
        "loadExistingVideos", projectData.id
      );
      if (cancelled || !existing) return;
      const newKeys = new Map<number, string>();
      const newUrls = new Map<number, string>();
      const newStatuses = new Map<number, VideoStatus>();
      for (const [idx, data] of Object.entries(existing)) {
        const i = Number(idx);
        newKeys.set(i, data.videoKey);
        newUrls.set(i, data.videoUrl);
        newStatuses.set(i, "completed");
      }
      if (newKeys.size > 0) {
        setVideoKeys(prev => { const m = new Map(prev); newKeys.forEach((v,k) => m.set(k,v)); return m; });
        setVideoUrls(prev => { const m = new Map(prev); newUrls.forEach((v,k) => m.set(k,v)); return m; });
        setStatuses(prev => { const m = new Map(prev); newStatuses.forEach((v,k) => m.set(k,v)); return m; });
      }
    } catch { /* non-critical */ }
  }
  loadExisting();
  return () => { cancelled = true; };
}, [projectData?.id]);
```

**Step 4: Commit**

```bash
git add src/lib/video-actions.ts src/components/wizard/steps/step-video.tsx src/app/api/actions/route.ts
git commit -m "fix: load existing videos from DB on step mount"
```

---

### Task 2: Fix Runway/Veo "recordInfo is null"

Runway and Veo tasks take longer to register. Increase initial wait and add model-specific delays.

**Files:**
- Modify: `src/lib/ai/providers/kie.ts`

**Step 1: Add model-aware initial delay**

Change `waitForCompletion` to accept model parameter and use longer delays for Runway/Veo:

```typescript
async waitForCompletion(
  taskId: string,
  maxWaitMs = 300_000,
  model?: string
): Promise<{ videoUrl: string }> {
  // Runway and Veo need more time to register tasks
  const initialDelay = (model === "runway" || model === "veo3") ? 15_000 : 5_000;
  await new Promise((r) => setTimeout(r, initialDelay));

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const status = await this.getTaskStatus(taskId);
    if (!status) {
      await new Promise((r) => setTimeout(r, 8_000));
      continue;
    }
    // ... rest unchanged
  }
}
```

**Step 2: Pass model to waitForCompletion in video-actions.ts**

In `generateVideo`, change:
```typescript
const result = await provider.waitForCompletion(taskId);
```
to:
```typescript
const result = await provider.waitForCompletion(taskId, 300_000, model);
```

**Step 3: Commit**

```bash
git add src/lib/ai/providers/kie.ts src/lib/video-actions.ts
git commit -m "fix: increase initial delay for Runway/Veo task registration"
```

---

### Task 3: Video Player Controls (Timeline)

Add native browser controls to the video element.

**Files:**
- Modify: `src/components/wizard/steps/step-video.tsx` — VideoPlayer component

**Step 1: Add controls attribute to video element**

In the VideoPlayer component, add `controls` to the video element and remove the custom play/pause overlay (browser controls handle it):

```tsx
function VideoPlayer({ url, sceneIndex }: { url: string; sceneIndex: number }) {
  return (
    <>
      <video
        src={url}
        className="absolute inset-0 w-full h-full object-contain bg-black"
        controls
        playsInline
        preload="metadata"
      />
      <div className="absolute bottom-1.5 left-1.5 pointer-events-none">
        <Badge className="bg-black/50 text-white text-[10px] backdrop-blur-sm border-0 px-1.5 py-0">
          Video
        </Badge>
      </div>
      <div className="absolute top-1.5 right-1.5 pointer-events-none">
        <Badge className="bg-success/80 text-white text-[10px] backdrop-blur-sm border-0 px-1.5 py-0 gap-0.5">
          <Check weight="bold" className="size-2.5" />
          Ready
        </Badge>
      </div>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/wizard/steps/step-video.tsx
git commit -m "fix: use native video controls for timeline/scrubbing"
```

---

## Phase 2: Editable Prompts Everywhere

### Task 4: Editable Video Prompts

Show the video prompt per scene and allow editing before generation. Follow the pattern from step-images.tsx.

**Files:**
- Modify: `src/components/wizard/steps/step-video.tsx`

**Step 1: Add prompt state**

Add state for video prompts:
```typescript
const [videoPrompts, setVideoPrompts] = useState<Map<number, string>>(new Map());
const [editingPrompts, setEditingPrompts] = useState<Set<number>>(new Set());
```

**Step 2: Add prompt display/edit UI in SceneVideoRow**

Add a collapsible prompt section below the video row:
- Default prompt: "Animate this image with natural, cinematic motion"
- Editable textarea when editing
- Pencil icon to toggle edit
- Pass prompt to `generateVideo` call

**Step 3: Pass prompt through to generateVideo**

Modify the `generateVideo` server action signature to accept an optional `prompt` parameter:
```typescript
export async function generateVideo(
  projectId: string, sceneId: string, imageKey: string,
  model: string, duration?: number, prompt?: string
): Promise<{ success: true; videoKey: string; videoId: string }>
```

Pass prompt to `provider.generateVideo({ imageUrl, model, duration, prompt })`.

**Step 4: Commit**

```bash
git add src/components/wizard/steps/step-video.tsx src/lib/video-actions.ts src/app/api/actions/route.ts
git commit -m "feat: add editable video prompts per scene"
```

---

### Task 5: Editable Voice-Over Text

The voice-over step should show the narration text per scene and allow editing before generation.

**Files:**
- Modify: `src/components/wizard/steps/step-voice-over.tsx`

**Step 1: Add editable narration state**

Similar to image prompts — a Map of sceneIndex → editedText, with toggle for editing.

**Step 2: Pass edited text to generateVoiceOver**

The `generateVoiceOver` action already accepts `text` parameter. Just pass the edited version instead of the original.

**Step 3: Commit**

```bash
git add src/components/wizard/steps/step-voice-over.tsx
git commit -m "feat: editable narration text in voice-over step"
```

---

## Phase 3: Music Library with Pixabay

### Task 6: Pixabay Music API Integration

Replace mock tracks with real music from Pixabay's free API.

**Files:**
- Create: `src/lib/music-actions.ts`
- Modify: `src/components/wizard/steps/step-music.tsx`
- Modify: `src/app/api/actions/route.ts`

**Step 1: Create music-actions.ts**

```typescript
"use server";
import { auth } from "@/lib/auth";

const PIXABAY_KEY = process.env.PIXABAY_API_KEY;
const PIXABAY_MUSIC_URL = "https://pixabay.com/api/";

export interface MusicTrack {
  id: number;
  title: string;
  artist: string;
  duration: number;
  audioUrl: string;
  tags: string;
}

export async function searchMusic(
  query?: string,
  category?: string
): Promise<MusicTrack[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  if (!PIXABAY_KEY) throw new Error("PIXABAY_API_KEY not configured");

  const params = new URLSearchParams({
    key: PIXABAY_KEY,
    per_page: "20",
  });
  if (query) params.set("q", query);
  if (category) params.set("category", category);

  const res = await fetch(`${PIXABAY_MUSIC_URL}?${params}`);
  if (!res.ok) throw new Error(`Pixabay error: ${res.status}`);

  const data = await res.json();
  return data.hits.map((hit: any) => ({
    id: hit.id,
    title: hit.tags?.split(",")[0]?.trim() || `Track ${hit.id}`,
    artist: hit.user,
    duration: hit.duration,
    audioUrl: hit.audio || hit.previewURL,
    tags: hit.tags,
  }));
}
```

Note: Pixabay's free API may have limitations. If PIXABAY_API_KEY is not set, fall back to a curated list of CC0 music URLs hosted on our MinIO.

**Step 2: Replace mock tracks in step-music.tsx**

- Load tracks from `searchMusic` on mount
- Add search/filter bar (genre dropdown, search input)
- Use real audio URLs for playback
- Use HTML5 `<audio>` element for actual playback

**Step 3: Implement audio playback**

```tsx
const audioRef = useRef<HTMLAudioElement | null>(null);
const [playingId, setPlayingId] = useState<number | null>(null);

function togglePlay(track: MusicTrack) {
  if (playingId === track.id) {
    audioRef.current?.pause();
    setPlayingId(null);
  } else {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(track.audioUrl);
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(track.id);
  }
}
```

**Step 4: Register actions and commit**

```bash
git add src/lib/music-actions.ts src/components/wizard/steps/step-music.tsx src/app/api/actions/route.ts
git commit -m "feat: real music library with Pixabay API integration"
```

---

## Phase 4: Subtitle Improvements

### Task 7: Enhanced Subtitle Customization

Add free positioning (X/Y), more color options, custom background color.

**Files:**
- Modify: `src/components/wizard/steps/step-subtitles.tsx`
- Modify: `src/db/schema.ts` — extend SubtitleStyle type

**Step 1: Extend SubtitleStyle type**

In schema.ts, update the SubtitleStyle type:
```typescript
export type SubtitleStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  position: "top" | "center" | "bottom" | "custom";
  customX?: number; // 0-100 percent
  customY?: number; // 0-100 percent
  background: "none" | "solid" | "semi-transparent" | "blur" | "custom";
  backgroundColor?: string; // hex color for custom
  animation: "none" | "fade" | "slide" | "typewriter";
};
```

**Step 2: Add color picker for text and background**

Add a hex color input alongside the preset color buttons. Add custom position sliders (X: 0-100%, Y: 0-100%) shown when position is "custom".

**Step 3: Update preview to reflect custom position**

In SubtitlePreview, use the customX/customY values with absolute positioning.

**Step 4: Commit**

```bash
git add src/components/wizard/steps/step-subtitles.tsx src/db/schema.ts
git commit -m "feat: enhanced subtitle customization with free positioning and custom colors"
```

---

## Phase 5: Preview & Render

### Task 8: Working Preview with Real Assets

Load actual generated images, videos, and audio into the preview.

**Files:**
- Modify: `src/components/wizard/steps/step-preview.tsx`
- Create: `src/lib/preview-actions.ts`
- Modify: `src/app/api/actions/route.ts`

**Step 1: Create preview-actions.ts**

Server action that loads all assets for a project:
```typescript
export async function loadPreviewAssets(projectId: string): Promise<{
  scenes: Array<{
    index: number;
    narration: string;
    imageUrl: string | null;
    videoUrl: string | null;
    audioUrl: string | null;
    duration: number;
  }>;
  musicUrl: string | null;
  subtitleStyle: SubtitleStyle | null;
}>
```

Queries scenes, sceneImages, videoClips, voiceOvers tables and returns proxy URLs.

**Step 2: Load real assets in preview component**

Replace mock data with real data from `loadPreviewAssets`. Show actual videos/images per scene, play voice-over audio synced with scene advancement.

**Step 3: Commit**

```bash
git add src/lib/preview-actions.ts src/components/wizard/steps/step-preview.tsx src/app/api/actions/route.ts
git commit -m "feat: preview with real project assets"
```

---

### Task 9: FFmpeg Server-Side Rendering

Implement actual video rendering using FFmpeg on the server.

**Files:**
- Create: `src/lib/render-actions.ts`
- Create: `src/lib/ffmpeg-render.ts`
- Modify: `src/components/wizard/steps/step-render.tsx`
- Modify: `src/app/api/actions/route.ts`

**Step 1: Install fluent-ffmpeg**

```bash
bun add fluent-ffmpeg @types/fluent-ffmpeg
```

Note: FFmpeg binary must be available on the Dokploy container. Add to Dockerfile if needed.

**Step 2: Create ffmpeg-render.ts**

Core rendering logic:
1. Download all assets from MinIO (videos, audio, music) to temp dir
2. Concatenate video clips with FFmpeg `concat` demuxer
3. Overlay voice-over audio per scene at correct timestamps
4. Mix in background music at configured volume
5. Burn in subtitles using FFmpeg `drawtext` filter (respecting SubtitleStyle settings)
6. Output to configured resolution/fps/format
7. Upload final render to MinIO
8. Clean up temp files

```typescript
export async function renderProject(
  projectId: string,
  settings: RenderSettings,
  subtitleStyle: SubtitleStyle,
  onProgress?: (percent: number) => void
): Promise<string> // returns MinIO key
```

**Step 3: Create render-actions.ts**

Server actions:
- `startRender(projectId)` — kicks off render job, returns job ID
- `getRenderStatus(jobId)` — returns progress percentage
- `getRenderDownloadUrl(projectId)` — returns proxy URL for final render

**Step 4: Update step-render.tsx**

Replace mock rendering with:
1. Call `startRender` when clicking render
2. Poll `getRenderStatus` for real progress
3. On completion, show download button that calls `getRenderDownloadUrl`

**Step 5: Commit**

```bash
git add src/lib/ffmpeg-render.ts src/lib/render-actions.ts src/components/wizard/steps/step-render.tsx src/app/api/actions/route.ts
git commit -m "feat: real FFmpeg video rendering with download"
```

---

## Phase 6: Language/i18n

### Task 10: Working Language Switcher

Make the language toggle actually switch all UI text between EN and DE.

**Files:**
- Create: `src/i18n/en.ts` — English translations
- Create: `src/i18n/de.ts` — German translations
- Create: `src/i18n/index.ts` — translation loader
- Modify: Language switcher component
- Modify: All wizard step components (use translation keys)

**Step 1: Create translation files**

Simple key-value object approach (no heavy library needed):
```typescript
// src/i18n/en.ts
export const en = {
  wizard: {
    step1: { title: "Project Setup", ... },
    step2: { title: "Idea & Concept", ... },
    // ...
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    generate: "Generate",
    // ...
  },
};
```

**Step 2: Create translation hook**

```typescript
// src/i18n/index.ts
export function useTranslations() {
  const locale = useLocaleFromCookie(); // read from cookie set by locale-actions.ts
  return locale === "de" ? de : en;
}
```

**Step 3: Update language switcher to call setLocale and reload**

The existing `setLocale` action sets a cookie. After calling it, do `router.refresh()` to re-render with new locale.

**Step 4: Gradually replace hardcoded strings**

Start with wizard step titles and common buttons. Full translation can be incremental.

**Step 5: Commit**

```bash
git add src/i18n/ src/components/
git commit -m "feat: working language switcher with DE/EN translations"
```

---

## Phase 7: Wizard UI/UX Overhaul

### Task 11: Cleaner Wizard Layout

Redesign the wizard step pages for better readability and flow.

**Files:**
- Modify: `src/components/wizard/step-content.tsx`
- Modify: All step components

**Key improvements:**
1. **Consistent two-column layout**: Config on left (60%), Preview on right (40%)
2. **Collapsible sections**: Group related settings under collapsible headers
3. **Progress indicators per scene**: Show which scenes are done vs pending
4. **Sticky action bar**: Keep generate/save buttons visible while scrolling
5. **Scene cards instead of dense rows**: More whitespace, clearer hierarchy
6. **Loading skeletons**: Replace spinners with skeleton placeholders

This task is iterative and should be done after all functional fixes are in place.

**Step 1: Commit**

```bash
git add src/components/wizard/
git commit -m "refactor: cleaner wizard layout with consistent columns and collapsible sections"
```

---

## Execution Order

1. Task 1 (Video persistence) — fixes data loss
2. Task 2 (Runway/Veo) — fixes broken video gen
3. Task 3 (Video controls) — quick win
4. Task 4 (Video prompts) — editable prompts
5. Task 5 (Voice-over text) — editable text
6. Task 6 (Music library) — real music
7. Task 7 (Subtitles) — enhanced customization
8. Task 8 (Preview) — real asset preview
9. Task 9 (FFmpeg render) — real rendering
10. Task 10 (i18n) — language switcher
11. Task 11 (UI overhaul) — polish

Each task is independent and can be committed separately. Deploy after each phase.
