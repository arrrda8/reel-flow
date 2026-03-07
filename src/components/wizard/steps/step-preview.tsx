"use client";

import { useCallback, useState } from "react";
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
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

const THUMB_COLORS = [
  "bg-slate-700/50",
  "bg-zinc-700/50",
  "bg-neutral-700/50",
  "bg-stone-700/50",
  "bg-gray-700/50",
  "bg-slate-600/50",
];

function SceneThumbnail({
  index,
  narrationText,
  duration,
  isActive,
  onClick,
}: {
  index: number;
  narrationText: string | null;
  duration: number | null;
  isActive: boolean;
  onClick: () => void;
}) {
  const thumbColor = THUMB_COLORS[index % THUMB_COLORS.length];

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
      <div
        className={cn(
          "relative aspect-video w-20 shrink-0 overflow-hidden rounded-md",
          thumbColor
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Image weight="duotone" className="size-4 text-white/40" />
        </div>
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play weight="fill" className="size-4 text-white" />
          </div>
        )}
        <div className="absolute bottom-0.5 right-0.5">
          <span className="rounded bg-black/60 px-1 py-0.5 text-[9px] font-mono text-white">
            {duration ?? 0}s
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-medium", isActive ? "text-primary" : "text-foreground")}>
          Scene {index + 1}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {narrationText || "No narration"}
        </p>
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeScene, setActiveScene] = useState(0);

  const scenes = projectData?.scenes ?? [];
  const totalDuration = scenes.reduce(
    (sum, s) => sum + (s.estimatedDuration ?? 0),
    0
  );

  const aspectRatio = projectData?.aspectRatio ?? "16:9";
  const isPortrait = aspectRatio === "9:16" || aspectRatio === "4:5";

  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
    if (!isPlaying) {
      // Mock: auto-advance through scenes
      let current = activeScene;
      const interval = setInterval(() => {
        current++;
        if (current >= scenes.length) {
          clearInterval(interval);
          setIsPlaying(false);
          setActiveScene(0);
          return;
        }
        setActiveScene(current);
      }, 2000);

      // Cleanup after max time
      setTimeout(() => {
        clearInterval(interval);
        setIsPlaying(false);
      }, scenes.length * 2000 + 100);
    }
  }, [isPlaying, activeScene, scenes.length]);

  const handleApprove = useCallback(() => {
    markStepCompleted(9);
  }, [markStepCompleted]);

  if (!projectData) return <StepContent isLoading />;

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
            {/* Video preview */}
            <div className="flex justify-center">
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl border border-border bg-slate-900",
                  isPortrait
                    ? "aspect-[9/16] max-h-[500px] w-full max-w-[280px]"
                    : "aspect-video w-full"
                )}
              >
                {/* Scene background */}
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-500",
                    THUMB_COLORS[activeScene % THUMB_COLORS.length]
                  )}
                />

                {/* Scene number overlay */}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-black/50 text-white text-xs backdrop-blur-sm border-0">
                    Scene {activeScene + 1} / {scenes.length || 1}
                  </Badge>
                </div>

                {/* Play / Pause button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
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
                </div>

                {/* Mock subtitle */}
                {scenes[activeScene]?.narrationText && (
                  <div className="absolute bottom-4 inset-x-4">
                    <div className="rounded-lg bg-black/50 px-3 py-2 backdrop-blur-sm text-center">
                      <p className="text-xs text-white font-medium line-clamp-2">
                        {scenes[activeScene].narrationText}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {scenes.length > 0 && (
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
                  {scenes.map((scene, index) => {
                    const pct = totalDuration > 0
                      ? ((scene.estimatedDuration ?? 0) / totalDuration) * 100
                      : 100 / scenes.length;

                    return (
                      <TimelineMarker
                        key={scene.id}
                        index={index}
                        isActive={index === activeScene}
                        onClick={() => setActiveScene(index)}
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
                {scenes.length}
              </Badge>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {scenes.length > 0 ? (
                scenes.map((scene, index) => (
                  <SceneThumbnail
                    key={scene.id}
                    index={index}
                    narrationText={scene.narrationText}
                    duration={scene.estimatedDuration}
                    isActive={index === activeScene}
                    onClick={() => setActiveScene(index)}
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
                  <span>{scenes.length} video clips</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <SpeakerHigh weight="duotone" className="size-3 text-primary" />
                  <span>Voice over track</span>
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
