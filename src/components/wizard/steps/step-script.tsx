"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TextAlignLeft,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  FloppyDisk,
  Sparkle,
  SpinnerGap,
  Eye,
  Timer,
  SmileyWink,
  Check,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore, type SceneData } from "@/stores/wizard-store";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mood =
  | "motivating"
  | "informative"
  | "dramatic"
  | "calm"
  | "energetic"
  | "melancholic"
  | "mysterious"
  | "uplifting";

interface LocalScene {
  id?: string;
  orderIndex: number;
  narrationText: string;
  visualDescription: string;
  imagePrompt: string;
  estimatedDuration: number;
  mood: Mood;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOODS: { value: Mood; label: string; color: string }[] = [
  { value: "calm", label: "Calm", color: "text-blue-400" },
  { value: "energetic", label: "Energetic", color: "text-orange-400" },
  { value: "dramatic", label: "Dramatic", color: "text-red-400" },
  { value: "motivating", label: "Motivating", color: "text-yellow-400" },
  { value: "informative", label: "Informative", color: "text-cyan-400" },
  { value: "melancholic", label: "Melancholic", color: "text-indigo-400" },
  { value: "mysterious", label: "Mysterious", color: "text-purple-400" },
  { value: "uplifting", label: "Uplifting", color: "text-emerald-400" },
];

function createEmptyScene(orderIndex: number): LocalScene {
  return {
    orderIndex,
    narrationText: "",
    visualDescription: "",
    imagePrompt: "",
    estimatedDuration: 10,
    mood: "calm",
  };
}

function dbSceneToLocal(scene: SceneData): LocalScene {
  return {
    id: scene.id,
    orderIndex: scene.orderIndex,
    narrationText: scene.narrationText ?? "",
    visualDescription: scene.visualDescription ?? "",
    imagePrompt: scene.imagePrompt ?? "",
    estimatedDuration: scene.estimatedDuration ?? 10,
    mood: scene.mood,
  };
}

// ---------------------------------------------------------------------------
// Scene Card Component
// ---------------------------------------------------------------------------

function SceneCard({
  scene,
  index,
  totalScenes,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  scene: LocalScene;
  index: number;
  totalScenes: number;
  onChange: (updated: LocalScene) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card transition-all hover:border-primary/30">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <Badge
            className="gap-1 bg-primary/10 text-primary border-primary/20 font-mono text-xs"
          >
            Scene {index + 1}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Timer weight="duotone" className="size-3" />
            {scene.estimatedDuration}s
          </Badge>
          <Badge variant="outline" className={cn("gap-1 text-xs", MOODS.find(m => m.value === scene.mood)?.color)}>
            <SmileyWink weight="duotone" className="size-3" />
            {MOODS.find(m => m.value === scene.mood)?.label ?? scene.mood}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={index === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp weight="bold" className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Move up</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={index === totalScenes - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown weight="bold" className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Move down</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {totalScenes > 1 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash weight="duotone" className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete scene</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="space-y-4 p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Narration text */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Narration Text
            </Label>
            <textarea
              value={scene.narrationText}
              onChange={(e) =>
                onChange({ ...scene, narrationText: e.target.value })
              }
              rows={4}
              placeholder="What the narrator says in this scene..."
              className={cn(
                "w-full resize-none rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground/50",
                "outline-none transition-all",
                "focus:border-primary focus:ring-2 focus:ring-primary/20"
              )}
            />
          </div>

          {/* Visual description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Visual Description
            </Label>
            <textarea
              value={scene.visualDescription}
              onChange={(e) =>
                onChange({ ...scene, visualDescription: e.target.value })
              }
              rows={4}
              placeholder="What the viewer sees in this scene..."
              className={cn(
                "w-full resize-none rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground/50",
                "outline-none transition-all",
                "focus:border-primary focus:ring-2 focus:ring-primary/20"
              )}
            />
          </div>
        </div>

        {/* Image prompt */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Image Prompt
          </Label>
          <textarea
            value={scene.imagePrompt}
            onChange={(e) =>
              onChange({ ...scene, imagePrompt: e.target.value })
            }
            rows={2}
            placeholder="AI image generation prompt (or auto-generate from visual description)..."
            className={cn(
              "w-full resize-none rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm font-mono text-foreground",
              "placeholder:text-muted-foreground/50",
              "outline-none transition-all",
              "focus:border-primary focus:ring-2 focus:ring-primary/20"
            )}
          />
        </div>

        {/* Bottom row: mood, duration */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Mood selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Mood
            </Label>
            <Select
              value={scene.mood}
              onValueChange={(val) => onChange({ ...scene, mood: val as Mood })}
            >
              <SelectTrigger className="w-[160px] bg-surface/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOODS.map((mood) => (
                  <SelectItem key={mood.value} value={mood.value}>
                    <span className={mood.color}>{mood.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated duration */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Duration (seconds)
            </Label>
            <Input
              type="number"
              min={1}
              max={600}
              value={scene.estimatedDuration}
              onChange={(e) =>
                onChange({
                  ...scene,
                  estimatedDuration: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              className="w-[100px] bg-surface/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepScript() {
  const projectData = useWizardStore((s) => s.projectData);
  const updateProjectData = useWizardStore((s) => s.updateProjectData);
  const setSaving = useWizardStore((s) => s.setSaving);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);
  const projectId = useWizardStore((s) => s.projectId);
  const currentStep = useWizardStore((s) => s.currentStep);

  // Local scenes state
  const [localScenes, setLocalScenes] = useState<LocalScene[]>([]);
  const localScenesRef = useRef(localScenes);
  localScenesRef.current = localScenes;
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // Initialize local scenes from project data
  useEffect(() => {
    if (!projectData) return;

    if (projectData.scenes.length > 0) {
      // Load from existing DB scenes
      setLocalScenes(
        projectData.scenes
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(dbSceneToLocal)
      );
    } else if (projectData.treatment?.scenes && projectData.treatment.scenes.length > 0) {
      // Bootstrap from treatment scenes if no DB scenes yet
      const treatmentScenes = projectData.treatment.scenes.map(
        (s, i): LocalScene => ({
          orderIndex: i,
          narrationText: s.narration,
          visualDescription: s.visual,
          imagePrompt: "",
          estimatedDuration: Math.round(
            projectData.targetDuration / projectData.treatment!.scenes.length
          ),
          mood: "calm",
        })
      );
      setLocalScenes(treatmentScenes);
    } else {
      // Start with one empty scene
      setLocalScenes([createEmptyScene(0)]);
    }
  }, [projectData]);

  // Update a single scene
  const updateScene = useCallback((index: number, updated: LocalScene) => {
    setLocalScenes((prev) =>
      prev.map((s, i) => (i === index ? updated : s))
    );
    setSaveSuccess(false);
  }, []);

  // Add scene
  const addScene = useCallback(() => {
    setLocalScenes((prev) => [
      ...prev,
      createEmptyScene(prev.length),
    ]);
    setSaveSuccess(false);
  }, []);

  // Delete scene
  const deleteScene = useCallback((index: number) => {
    setLocalScenes((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      // Re-index
      return filtered.map((s, i) => ({ ...s, orderIndex: i }));
    });
    setSaveSuccess(false);
  }, []);

  // Move scene up
  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setLocalScenes((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((s, i) => ({ ...s, orderIndex: i }));
    });
    setSaveSuccess(false);
  }, []);

  // Move scene down
  const moveDown = useCallback((index: number) => {
    setLocalScenes((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((s, i) => ({ ...s, orderIndex: i }));
    });
    setSaveSuccess(false);
  }, []);

  // Auto-generate image prompts from visual descriptions (mock)
  const handleAutoGeneratePrompts = useCallback(async () => {
    setIsAutoGenerating(true);

    // Simulate a delay for the mock generation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setLocalScenes((prev) =>
      prev.map((scene) => {
        if (scene.imagePrompt) return scene; // Skip if already has a prompt
        if (!scene.visualDescription) return scene;

        // Mock: generate a cinematic prompt from the visual description
        const prompt = `Cinematic still, ${scene.visualDescription.toLowerCase()}, professional lighting, 8k resolution, photorealistic, film grain, shallow depth of field`;
        return { ...scene, imagePrompt: prompt };
      })
    );

    setIsAutoGenerating(false);
    setSaveSuccess(false);
  }, []);

  // Save all scenes
  const handleSave = useCallback(async () => {
    if (!projectId) return;

    setIsSaving(true);
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const scenesToSave = localScenes.map((s) => ({
        id: s.id,
        orderIndex: s.orderIndex,
        narrationText: s.narrationText || null,
        visualDescription: s.visualDescription || null,
        imagePrompt: s.imagePrompt || null,
        estimatedDuration: s.estimatedDuration,
        mood: s.mood,
      }));

      const result = await callAction<{ success: boolean; error?: string; scenes?: unknown[] }>("saveScenes", projectId, scenesToSave);

      if (result.success) {
        setSaveSuccess(true);
        markStepCompleted(3);
        // Refresh scenes from the updated project state
        // (The saved scenes may have gotten new IDs for new scenes)
        updateProjectData({
          scenes: localScenes.map((s, i) => ({
            id: s.id ?? `temp-${i}`,
            projectId: projectId,
            orderIndex: s.orderIndex,
            narrationText: s.narrationText || null,
            visualDescription: s.visualDescription || null,
            imagePrompt: s.imagePrompt || null,
            estimatedDuration: s.estimatedDuration,
            mood: s.mood,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        });
      } else {
        setSaveError(result.error ?? "Failed to save scenes");
      }
    } catch {
      setSaveError("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
      setSaving(false);
    }
  }, [projectId, localScenes, setSaving, markStepCompleted, updateProjectData]);

  // Auto-save scenes when navigating away from this step
  const hasAutoSavedRef = useRef(false);
  useEffect(() => {
    // When currentStep changes away from 3, auto-save scenes
    if (currentStep !== 3 && localScenesRef.current.length > 0 && projectId && !hasAutoSavedRef.current) {
      hasAutoSavedRef.current = true;
      const scenesToSave = localScenesRef.current.map((s) => ({
        id: s.id,
        orderIndex: s.orderIndex,
        narrationText: s.narrationText || null,
        visualDescription: s.visualDescription || null,
        imagePrompt: s.imagePrompt || null,
        estimatedDuration: s.estimatedDuration,
        mood: s.mood,
      }));
      callAction("saveScenes", projectId, scenesToSave).then((result) => {
        if ((result as { success: boolean }).success) {
          updateProjectData({
            scenes: localScenesRef.current.map((s, i) => ({
              id: s.id ?? `temp-${i}`,
              projectId: projectId,
              orderIndex: s.orderIndex,
              narrationText: s.narrationText || null,
              visualDescription: s.visualDescription || null,
              imagePrompt: s.imagePrompt || null,
              estimatedDuration: s.estimatedDuration,
              mood: s.mood,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          });
        }
      }).catch(() => {});
    }
    if (currentStep === 3) {
      hasAutoSavedRef.current = false;
    }
  }, [currentStep, projectId, updateProjectData]);

  // Computed values
  const totalDuration = localScenes.reduce(
    (sum, s) => sum + s.estimatedDuration,
    0
  );
  const scenesWithoutPrompts = localScenes.filter(
    (s) => !s.imagePrompt && s.visualDescription
  ).length;

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        {/* Error banner */}
        {saveError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{saveError}</p>
          </div>
        )}

        {/* Top action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <TextAlignLeft weight="duotone" className="size-3" />
              {localScenes.length} {localScenes.length === 1 ? "Scene" : "Scenes"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Timer weight="duotone" className="size-3" />
              {totalDuration}s total
            </Badge>
            {projectData.targetDuration && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-xs",
                  Math.abs(totalDuration - projectData.targetDuration) <= 10
                    ? "border-success/50 text-success"
                    : "border-warning/50 text-warning"
                )}
              >
                Target: {projectData.targetDuration}s
              </Badge>
            )}
            {saveSuccess && (
              <Badge variant="outline" className="gap-1 border-success/50 text-success">
                <Check weight="bold" className="size-3" />
                Saved
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoGeneratePrompts}
              disabled={isAutoGenerating || scenesWithoutPrompts === 0}
              className="gap-1.5"
            >
              {isAutoGenerating ? (
                <SpinnerGap weight="bold" className="size-3.5 animate-spin" />
              ) : (
                <Sparkle weight="duotone" className="size-3.5" />
              )}
              {isAutoGenerating
                ? "Generating..."
                : `Auto-generate Prompts${scenesWithoutPrompts > 0 ? ` (${scenesWithoutPrompts})` : ""}`}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "gap-1.5",
                "bg-gradient-to-r from-primary to-secondary text-white",
                "hover:from-primary/90 hover:to-secondary/90",
                "shadow-lg shadow-primary/20"
              )}
            >
              {isSaving ? (
                <SpinnerGap weight="bold" className="size-3.5 animate-spin" />
              ) : (
                <FloppyDisk weight="duotone" className="size-3.5" />
              )}
              {isSaving ? "Saving..." : "Save Script"}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Scene list */}
        <div className="space-y-4">
          {localScenes.map((scene, index) => (
            <SceneCard
              key={scene.id ?? `new-${index}`}
              scene={scene}
              index={index}
              totalScenes={localScenes.length}
              onChange={(updated) => updateScene(index, updated)}
              onDelete={() => deleteScene(index)}
              onMoveUp={() => moveUp(index)}
              onMoveDown={() => moveDown(index)}
            />
          ))}
        </div>

        {/* Add scene button */}
        <button
          type="button"
          onClick={addScene}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4",
            "text-sm font-medium text-muted-foreground",
            "transition-all hover:border-primary/50 hover:text-primary hover:bg-primary/5"
          )}
        >
          <Plus weight="bold" className="size-4" />
          Add Scene
        </button>

        {/* Preview summary */}
        {localScenes.length > 0 && (
          <div className="rounded-xl border border-border bg-surface/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Eye weight="duotone" className="size-4 text-secondary" />
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Script Summary
              </h3>
            </div>
            <div className="space-y-2">
              {localScenes.map((scene, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground line-clamp-1">
                      {scene.narrationText || (
                        <span className="italic text-muted-foreground">
                          No narration text
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scene.estimatedDuration}s
                      {scene.mood && ` -- ${scene.mood}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StepContent>
  );
}
