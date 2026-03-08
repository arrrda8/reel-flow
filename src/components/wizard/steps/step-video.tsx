"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  FilmStrip,
  Play,
  Pause,
  ArrowRight,
  Check,
  SpinnerGap,
  Timer,
  Image as ImageIcon,
  VideoCamera,
  Warning,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { KieModel } from "@/lib/ai/providers/kie";
import { callAction } from "@/lib/call-action";

// ---------------------------------------------------------------------------
// Video Player with play/pause toggle
// ---------------------------------------------------------------------------

function VideoPlayer({ url, sceneIndex }: { url: string; sceneIndex: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        src={url}
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        muted
        playsInline
        preload="metadata"
        onClick={toggle}
        onEnded={() => setPlaying(false)}
      />
      {/* Play/Pause overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={toggle}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-opacity",
            playing ? "opacity-0 hover:opacity-100" : "opacity-100"
          )}
        >
          {playing ? (
            <Pause weight="fill" className="size-5 text-white" />
          ) : (
            <Play weight="fill" className="size-5 text-white ml-0.5" />
          )}
        </div>
      </div>
      <div className="absolute bottom-1.5 left-1.5 pointer-events-none">
        <Badge className="bg-black/50 text-white text-[10px] backdrop-blur-sm border-0 px-1.5 py-0">
          Video
        </Badge>
      </div>
      <div className="absolute bottom-1.5 right-1.5 pointer-events-none">
        <Badge className="bg-success/80 text-white text-[10px] backdrop-blur-sm border-0 px-1.5 py-0 gap-0.5">
          <Check weight="bold" className="size-2.5" />
          Ready
        </Badge>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Scene Video Row
// ---------------------------------------------------------------------------

type VideoStatus = "idle" | "processing" | "completed" | "error";

function SceneVideoRow({
  sceneIndex,
  narrationText,
  estimatedDuration,
  status,
  errorMessage,
  imageUrl,
  videoUrl,
  hasImage,
  onGenerate,
}: {
  sceneIndex: number;
  narrationText: string | null;
  estimatedDuration: number | null;
  status: VideoStatus;
  errorMessage: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  hasImage: boolean;
  onGenerate: () => void;
}) {
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
        {/* Source image */}
        <div className="relative w-32 shrink-0">
          <div className="aspect-video rounded-lg overflow-hidden bg-surface border border-border">
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`Scene ${sceneIndex + 1} source`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-1">
                  <Badge className="bg-black/50 text-white text-[10px] backdrop-blur-sm border-0 px-1.5 py-0">
                    Image
                  </Badge>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon weight="duotone" className="size-5 text-muted-foreground/50" />
              </div>
            )}
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
                  : status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
            )}
          />
          {status === "processing" && (
            <span className="text-[10px] text-primary font-medium">Converting</span>
          )}
        </div>

        {/* Video output */}
        <div className="relative flex-1 min-w-0">
          <div
            className={cn(
              "aspect-video rounded-lg overflow-hidden",
              status === "completed"
                ? "bg-black"
                : "bg-surface border border-dashed border-border"
            )}
          >
            {status === "completed" && videoUrl ? (
              <VideoPlayer url={videoUrl} sceneIndex={sceneIndex} />
            ) : status === "processing" ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <SpinnerGap weight="bold" className="size-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Processing...</span>
                </div>
              </div>
            ) : status === "error" ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Warning weight="duotone" className="size-5 text-destructive" />
                  <span className="text-xs text-destructive">{errorMessage || "Error"}</span>
                  {hasImage && (
                    <button
                      type="button"
                      onClick={onGenerate}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={!hasImage}
                  className={cn(
                    "flex flex-col items-center gap-1.5 transition-colors",
                    hasImage
                      ? "text-muted-foreground hover:text-primary"
                      : "text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  <VideoCamera weight="duotone" className="size-5" />
                  <span className="text-xs font-medium">
                    {hasImage ? "Generate Video" : "No source image"}
                  </span>
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
  const [errors, setErrors] = useState<Map<number, string>>(new Map());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  // Model selection
  const [models, setModels] = useState<KieModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  // API key check
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Scene image keys (from DB)
  const [imageKeys, setImageKeys] = useState<Map<string, string>>(new Map());
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [hasNoImages, setHasNoImages] = useState(false);

  // Video URLs (presigned from MinIO)
  const [videoUrls, setVideoUrls] = useState<Map<number, string>>(new Map());
  // Video keys stored after generation
  const [videoKeys, setVideoKeys] = useState<Map<number, string>>(new Map());

  // Ref to avoid re-running effects
  const initRef = useRef(false);

  // --- Load API key status + models + scene images on mount ---
  useEffect(() => {
    if (!projectData?.id || initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        // Check API key
        const apiKeyExists = await callAction<boolean>("checkKieApiKey");
        setHasApiKey(apiKeyExists);

        if (apiKeyExists) {
          // Load models
          try {
            const kieModels = await callAction<KieModel[]>("listKieModels");
            setModels(kieModels);
            if (kieModels.length > 0) {
              setSelectedModel(kieModels[0].id);
            } else {
              setModelError("listKieModels returned empty (API key may not be saved correctly)");
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setModelError(msg);
          }
        }

        // Load scene image keys
        try {
          const sceneImageInfos = await callAction<Array<{ sceneId: string; imageKey: string }>>("getSceneImageKeys", projectData!.id);
          const keyMap = new Map<string, string>();
          const urlMap = new Map<string, string>();
          let anyImage = false;

          for (const info of sceneImageInfos) {
            if (info.imageKey) {
              keyMap.set(info.sceneId, info.imageKey);
              anyImage = true;

              // Get presigned URL for display
              try {
                const url = await callAction<string>("getVideoPresignedUrl", info.imageKey);
                urlMap.set(info.sceneId, url);
              } catch {
                // Image URL fetch failed – non-critical
              }
            }
          }

          setImageKeys(keyMap);
          setImageUrls(urlMap);
          setHasNoImages(!anyImage);
        } catch {
          setHasNoImages(true);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setModelError(`Init failed: ${msg}`);
      } finally {
        setIsLoadingModels(false);
      }
    };

    init();
  }, [projectData?.id]);

  const getStatus = (index: number): VideoStatus =>
    statuses.get(index) ?? "idle";

  const handleGenerate = useCallback(
    async (sceneIndex: number) => {
      const scene = scenes[sceneIndex];
      if (!scene || !projectData?.id) return;

      const imageKey = imageKeys.get(scene.id);
      if (!imageKey) {
        setErrors((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, "No source image available");
          return next;
        });
        setStatuses((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, "error");
          return next;
        });
        return;
      }

      if (!selectedModel) {
        setErrors((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, "Please select a model first");
          return next;
        });
        setStatuses((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, "error");
          return next;
        });
        return;
      }

      setStatuses((prev) => {
        const next = new Map(prev);
        next.set(sceneIndex, "processing");
        return next;
      });

      // Clear any previous error
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(sceneIndex);
        return next;
      });

      try {
        const result = await callAction<{ videoKey: string }>(
          "generateVideo",
          projectData.id,
          scene.id,
          imageKey,
          selectedModel,
          scene.estimatedDuration ?? undefined
        );

        // Get presigned URL for the generated video
        const url = await callAction<string>("getVideoPresignedUrl", result.videoKey);

        setVideoKeys((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, result.videoKey);
          return next;
        });

        setVideoUrls((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, url);
          return next;
        });

        setStatuses((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, "completed");
          return next;
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Video generation failed";

        setErrors((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, message);
          return next;
        });

        setStatuses((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, "error");
          return next;
        });
      }
    },
    [scenes, projectData?.id, imageKeys, selectedModel]
  );

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

    // Check if all completed
    const allCompleted = scenes.every((_, i) => {
      const s = statuses.get(i);
      return s === "completed";
    });
    if (allCompleted) {
      markStepCompleted(6);
    }
  }, [scenes, handleGenerate, markStepCompleted, statuses]);

  // Mark step completed when all scenes have videos
  useEffect(() => {
    if (
      scenes.length > 0 &&
      Array.from(statuses.values()).filter((s) => s === "completed").length ===
        scenes.length
    ) {
      markStepCompleted(6);
    }
  }, [statuses, scenes.length, markStepCompleted]);

  const completedCount = Array.from(statuses.values()).filter(
    (s) => s === "completed"
  ).length;

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        {/* API Key missing banner */}
        {hasApiKey === false && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <Warning weight="duotone" className="size-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">
              kie.ai API Key fehlt. Bitte unter Einstellungen &rarr; API Keys hinzufuegen.
            </p>
          </div>
        )}

        {/* No source images banner */}
        {hasNoImages && hasApiKey !== false && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <Warning weight="duotone" className="size-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Bitte zuerst Bilder in Schritt 5 generieren.
            </p>
          </div>
        )}

        {/* Model selection */}
        {hasApiKey !== false && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground shrink-0">
              Video Model:
            </label>
            {isLoadingModels ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <SpinnerGap weight="bold" className="size-4 animate-spin" />
                Loading models...
              </div>
            ) : modelError ? (
              <span className="text-sm text-destructive">
                Error: {modelError}
              </span>
            ) : models.length > 0 ? (
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-muted-foreground">
                No models available — check your kie.ai API Key
              </span>
            )}
          </div>
        )}

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
            disabled={
              isBulkGenerating ||
              scenes.length === 0 ||
              hasApiKey === false ||
              !selectedModel
            }
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
                errorMessage={errors.get(index) ?? null}
                imageUrl={imageUrls.get(scene.id) ?? null}
                videoUrl={videoUrls.get(index) ?? null}
                hasImage={imageKeys.has(scene.id)}
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
