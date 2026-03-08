"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Timer,
  FilmStrip,
  MonitorPlay,
  SpeakerHigh,
  Subtitles,
  MusicNotes,
  Check,
  Image,
  Spinner,
  SkipForward,
  SkipBack,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PreviewData, PreviewScene } from "@/lib/preview-actions";

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function callAction<T>(action: string, ...args: unknown[]): Promise<T> {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, args }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error ?? "Action failed");
  return data.result as T;
}

// ---------------------------------------------------------------------------
// Timeline Marker
// ---------------------------------------------------------------------------

function TimelineMarker({
  index,
  isActive,
  onClick,
  widthPercent,
}: {
  index: number;
  isActive: boolean;
  onClick: () => void;
  widthPercent: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative h-10 rounded transition-all",
        isActive
          ? "bg-primary/30 ring-1 ring-primary"
          : "bg-surface hover:bg-primary/10"
      )}
      style={{ width: `${widthPercent}%` }}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-1 text-center text-[10px] font-mono font-bold",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {index + 1}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Scene Thumbnail
// ---------------------------------------------------------------------------

function SceneThumbnail({
  scene,
  index,
  isActive,
  onClick,
}: {
  scene: PreviewScene;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg border p-2 text-left transition-all",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border bg-surface/30 hover:border-primary/50"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md bg-slate-700/50">
        {scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={scene.imageUrl}
            alt={`Scene ${index + 1}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image weight="duotone" className="size-4 text-white/40" />
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play weight="fill" className="size-4 text-white" />
          </div>
        )}
        <div className="absolute bottom-0.5 right-0.5">
          <span className="rounded bg-black/60 px-1 py-0.5 text-[9px] font-mono text-white">
            {scene.duration}s
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-medium", isActive ? "text-primary" : "text-foreground")}>
          Scene {index + 1}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {scene.narration || "No narration"}
        </p>
        <div className="mt-1 flex gap-1.5">
          {scene.videoUrl && (
            <span className="rounded bg-green-500/10 px-1 py-0.5 text-[9px] text-green-500">Video</span>
          )}
          {scene.imageUrl && !scene.videoUrl && (
            <span className="rounded bg-blue-500/10 px-1 py-0.5 text-[9px] text-blue-500">Image</span>
          )}
          {scene.audioUrl && (
            <span className="rounded bg-purple-500/10 px-1 py-0.5 text-[9px] text-purple-500">Audio</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepPreview() {
  const projectData = useWizardStore((s) => s.projectData);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);

  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeScene, setActiveScene] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const projectId = projectData?.id;

  // Load preview data on mount
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setIsLoadingPreview(true);
    setLoadError(null);

    callAction<PreviewData>("loadPreviewData", projectId)
      .then((data) => {
        if (!cancelled) {
          setPreviewData(data);
          setIsLoadingPreview(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message);
          setIsLoadingPreview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const previewScenes = previewData?.scenes ?? [];
  const totalDuration = previewData?.totalDuration ?? 0;
  const subtitleStyle = previewData?.subtitleStyle;
  const aspectRatio = previewData?.aspectRatio ?? projectData?.aspectRatio ?? "16:9";
  const isPortrait = aspectRatio === "9:16" || aspectRatio === "4:5";

  const currentScene = previewScenes[activeScene] ?? null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Stop playback helpers
  const stopPlayback = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  // Advance to next scene
  const advanceScene = useCallback(() => {
    setActiveScene((prev) => {
      const next = prev + 1;
      if (next >= previewScenes.length) {
        setIsPlaying(false);
        stopPlayback();
        return 0;
      }
      return next;
    });
  }, [previewScenes.length, stopPlayback]);

  // Play current scene assets
  useEffect(() => {
    if (!isPlaying || !currentScene) return;

    // Play audio if available
    if (currentScene.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(currentScene.audioUrl);
      audioRef.current = audio;
      audio.play().catch(() => {
        // Audio play failed (e.g., autoplay blocked) — fall back to timer
      });
      audio.onended = () => {
        advanceScene();
      };
    } else {
      // No audio — use duration timer
      timerRef.current = setTimeout(() => {
        advanceScene();
      }, currentScene.duration * 1000);
    }

    // Play video if available
    if (videoRef.current && currentScene.videoUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Don't pause audio here — let onended handle it
    };
  }, [isPlaying, activeScene, currentScene, advanceScene]);

  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      stopPlayback();
    } else {
      setIsPlaying(true);
    }
  }, [isPlaying, stopPlayback]);

  const handleSceneClick = useCallback((index: number) => {
    stopPlayback();
    setIsPlaying(false);
    setActiveScene(index);
  }, [stopPlayback]);

  const handlePrevScene = useCallback(() => {
    if (activeScene > 0) {
      handleSceneClick(activeScene - 1);
    }
  }, [activeScene, handleSceneClick]);

  const handleNextScene = useCallback(() => {
    if (activeScene < previewScenes.length - 1) {
      handleSceneClick(activeScene + 1);
    }
  }, [activeScene, previewScenes.length, handleSceneClick]);

  const handleApprove = useCallback(() => {
    markStepCompleted(9);
  }, [markStepCompleted]);

  // Subtitle position style
  const subtitlePositionClass = (() => {
    const pos = (subtitleStyle as { position?: string } | null)?.position ?? "bottom";
    if (pos === "top") return "top-4 inset-x-4";
    if (pos === "center") return "top-1/2 -translate-y-1/2 inset-x-4";
    return "bottom-4 inset-x-4"; // bottom or custom
  })();

  if (!projectData) return <StepContent isLoading />;

  if (isLoadingPreview) {
    return (
      <StepContent>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Spinner className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading preview assets...</p>
        </div>
      </StepContent>
    );
  }

  if (loadError) {
    return (
      <StepContent>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button
            variant="outline"
            onClick={() => {
              setIsLoadingPreview(true);
              setLoadError(null);
              callAction<PreviewData>("loadPreviewData", projectId!)
                .then(setPreviewData)
                .catch((err) => setLoadError(err.message))
                .finally(() => setIsLoadingPreview(false));
            }}
          >
            Retry
          </Button>
        </div>
      </StepContent>
    );
  }

  return (
    <StepContent>
      <div className="space-y-6">
        {/* Info banner */}
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <MonitorPlay weight="duotone" className="size-4 text-secondary" />
            <p className="text-sm text-foreground">
              This is a preview of your final video. Review all scenes before rendering.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: Main preview area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video / image preview */}
            <div className="flex justify-center">
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl border border-border bg-slate-900",
                  isPortrait
                    ? "aspect-[9/16] max-h-[500px] w-full max-w-[280px]"
                    : "aspect-video w-full"
                )}
              >
                {/* Scene content */}
                {currentScene?.videoUrl ? (
                  <video
                    ref={videoRef}
                    key={`video-${activeScene}`}
                    src={currentScene.videoUrl}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    playsInline
                    loop={!isPlaying}
                  />
                ) : currentScene?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`img-${activeScene}`}
                    src={currentScene.imageUrl}
                    alt={`Scene ${activeScene + 1}`}
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <Image weight="duotone" className="size-12 text-white/20" />
                  </div>
                )}

                {/* Scene number overlay */}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-black/50 text-white text-xs backdrop-blur-sm border-0">
                    Scene {activeScene + 1} / {previewScenes.length || 1}
                  </Badge>
                </div>

                {/* Audio indicator */}
                {currentScene?.audioUrl && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-black/50 text-white text-xs backdrop-blur-sm border-0 gap-1">
                      <SpeakerHigh weight="fill" className="size-3" />
                      Audio
                    </Badge>
                  </div>
                )}

                {/* Play / Pause / Skip controls */}
                <div className="absolute inset-0 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrevScene}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-all hover:bg-black/50",
                      activeScene === 0 && "opacity-30 pointer-events-none"
                    )}
                  >
                    <SkipBack weight="fill" className="size-4 text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePlayToggle}
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full transition-all",
                      isPlaying
                        ? "bg-black/30 backdrop-blur-sm hover:bg-black/40"
                        : "bg-black/50 backdrop-blur-sm hover:bg-black/60"
                    )}
                  >
                    {isPlaying ? (
                      <Pause weight="fill" className="size-7 text-white" />
                    ) : (
                      <Play weight="fill" className="size-7 text-white ml-1" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextScene}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-all hover:bg-black/50",
                      activeScene >= previewScenes.length - 1 && "opacity-30 pointer-events-none"
                    )}
                  >
                    <SkipForward weight="fill" className="size-4 text-white" />
                  </button>
                </div>

                {/* Subtitle overlay */}
                {currentScene?.narration && (
                  <div className={cn("absolute", subtitlePositionClass)}>
                    <div
                      className="rounded-lg px-3 py-2 text-center"
                      style={{
                        backgroundColor:
                          (subtitleStyle as { background?: string } | null)?.background === "none"
                            ? "transparent"
                            : "rgba(0,0,0,0.5)",
                        backdropFilter:
                          (subtitleStyle as { background?: string } | null)?.background === "blur"
                            ? "blur(8px)"
                            : undefined,
                      }}
                    >
                      <p
                        className="text-xs font-medium line-clamp-3"
                        style={{
                          color: (subtitleStyle as { color?: string } | null)?.color ?? "#ffffff",
                          fontFamily: (subtitleStyle as { fontFamily?: string } | null)?.fontFamily ?? "inherit",
                          fontSize: `${(subtitleStyle as { fontSize?: number } | null)?.fontSize ?? 14}px`,
                        }}
                      >
                        {currentScene.narration}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {previewScenes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Timeline
                  </span>
                  <span className="font-mono text-xs text-primary">
                    {totalDuration}s
                  </span>
                </div>
                <div className="flex gap-0.5 rounded-lg border border-border bg-surface/50 p-1">
                  {previewScenes.map((scene, index) => {
                    const pct = totalDuration > 0
                      ? (scene.duration / totalDuration) * 100
                      : 100 / previewScenes.length;

                    return (
                      <TimelineMarker
                        key={index}
                        index={index}
                        isActive={index === activeScene}
                        onClick={() => handleSceneClick(index)}
                        widthPercent={pct}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Export settings summary */}
            <div className="rounded-lg border border-border bg-surface/50 p-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Export Settings Summary
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Resolution</p>
                  <p className="text-sm font-medium text-foreground">
                    {projectData.renderSettings?.resolution ?? "1080p"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Format</p>
                  <p className="text-sm font-medium text-foreground">
                    {projectData.renderSettings?.format ?? "MP4"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">FPS</p>
                  <p className="text-sm font-medium text-foreground">
                    {projectData.renderSettings?.fps ?? 30}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Aspect Ratio</p>
                  <p className="text-sm font-medium text-foreground">
                    {aspectRatio}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Scene list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilmStrip weight="duotone" className="size-4 text-primary" />
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  Scenes
                </h3>
              </div>
              <Badge variant="outline" className="text-xs">
                {previewScenes.length}
              </Badge>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {previewScenes.length > 0 ? (
                previewScenes.map((scene, index) => (
                  <SceneThumbnail
                    key={index}
                    scene={scene}
                    index={index}
                    isActive={index === activeScene}
                    onClick={() => handleSceneClick(index)}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No scenes available.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Composition info */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Composition
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FilmStrip weight="duotone" className="size-3 text-primary" />
                  <span>
                    {previewScenes.filter((s) => s.videoUrl).length} video clips
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Image weight="duotone" className="size-3 text-primary" />
                  <span>
                    {previewScenes.filter((s) => s.imageUrl).length} images
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <SpeakerHigh weight="duotone" className="size-3 text-primary" />
                  <span>
                    {previewScenes.filter((s) => s.audioUrl).length} voice overs
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MusicNotes weight="duotone" className="size-3 text-primary" />
                  <span>Background music</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Subtitles weight="duotone" className="size-3 text-primary" />
                  <span>Subtitles</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer weight="duotone" className="size-3 text-primary" />
                  <span>{totalDuration}s total duration</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Approve button */}
            <Button
              onClick={handleApprove}
              className="w-full gap-1.5"
            >
              <Check weight="bold" className="size-3.5" />
              Approve & Continue to Render
            </Button>
          </div>
        </div>
      </div>
    </StepContent>
  );
}
