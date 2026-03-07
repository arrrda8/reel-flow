"use client";

import { useCallback, useState } from "react";
import {
  Image,
  ArrowClockwise,
  Check,
  SpinnerGap,
  Sparkle,
  Eye,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Gradient placeholders that look like generated images
// ---------------------------------------------------------------------------

const IMAGE_GRADIENTS = [
  "from-violet-600/40 via-indigo-500/30 to-blue-600/40",
  "from-rose-600/40 via-pink-500/30 to-purple-600/40",
  "from-amber-600/40 via-orange-500/30 to-red-600/40",
  "from-emerald-600/40 via-teal-500/30 to-cyan-600/40",
  "from-sky-600/40 via-blue-500/30 to-indigo-600/40",
  "from-fuchsia-600/40 via-purple-500/30 to-violet-600/40",
];

function getGradient(sceneIndex: number, variantIndex: number): string {
  const idx = (sceneIndex * 3 + variantIndex) % IMAGE_GRADIENTS.length;
  return IMAGE_GRADIENTS[idx];
}

// ---------------------------------------------------------------------------
// Image Slot Component
// ---------------------------------------------------------------------------

function ImageSlot({
  sceneIndex,
  variantIndex,
  isGenerated,
  isSelected,
  isGenerating,
  onGenerate,
  onSelect,
  onRegenerate,
}: {
  sceneIndex: number;
  variantIndex: number;
  isGenerated: boolean;
  isSelected: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onSelect: () => void;
  onRegenerate: () => void;
}) {
  const gradient = getGradient(sceneIndex, variantIndex);

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
          {/* Generated image placeholder (gradient) */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br",
              gradient
            )}
          />
          {/* Texture overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)]" />

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
        /* Empty slot with generate button */
        <div className="flex h-full items-center justify-center bg-surface/30">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2">
              <SpinnerGap weight="bold" className="size-5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Generating...</span>
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
  imagePrompt,
  narrationText,
  variants,
  selectedVariant,
  generatingVariants,
  onGenerate,
  onSelect,
  onRegenerate,
}: {
  sceneIndex: number;
  imagePrompt: string | null;
  narrationText: string | null;
  variants: Set<number>;
  selectedVariant: number | null;
  generatingVariants: Set<number>;
  onGenerate: (variant: number) => void;
  onSelect: (variant: number) => void;
  onRegenerate: (variant: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
            Scene {sceneIndex + 1}
          </Badge>
          {variants.size === 3 && selectedVariant !== null && (
            <Badge variant="outline" className="gap-1 border-success/50 text-success text-xs">
              <Check weight="bold" className="size-2.5" />
              Selected
            </Badge>
          )}
        </div>
        {imagePrompt && (
          <p className="mt-2 text-xs font-mono text-muted-foreground line-clamp-2">
            {imagePrompt}
          </p>
        )}
        {!imagePrompt && narrationText && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-1 italic">
            {narrationText}
          </p>
        )}
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((variantIndex) => (
            <ImageSlot
              key={variantIndex}
              sceneIndex={sceneIndex}
              variantIndex={variantIndex}
              isGenerated={variants.has(variantIndex)}
              isSelected={selectedVariant === variantIndex}
              isGenerating={generatingVariants.has(variantIndex)}
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

  // Track which variants are generated per scene: Map<sceneIndex, Set<variantIndex>>
  const [generatedVariants, setGeneratedVariants] = useState<Map<number, Set<number>>>(new Map());
  // Track which variant is selected per scene
  const [selectedVariants, setSelectedVariants] = useState<Map<number, number>>(new Map());
  // Track which variants are currently generating
  const [generatingVariants, setGeneratingVariants] = useState<Map<number, Set<number>>>(new Map());

  // Bulk generation
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const handleGenerate = useCallback(async (sceneIndex: number, variantIndex: number) => {
    // Mark as generating
    setGeneratingVariants((prev) => {
      const next = new Map(prev);
      const sceneSet = new Set(next.get(sceneIndex) ?? []);
      sceneSet.add(variantIndex);
      next.set(sceneIndex, sceneSet);
      return next;
    });

    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Mark as generated
    setGeneratedVariants((prev) => {
      const next = new Map(prev);
      const sceneSet = new Set(next.get(sceneIndex) ?? []);
      sceneSet.add(variantIndex);
      next.set(sceneIndex, sceneSet);
      return next;
    });

    // Remove from generating
    setGeneratingVariants((prev) => {
      const next = new Map(prev);
      const sceneSet = new Set(next.get(sceneIndex) ?? []);
      sceneSet.delete(variantIndex);
      next.set(sceneIndex, sceneSet);
      return next;
    });

    // Auto-select first generated variant
    setSelectedVariants((prev) => {
      if (prev.has(sceneIndex)) return prev;
      const next = new Map(prev);
      next.set(sceneIndex, variantIndex);
      return next;
    });
  }, []);

  const handleSelect = useCallback((sceneIndex: number, variantIndex: number) => {
    setSelectedVariants((prev) => {
      const next = new Map(prev);
      next.set(sceneIndex, variantIndex);
      return next;
    });
  }, []);

  const handleRegenerate = useCallback(async (sceneIndex: number, variantIndex: number) => {
    // Remove from generated
    setGeneratedVariants((prev) => {
      const next = new Map(prev);
      const sceneSet = new Set(next.get(sceneIndex) ?? []);
      sceneSet.delete(variantIndex);
      next.set(sceneIndex, sceneSet);
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
        const existingVariants = generatedVariants.get(sceneIdx);
        if (existingVariants?.has(varIdx)) {
          completed++;
          setBulkProgress((completed / totalSlots) * 100);
          continue;
        }

        await handleGenerate(sceneIdx, varIdx);
        completed++;
        setBulkProgress((completed / totalSlots) * 100);
      }
    }

    setIsBulkGenerating(false);
    markStepCompleted(5);
  }, [scenes.length, generatedVariants, handleGenerate, markStepCompleted]);

  // Stats
  const totalGenerated = Array.from(generatedVariants.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );
  const totalSlots = scenes.length * 3;

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
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
                imagePrompt={scene.imagePrompt}
                narrationText={scene.narrationText}
                variants={generatedVariants.get(index) ?? new Set()}
                selectedVariant={selectedVariants.get(index) ?? null}
                generatingVariants={generatingVariants.get(index) ?? new Set()}
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
