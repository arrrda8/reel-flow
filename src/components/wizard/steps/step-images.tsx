"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  ArrowClockwise,
  Check,
  SpinnerGap,
  Sparkle,
  Eye,
  Warning,
  PencilSimple,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  generateImagePrompt,
  generateImage,
  getImageUrl,
  loadSceneImages,
  selectImageVariant,
  type SceneImageData,
} from "@/lib/image-actions";

// ---------------------------------------------------------------------------
// Image Slot Component
// ---------------------------------------------------------------------------

function ImageSlot({
  sceneIndex,
  variantIndex,
  imageUrl,
  isSelected,
  isGenerating,
  error,
  onGenerate,
  onSelect,
  onRegenerate,
}: {
  sceneIndex: number;
  variantIndex: number;
  imageUrl: string | null;
  isSelected: boolean;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  onSelect: () => void;
  onRegenerate: () => void;
}) {
  const isGenerated = !!imageUrl;

  return (
    <div
      className={cn(
        "group relative aspect-video overflow-hidden rounded-lg border-2 transition-all",
        isSelected
          ? "border-primary shadow-lg shadow-primary/20"
          : isGenerated
            ? "border-border hover:border-primary/50 cursor-pointer"
            : "border-dashed border-border"
      )}
      onClick={isGenerated ? onSelect : undefined}
    >
      {isGenerated ? (
        <>
          {/* Real generated image */}
          <img
            src={imageUrl}
            alt={`Scene ${sceneIndex + 1} - Variant ${variantIndex + 1}`}
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Selection badge */}
          {isSelected && (
            <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg">
              <Check weight="bold" className="size-3.5 text-white" />
            </div>
          )}

          {/* Variant label */}
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-black/50 text-white text-xs backdrop-blur-sm border-0">
              Variant {variantIndex + 1}
            </Badge>
          </div>

          {/* Regenerate button on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-card"
            >
              <ArrowClockwise weight="bold" className="size-3" />
              Regenerate
            </button>
          </div>
        </>
      ) : (
        /* Empty slot with generate button or error */
        <div className="flex h-full items-center justify-center bg-surface/30">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2">
              <SpinnerGap weight="bold" className="size-5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Generating...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 px-3 text-center">
              <Warning weight="duotone" className="size-5 text-destructive" />
              <span className="text-xs text-destructive line-clamp-2">{error}</span>
              <button
                type="button"
                onClick={onGenerate}
                className="text-xs text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGenerate}
              className="flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
            >
              <Sparkle weight="duotone" className="size-5" />
              <span className="text-xs font-medium">Generate</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene Image Group
// ---------------------------------------------------------------------------

function SceneImageGroup({
  sceneIndex,
  sceneId,
  imagePrompt,
  narrationText,
  visualDescription,
  variantUrls,
  selectedVariant,
  generatingVariants,
  variantErrors,
  editedPrompt,
  isPromptEditing,
  onPromptChange,
  onTogglePromptEdit,
  onGenerate,
  onSelect,
  onRegenerate,
}: {
  sceneIndex: number;
  sceneId: string;
  imagePrompt: string | null;
  narrationText: string | null;
  visualDescription: string | null;
  variantUrls: Map<number, string>;
  selectedVariant: number | null;
  generatingVariants: Set<number>;
  variantErrors: Map<number, string>;
  editedPrompt: string;
  isPromptEditing: boolean;
  onPromptChange: (prompt: string) => void;
  onTogglePromptEdit: () => void;
  onGenerate: (variant: number) => void;
  onSelect: (variant: number) => void;
  onRegenerate: (variant: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
              Scene {sceneIndex + 1}
            </Badge>
            {variantUrls.size > 0 && selectedVariant !== null && (
              <Badge variant="outline" className="gap-1 border-success/50 text-success text-xs">
                <Check weight="bold" className="size-2.5" />
                Selected
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={onTogglePromptEdit}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <PencilSimple weight="bold" className="size-3" />
            {isPromptEditing ? "Done" : "Edit Prompt"}
          </button>
        </div>

        {/* Visual description (always shown as context) */}
        {visualDescription && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
            <span className="font-medium text-foreground/70">Visual:</span> {visualDescription}
          </p>
        )}

        {/* Editable image prompt */}
        {isPromptEditing ? (
          <textarea
            value={editedPrompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-md border border-border bg-surface/50 px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="Image generation prompt will be auto-generated, or type your own..."
          />
        ) : editedPrompt ? (
          <p className="mt-2 text-xs font-mono text-muted-foreground line-clamp-2">
            <span className="font-medium text-foreground/70">Prompt:</span> {editedPrompt}
          </p>
        ) : narrationText ? (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-1 italic">
            {narrationText}
          </p>
        ) : null}
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((variantIndex) => (
            <ImageSlot
              key={variantIndex}
              sceneIndex={sceneIndex}
              variantIndex={variantIndex}
              imageUrl={variantUrls.get(variantIndex) ?? null}
              isSelected={selectedVariant === variantIndex}
              isGenerating={generatingVariants.has(variantIndex)}
              error={variantErrors.get(variantIndex) ?? null}
              onGenerate={() => onGenerate(variantIndex)}
              onSelect={() => onSelect(variantIndex)}
              onRegenerate={() => onRegenerate(variantIndex)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepImages() {
  const projectData = useWizardStore((s) => s.projectData);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);

  const scenes = projectData?.scenes ?? [];

  // Image URLs per scene per variant: Map<sceneIndex, Map<variantIndex, url>>
  const [imageUrls, setImageUrls] = useState<Map<number, Map<number, string>>>(new Map());
  // Track which variant is selected per scene
  const [selectedVariants, setSelectedVariants] = useState<Map<number, number>>(new Map());
  // Track which variants are currently generating
  const [generatingVariants, setGeneratingVariants] = useState<Map<number, Set<number>>>(new Map());
  // Track errors per variant: Map<sceneIndex, Map<variantIndex, errorMessage>>
  const [variantErrors, setVariantErrors] = useState<Map<number, Map<number, string>>>(new Map());

  // Editable prompts per scene
  const [editedPrompts, setEditedPrompts] = useState<Map<number, string>>(new Map());
  // Which scenes have prompt editing open
  const [editingPrompts, setEditingPrompts] = useState<Set<number>>(new Set());

  // API key missing banner
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // Bulk generation
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  // Track if we already loaded existing images
  const loadedRef = useRef(false);

  // Load existing images on mount
  useEffect(() => {
    if (!projectData?.id || loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const existing = await loadSceneImages(projectData.id);
        if (existing.length === 0) return;

        const urlMap = new Map<number, Map<number, string>>();
        const selMap = new Map<number, number>();
        const promptMap = new Map<number, string>();

        for (const img of existing) {
          // Find scene index by scene ID
          const sceneIdx = scenes.findIndex((s) => s.id === img.sceneId);
          if (sceneIdx === -1) continue;

          if (!urlMap.has(sceneIdx)) urlMap.set(sceneIdx, new Map());
          if (img.presignedUrl) {
            urlMap.get(sceneIdx)!.set(img.variantIndex, img.presignedUrl);
          }
          if (img.isSelected) {
            selMap.set(sceneIdx, img.variantIndex);
          }
          if (img.promptUsed && !promptMap.has(sceneIdx)) {
            promptMap.set(sceneIdx, img.promptUsed);
          }
        }

        setImageUrls(urlMap);
        setSelectedVariants(selMap);
        setEditedPrompts(promptMap);
      } catch {
        // Silently fail loading existing images
      }
    })();
  }, [projectData?.id, scenes]);

  // Initialize prompts from scene imagePrompt field
  useEffect(() => {
    if (scenes.length === 0) return;
    setEditedPrompts((prev) => {
      const next = new Map(prev);
      for (let i = 0; i < scenes.length; i++) {
        if (!next.has(i) && scenes[i].imagePrompt) {
          next.set(i, scenes[i].imagePrompt!);
        }
      }
      return next;
    });
  }, [scenes]);

  const setError = useCallback((sceneIndex: number, variantIndex: number, error: string | null) => {
    setVariantErrors((prev) => {
      const next = new Map(prev);
      const sceneMap = new Map(next.get(sceneIndex) ?? []);
      if (error) {
        sceneMap.set(variantIndex, error);
      } else {
        sceneMap.delete(variantIndex);
      }
      next.set(sceneIndex, sceneMap);
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async (sceneIndex: number, variantIndex: number) => {
    if (!projectData) return;
    const scene = scenes[sceneIndex];
    if (!scene) return;

    // Clear any previous error
    setError(sceneIndex, variantIndex, null);

    // Mark as generating
    setGeneratingVariants((prev) => {
      const next = new Map(prev);
      const sceneSet = new Set(next.get(sceneIndex) ?? []);
      sceneSet.add(variantIndex);
      next.set(sceneIndex, sceneSet);
      return next;
    });

    try {
      // Step 1: Get or use existing prompt
      let prompt = editedPrompts.get(sceneIndex) ?? "";
      if (!prompt) {
        prompt = await generateImagePrompt(
          projectData.id,
          scene.visualDescription ?? "",
          scene.narrationText ?? ""
        );
        // Save the generated prompt
        setEditedPrompts((prev) => {
          const next = new Map(prev);
          next.set(sceneIndex, prompt);
          return next;
        });
      }

      // Step 2: Generate the image
      const result = await generateImage(
        projectData.id,
        scene.id,
        prompt,
        variantIndex,
        projectData.aspectRatio ?? "16:9"
      );

      // Step 3: Get presigned URL for display
      const url = await getImageUrl(result.imageKey);

      // Update the image URL
      setImageUrls((prev) => {
        const next = new Map(prev);
        if (!next.has(sceneIndex)) next.set(sceneIndex, new Map());
        next.get(sceneIndex)!.set(variantIndex, url);
        return next;
      });

      // Auto-select first generated variant
      setSelectedVariants((prev) => {
        if (prev.has(sceneIndex)) return prev;
        const next = new Map(prev);
        next.set(sceneIndex, variantIndex);
        return next;
      });

      // Persist selection
      await selectImageVariant(scene.id, variantIndex).catch(() => {});

      setApiKeyMissing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image generation failed";

      if (message.includes("No NanoBanana API key")) {
        setApiKeyMissing(true);
      }

      setError(sceneIndex, variantIndex, message);
    } finally {
      // Remove from generating
      setGeneratingVariants((prev) => {
        const next = new Map(prev);
        const sceneSet = new Set(next.get(sceneIndex) ?? []);
        sceneSet.delete(variantIndex);
        next.set(sceneIndex, sceneSet);
        return next;
      });
    }
  }, [projectData, scenes, editedPrompts, setError]);

  const handleSelect = useCallback(async (sceneIndex: number, variantIndex: number) => {
    const scene = scenes[sceneIndex];
    setSelectedVariants((prev) => {
      const next = new Map(prev);
      next.set(sceneIndex, variantIndex);
      return next;
    });
    // Persist selection
    if (scene) {
      await selectImageVariant(scene.id, variantIndex).catch(() => {});
    }
  }, [scenes]);

  const handleRegenerate = useCallback(async (sceneIndex: number, variantIndex: number) => {
    // Remove existing URL
    setImageUrls((prev) => {
      const next = new Map(prev);
      const sceneMap = new Map(next.get(sceneIndex) ?? []);
      sceneMap.delete(variantIndex);
      next.set(sceneIndex, sceneMap);
      return next;
    });

    // Generate again
    await handleGenerate(sceneIndex, variantIndex);
  }, [handleGenerate]);

  const handleGenerateAll = useCallback(async () => {
    setIsBulkGenerating(true);
    setBulkProgress(0);

    const totalSlots = scenes.length * 3;
    let completed = 0;

    for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
      for (let varIdx = 0; varIdx < 3; varIdx++) {
        const existingUrls = imageUrls.get(sceneIdx);
        if (existingUrls?.has(varIdx)) {
          completed++;
          setBulkProgress((completed / totalSlots) * 100);
          continue;
        }

        await handleGenerate(sceneIdx, varIdx);
        completed++;
        setBulkProgress((completed / totalSlots) * 100);

        // If API key is missing, abort bulk generation
        if (apiKeyMissing) {
          setIsBulkGenerating(false);
          return;
        }
      }
    }

    setIsBulkGenerating(false);
    markStepCompleted(5);
  }, [scenes.length, imageUrls, handleGenerate, markStepCompleted, apiKeyMissing]);

  const handlePromptChange = useCallback((sceneIndex: number, prompt: string) => {
    setEditedPrompts((prev) => {
      const next = new Map(prev);
      next.set(sceneIndex, prompt);
      return next;
    });
  }, []);

  const handleTogglePromptEdit = useCallback((sceneIndex: number) => {
    setEditingPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(sceneIndex)) {
        next.delete(sceneIndex);
      } else {
        next.add(sceneIndex);
      }
      return next;
    });
  }, []);

  // Stats
  const totalGenerated = Array.from(imageUrls.values()).reduce(
    (sum, map) => sum + map.size,
    0
  );
  const totalSlots = scenes.length * 3;

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        {/* API Key missing banner */}
        {apiKeyMissing && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <Warning weight="duotone" className="size-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">
              NanoBanana API Key fehlt. Bitte unter Einstellungen &rarr; API Keys hinzufuegen.
            </p>
          </div>
        )}

        {/* Header stats */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Image weight="duotone" className="size-3" />
              {scenes.length} {scenes.length === 1 ? "Scene" : "Scenes"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Eye weight="duotone" className="size-3" />
              {totalGenerated}/{totalSlots} images
            </Badge>
            {totalGenerated === totalSlots && totalSlots > 0 && (
              <Badge variant="outline" className="gap-1 border-success/50 text-success">
                <Check weight="bold" className="size-3" />
                All generated
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
              <Sparkle weight="duotone" className="size-3.5" />
            )}
            {isBulkGenerating ? "Generating..." : "Generate All Images"}
          </Button>
        </div>

        {/* Bulk generation progress */}
        {isBulkGenerating && (
          <div className="space-y-2">
            <Progress value={bulkProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Generating images... {Math.round(bulkProgress)}%
            </p>
          </div>
        )}

        <Separator />

        {/* Scene image groups */}
        {scenes.length > 0 ? (
          <div className="space-y-4">
            {scenes.map((scene, index) => (
              <SceneImageGroup
                key={scene.id}
                sceneIndex={index}
                sceneId={scene.id}
                imagePrompt={scene.imagePrompt}
                narrationText={scene.narrationText}
                visualDescription={scene.visualDescription}
                variantUrls={imageUrls.get(index) ?? new Map()}
                selectedVariant={selectedVariants.get(index) ?? null}
                generatingVariants={generatingVariants.get(index) ?? new Set()}
                variantErrors={variantErrors.get(index) ?? new Map()}
                editedPrompt={editedPrompts.get(index) ?? ""}
                isPromptEditing={editingPrompts.has(index)}
                onPromptChange={(prompt) => handlePromptChange(index, prompt)}
                onTogglePromptEdit={() => handleTogglePromptEdit(index)}
                onGenerate={(variant) => handleGenerate(index, variant)}
                onSelect={(variant) => handleSelect(index, variant)}
                onRegenerate={(variant) => handleRegenerate(index, variant)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-16 text-center">
            <Image weight="duotone" className="size-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No scenes found. Please complete the Script step first.
            </p>
          </div>
        )}
      </div>
    </StepContent>
  );
}
