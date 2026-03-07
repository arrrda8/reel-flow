"use client";

import { useCallback, useState } from "react";
import {
  FilmStrip,
  Play,
  ArrowRight,
  Check,
  SpinnerGap,
  Timer,
  Image,
  VideoCamera,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Gradient placeholders for video thumbnails
// ---------------------------------------------------------------------------

const VIDEO_GRADIENTS = [
  "from-violet-900/60 via-indigo-800/40 to-blue-900/60",
  "from-rose-900/60 via-pink-800/40 to-purple-900/60",
  "from-amber-900/60 via-orange-800/40 to-red-900/60",
  "from-emerald-900/60 via-teal-800/40 to-cyan-900/60",
  "from-sky-900/60 via-blue-800/40 to-indigo-900/60",
  "from-fuchsia-900/60 via-purple-800/40 to-violet-900/60",
];

const IMAGE_GRADIENTS = [
  "from-violet-600/40 via-indigo-500/30 to-blue-600/40",
  "from-rose-600/40 via-pink-500/30 to-purple-600/40",
  "from-amber-600/40 via-orange-500/30 to-red-600/40",
  "from-emerald-600/40 via-teal-500/30 to-cyan-600/40",
  "from-sky-600/40 via-blue-500/30 to-indigo-600/40",
  "from-fuchsia-600/40 via-purple-500/30 to-violet-600/40",
];

// ---------------------------------------------------------------------------
// Scene Video Row
// ---------------------------------------------------------------------------

type VideoStatus = "idle" | "processing" | "completed";

function SceneVideoRow({
  sceneIndex,
  narrationText,
  estimatedDuration,
  status,
  onGenerate,
}: {
  sceneIndex: number;
  narrationText: string | null;
  estimatedDuration: number | null;
  status: VideoStatus;
  onGenerate: () => void;
}) {
  const imgGradient = IMAGE_GRADIENTS[sceneIndex % IMAGE_GRADIENTS.length];
  const vidGradient = VIDEO_GRADIENTS[sceneIndex % VIDEO_GRADIENTS.length];

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
          Scene {sceneIndex + 1}
        </Badge>
        <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
          {narrationText || "No narration text"}
        </p>
        {estimatedDuration && (
          <Badge variant="outline" className="gap-1 text-xs shrink-0">
            <Timer weight="duotone" className="size-3" />
            {estimatedDuration}s
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Source image placeholder */}
        <div className="relative w-32 shrink-0">
          <div
            className={cn(
              "aspect-video rounded-lg bg-gradient-to-br overflow-hidden",
              imgGradient
            )}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <Image weight="duotone" className="size-5 text-white/50" />
            </div>
            <div className="absolute bottom-1 left-1">
              <Badge className="bg-black/50 text-white text-[10px] backdrop-blur-sm border-0 px-1.5 py-0">
                Image
              </Badge>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <ArrowRight
            weight="bold"
            className={cn(
              "size-5",
              status === "completed"
                ? "text-success"
                : status === "processing"
                  ? "text-primary animate-pulse"
                  : "text-muted-foreground"
            )}
          />
          {status === "processing" && (
            <span className="text-[10px] text-primary font-medium">Converting</span>
          )}
        </div>

        {/* Video output placeholder */}
        <div className="relative flex-1 min-w-0">
          <div
            className={cn(
              "aspect-video rounded-lg overflow-hidden",
              status === "completed"
                ? `bg-gradient-to-br ${vidGradient}`
                : "bg-surface border border-dashed border-border"
            )}
          >
            {status === "completed" ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                    <Play weight="fill" className="size-5 text-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-1.5 left-1.5">
                  <Badge className="bg-black/50 text-white text-[10px] backdrop-blur-sm border-0 px-1.5 py-0">
                    Video
                  </Badge>
                </div>
                <div className="absolute bottom-1.5 right-1.5">
                  <Badge className="bg-success/80 text-white text-[10px] backdrop-blur-sm border-0 px-1.5 py-0 gap-0.5">
                    <Check weight="bold" className="size-2.5" />
                    Ready
                  </Badge>
                </div>
              </>
            ) : status === "processing" ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <SpinnerGap weight="bold" className="size-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Processing...</span>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <button
                  type="button"
                  onClick={onGenerate}
                  className="flex flex-col items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                >
                  <VideoCamera weight="duotone" className="size-5" />
                  <span className="text-xs font-medium">Generate Video</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepVideo() {
  const projectData = useWizardStore((s) => s.projectData);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);

  const scenes = projectData?.scenes ?? [];

  const [statuses, setStatuses] = useState<Map<number, VideoStatus>>(new Map());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const getStatus = (index: number): VideoStatus =>
    statuses.get(index) ?? "idle";

  const handleGenerate = useCallback(async (sceneIndex: number) => {
    setStatuses((prev) => {
      const next = new Map(prev);
      next.set(sceneIndex, "processing");
      return next;
    });

    // Mock processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setStatuses((prev) => {
      const next = new Map(prev);
      next.set(sceneIndex, "completed");
      return next;
    });
  }, []);

  const handleGenerateAll = useCallback(async () => {
    setIsBulkGenerating(true);
    setBulkProgress(0);

    for (let i = 0; i < scenes.length; i++) {
      if (getStatus(i) === "completed") {
        setBulkProgress(((i + 1) / scenes.length) * 100);
        continue;
      }
      await handleGenerate(i);
      setBulkProgress(((i + 1) / scenes.length) * 100);
    }

    setIsBulkGenerating(false);
    markStepCompleted(6);
  }, [scenes.length, handleGenerate, markStepCompleted]);

  const completedCount = Array.from(statuses.values()).filter(
    (s) => s === "completed"
  ).length;

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <FilmStrip weight="duotone" className="size-3" />
              {scenes.length} {scenes.length === 1 ? "Clip" : "Clips"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <VideoCamera weight="duotone" className="size-3" />
              {completedCount}/{scenes.length} generated
            </Badge>
            {completedCount === scenes.length && scenes.length > 0 && (
              <Badge variant="outline" className="gap-1 border-success/50 text-success">
                <Check weight="bold" className="size-3" />
                All videos ready
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleGenerateAll}
            disabled={isBulkGenerating || scenes.length === 0}
            className={cn(
              "gap-1.5",
              "bg-gradient-to-r from-primary to-secondary text-white",
              "hover:from-primary/90 hover:to-secondary/90",
              "shadow-lg shadow-primary/20",
              "disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
            )}
          >
            {isBulkGenerating ? (
              <SpinnerGap weight="bold" className="size-3.5 animate-spin" />
            ) : (
              <FilmStrip weight="duotone" className="size-3.5" />
            )}
            {isBulkGenerating ? "Generating..." : "Generate All Videos"}
          </Button>
        </div>

        {/* Bulk progress */}
        {isBulkGenerating && (
          <div className="space-y-2">
            <Progress value={bulkProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Converting images to video... {Math.round(bulkProgress)}%
            </p>
          </div>
        )}

        <Separator />

        {/* Scene list */}
        {scenes.length > 0 ? (
          <div className="space-y-3">
            {scenes.map((scene, index) => (
              <SceneVideoRow
                key={scene.id}
                sceneIndex={index}
                narrationText={scene.narrationText}
                estimatedDuration={scene.estimatedDuration}
                status={getStatus(index)}
                onGenerate={() => handleGenerate(index)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-16 text-center">
            <FilmStrip weight="duotone" className="size-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No scenes found. Please complete the Script and Image steps first.
            </p>
          </div>
        )}

        {/* Duration summary */}
        {completedCount > 0 && (
          <div className="rounded-lg border border-border bg-surface/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer weight="duotone" className="size-4 text-secondary" />
                <span className="text-sm font-medium text-foreground">
                  Total Duration
                </span>
              </div>
              <span className="font-mono text-sm text-primary">
                {scenes.reduce((sum, s) => sum + (s.estimatedDuration ?? 0), 0)}s
              </span>
            </div>
          </div>
        )}
      </div>
    </StepContent>
  );
}
