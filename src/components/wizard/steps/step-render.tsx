"use client";

import { useCallback, useRef, useState } from "react";
import {
  Export,
  GearSix,
  X,
  Check,
  SpinnerGap,
  DownloadSimple,
  ShareNetwork,
  FilmStrip,
  Timer,
  HardDrive,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  LinkSimple,
  Confetti,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESOLUTIONS = [
  { value: "720p", label: "720p (HD)", pixels: "1280x720" },
  { value: "1080p", label: "1080p (Full HD)", pixels: "1920x1080" },
  { value: "4K", label: "4K (Ultra HD)", pixels: "3840x2160" },
];

const FPS_OPTIONS = [
  { value: 24, label: "24 fps (Cinematic)" },
  { value: 30, label: "30 fps (Standard)" },
  { value: 60, label: "60 fps (Smooth)" },
];

const FORMATS = [
  { value: "MP4", label: "MP4 (H.264)" },
  { value: "MOV", label: "MOV (ProRes)" },
  { value: "WebM", label: "WebM (VP9)" },
];

const QUALITIES = [
  { value: "draft", label: "Draft", description: "Fast render, lower quality", sizeFactor: 0.3 },
  { value: "standard", label: "Standard", description: "Balanced quality and speed", sizeFactor: 0.6 },
  { value: "high", label: "High", description: "High quality, slower render", sizeFactor: 0.85 },
  { value: "ultra", label: "Ultra", description: "Maximum quality, longest render", sizeFactor: 1.0 },
];

const RENDER_OPERATIONS = [
  "Preparing assets...",
  "Compositing video clips...",
  "Applying transitions...",
  "Rendering voice over...",
  "Mixing background music...",
  "Burning subtitles...",
  "Encoding final output...",
  "Optimizing file size...",
  "Finalizing export...",
];

function estimateFileSize(
  resolution: string,
  fps: number,
  quality: string,
  durationSecs: number
): string {
  // Base MB per second at 1080p/30fps/high
  const baseMBPerSec = 1.2;

  const resFactor =
    resolution === "4K" ? 4 : resolution === "1080p" ? 1 : 0.5;
  const fpsFactor = fps / 30;
  const qualFactor =
    QUALITIES.find((q) => q.value === quality)?.sizeFactor ?? 0.6;

  const totalMB = baseMBPerSec * resFactor * fpsFactor * qualFactor * durationSecs;

  if (totalMB > 1024) {
    return `${(totalMB / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(totalMB)} MB`;
}

function estimateRenderTime(
  resolution: string,
  quality: string,
  durationSecs: number
): string {
  // Base: render time = 2x real-time at 1080p/standard
  const baseFactor = 2;
  const resFactor =
    resolution === "4K" ? 4 : resolution === "1080p" ? 1 : 0.5;
  const qualFactor =
    quality === "ultra" ? 3 : quality === "high" ? 2 : quality === "standard" ? 1 : 0.5;

  const totalSecs = durationSecs * baseFactor * resFactor * qualFactor;

  if (totalSecs > 60) {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.round(totalSecs % 60);
    return `~${mins}m ${secs}s`;
  }
  return `~${Math.round(totalSecs)}s`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepRender() {
  const projectData = useWizardStore((s) => s.projectData);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);

  const [resolution, setResolution] = useState(
    projectData?.renderSettings?.resolution ?? "1080p"
  );
  const [fps, setFps] = useState(projectData?.renderSettings?.fps ?? 30);
  const [format, setFormat] = useState(
    projectData?.renderSettings?.format ?? "MP4"
  );
  const [quality, setQuality] = useState(
    projectData?.renderSettings?.quality ?? "high"
  );

  // Render state
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const cancelRef = useRef(false);

  const scenes = projectData?.scenes ?? [];
  const totalDuration = scenes.reduce(
    (sum, s) => sum + (s.estimatedDuration ?? 0),
    0
  );

  const fileSize = estimateFileSize(resolution, fps, quality, totalDuration || 60);
  const renderTime = estimateRenderTime(resolution, quality, totalDuration || 60);

  const handleStartRender = useCallback(async () => {
    setIsRendering(true);
    setRenderProgress(0);
    setIsCompleted(false);
    cancelRef.current = false;

    const totalSteps = RENDER_OPERATIONS.length;

    for (let i = 0; i < totalSteps; i++) {
      if (cancelRef.current) {
        setIsRendering(false);
        setRenderProgress(0);
        setCurrentOperation("");
        return;
      }

      setCurrentOperation(RENDER_OPERATIONS[i]);

      // Progress per step
      const stepStart = (i / totalSteps) * 100;
      const stepEnd = ((i + 1) / totalSteps) * 100;

      // Animate progress within each step
      const subSteps = 5;
      for (let j = 0; j < subSteps; j++) {
        if (cancelRef.current) {
          setIsRendering(false);
          setRenderProgress(0);
          setCurrentOperation("");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
        setRenderProgress(
          stepStart + ((stepEnd - stepStart) * (j + 1)) / subSteps
        );
      }
    }

    setRenderProgress(100);
    setCurrentOperation("Complete!");
    setIsRendering(false);
    setIsCompleted(true);
    markStepCompleted(10);
  }, [markStepCompleted]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  // Remaining time estimate during render
  const remainingTime = (() => {
    if (!isRendering || renderProgress === 0) return "";
    // Rough estimate based on progress
    const elapsed = renderProgress;
    const remaining = 100 - elapsed;
    const factor = remaining / elapsed;
    const estimatedSecsLeft = factor * 9; // ~9 seconds total mock render
    if (estimatedSecsLeft > 60) {
      return `~${Math.floor(estimatedSecsLeft / 60)}m ${Math.round(estimatedSecsLeft % 60)}s remaining`;
    }
    return `~${Math.round(estimatedSecsLeft)}s remaining`;
  })();

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        {/* Completed state */}
        {isCompleted && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <Confetti weight="duotone" className="size-7 text-success" />
              </div>
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Your Video is Ready!
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your video has been rendered successfully. Download it or share directly.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="gap-2"
              >
                <DownloadSimple weight="duotone" className="size-5" />
                Download Video
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <ShareNetwork weight="duotone" className="size-5" />
                Share
              </Button>
            </div>

            {/* Share options */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/50 text-muted-foreground transition-colors hover:border-red-500/50 hover:text-red-500"
              >
                <YoutubeLogo weight="duotone" className="size-5" />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/50 text-muted-foreground transition-colors hover:border-pink-500/50 hover:text-pink-500"
              >
                <InstagramLogo weight="duotone" className="size-5" />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/50 text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
              >
                <TiktokLogo weight="duotone" className="size-5" />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/50 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <LinkSimple weight="duotone" className="size-5" />
              </button>
            </div>

            {/* File info */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <Badge variant="outline" className="gap-1">
                <FilmStrip weight="duotone" className="size-3" />
                {format}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {resolution}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <HardDrive weight="duotone" className="size-3" />
                {fileSize}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Timer weight="duotone" className="size-3" />
                {totalDuration}s
              </Badge>
            </div>
          </div>
        )}

        {/* Rendering progress */}
        {isRendering && (
          <div className="rounded-xl border border-primary/30 bg-card p-6">
            <div className="text-center mb-4">
              <div className="flex justify-center mb-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <SpinnerGap weight="bold" className="size-7 animate-spin text-primary" />
                </div>
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Rendering Your Video
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Please do not close this window.
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-3">
              <Progress value={renderProgress} className="h-3" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {currentOperation}
                </p>
                <span className="font-mono text-sm text-primary">
                  {Math.round(renderProgress)}%
                </span>
              </div>
              {remainingTime && (
                <p className="text-xs text-muted-foreground text-center">
                  {remainingTime}
                </p>
              )}
            </div>

            {/* Cancel button */}
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <X weight="bold" className="size-3.5" />
                Cancel Render
              </Button>
            </div>
          </div>
        )}

        {/* Render settings form (hidden during render and after completion) */}
        {!isRendering && !isCompleted && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <GearSix weight="duotone" className="size-4 text-primary" />
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  Render Settings
                </h3>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Resolution */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Resolution
                  </Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger className="w-full bg-surface/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="flex items-center gap-2">
                            <span>{r.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {r.pixels}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* FPS */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Frame Rate
                  </Label>
                  <Select
                    value={fps.toString()}
                    onValueChange={(val) => setFps(parseInt(val))}
                  >
                    <SelectTrigger className="w-full bg-surface/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FPS_OPTIONS.map((f) => (
                        <SelectItem
                          key={f.value}
                          value={f.value.toString()}
                        >
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Format */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Format
                  </Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger className="w-full bg-surface/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quality */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Quality
                  </Label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger className="w-full bg-surface/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITIES.map((q) => (
                        <SelectItem key={q.value} value={q.value}>
                          <div className="flex items-center gap-2">
                            <span>{q.label}</span>
                            <span className="text-xs text-muted-foreground">
                              -- {q.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Estimates */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive weight="duotone" className="size-4 text-secondary" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Estimated File Size
                  </p>
                </div>
                <p className="font-heading text-xl font-bold text-foreground">
                  {fileSize}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Timer weight="duotone" className="size-4 text-secondary" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Estimated Render Time
                  </p>
                </div>
                <p className="font-heading text-xl font-bold text-foreground">
                  {renderTime}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FilmStrip weight="duotone" className="size-4 text-secondary" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Video Duration
                  </p>
                </div>
                <p className="font-heading text-xl font-bold text-foreground">
                  {totalDuration > 0 ? `${totalDuration}s` : "N/A"}
                </p>
              </div>
            </div>

            {/* Quality preview */}
            <div className="grid gap-2 sm:grid-cols-4">
              {QUALITIES.map((q) => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => setQuality(q.value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    quality === q.value
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                      : "border-border bg-surface/50 hover:border-primary/50"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      quality === q.value
                        ? "text-primary"
                        : "text-foreground"
                    )}
                  >
                    {q.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {q.description}
                  </p>
                </button>
              ))}
            </div>

            <Separator />

            {/* Start Render Button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleStartRender}
                className="gap-2 px-10"
              >
                <Export weight="duotone" className="size-5" />
                Start Render
              </Button>
            </div>
          </>
        )}

        {/* Render again if completed */}
        {isCompleted && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setIsCompleted(false)}
              className="gap-1.5"
            >
              <GearSix weight="duotone" className="size-3.5" />
              Change Settings & Re-render
            </Button>
          </div>
        )}
      </div>
    </StepContent>
  );
}
