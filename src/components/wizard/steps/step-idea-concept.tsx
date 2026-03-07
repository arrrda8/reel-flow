"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Lightbulb,
  Sparkle,
  ArrowClockwise,
  PencilSimple,
  Check,
  X,
  MagnifyingGlass,
  Users,
  FilmSlate,
  ListBullets,
  Globe,
  Lightning,
  Quotes,
  Target,
  SpinnerGap,
  Info,
  Trash,
  Plus,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import type { Treatment, ResearchReport } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXAMPLE_PROMPTS = [
  "10 ways to boost productivity",
  "The history of coffee in 60 seconds",
  "Morning routine for entrepreneurs",
  "Why you should learn Rust in 2025",
  "5 psychological tricks used in marketing",
  "How the internet actually works",
];

const PLATFORM_TIPS: Record<string, string> = {
  youtube: "Focus on value delivery and storytelling. Aim for a strong intro and clear structure.",
  shorts: "Hook in the first 2 seconds. One main point per video. Fast-paced editing.",
  reels: "Hook in the first 3 seconds. Use trending formats and relatable content.",
  tiktok: "Hook in the first 3 seconds. Be authentic and direct. Use trending sounds.",
  custom: "Structure your content with a clear beginning, middle, and end.",
};

const GENERATION_STEPS = [
  { label: "Researching topic...", icon: MagnifyingGlass, durationMs: 1500 },
  { label: "Analyzing audience...", icon: Users, durationMs: 1500 },
  { label: "Generating concept...", icon: FilmSlate, durationMs: 2500 },
];

const MAX_IDEA_LENGTH = 2000;

// ---------------------------------------------------------------------------
// Phase A: Idea Input
// ---------------------------------------------------------------------------

function IdeaInput({
  ideaText,
  onIdeaChange,
  platform,
  onGenerate,
  isGenerating,
}: {
  ideaText: string;
  onIdeaChange: (text: string) => void;
  platform: string;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const platformTip = PLATFORM_TIPS[platform] ?? PLATFORM_TIPS.custom;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(180, el.scrollHeight)}px`;
  }, [ideaText]);

  const handleExampleClick = useCallback(
    (example: string) => {
      onIdeaChange(example);
      textareaRef.current?.focus();
    },
    [onIdeaChange]
  );

  const charCount = ideaText.length;
  const charPercent = (charCount / MAX_IDEA_LENGTH) * 100;

  return (
    <div className="space-y-6">
      {/* Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="idea-textarea"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground"
          >
            <Lightbulb weight="duotone" className="size-4 text-primary" />
            Your Video Idea
          </label>
          <span
            className={cn(
              "font-mono text-xs",
              charPercent > 90
                ? "text-destructive"
                : charPercent > 70
                  ? "text-warning"
                  : "text-muted-foreground"
            )}
          >
            {charCount}/{MAX_IDEA_LENGTH}
          </span>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="idea-textarea"
            value={ideaText}
            onChange={(e) => {
              if (e.target.value.length <= MAX_IDEA_LENGTH) {
                onIdeaChange(e.target.value);
              }
            }}
            placeholder="Describe what your video should be about. Be as specific or as vague as you like..."
            className={cn(
              "w-full resize-none rounded-xl border border-border bg-surface/50 px-5 py-4 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "outline-none transition-all",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              "min-h-[180px]"
            )}
            disabled={isGenerating}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Describe what your video should be about. Be as specific or as vague
          as you like -- the AI will fill in the gaps.
        </p>
      </div>

      {/* Platform tip */}
      <div className="flex items-start gap-2.5 rounded-lg border border-secondary/20 bg-secondary/5 px-4 py-3">
        <Info weight="duotone" className="mt-0.5 size-4 shrink-0 text-secondary" />
        <div>
          <p className="text-xs font-medium text-secondary">
            {platform === "youtube"
              ? "YouTube"
              : platform === "shorts"
                ? "YouTube Shorts"
                : platform === "reels"
                  ? "Instagram Reels"
                  : platform === "tiktok"
                    ? "TikTok"
                    : "Custom"}{" "}
            Tip
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{platformTip}</p>
        </div>
      </div>

      {/* Example prompts */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Need inspiration? Try one of these:
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              disabled={isGenerating}
              className={cn(
                "rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs text-muted-foreground",
                "transition-all hover:border-primary/50 hover:text-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="flex justify-center pt-2">
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={isGenerating || ideaText.trim().length < 5}
          className={cn(
            "gap-2 px-8",
            "bg-gradient-to-r from-primary to-secondary text-white",
            "hover:from-primary/90 hover:to-secondary/90",
            "shadow-lg shadow-primary/20",
            "disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
          )}
        >
          {isGenerating ? (
            <SpinnerGap weight="bold" className="size-4 animate-spin" />
          ) : (
            <Sparkle weight="duotone" className="size-4" />
          )}
          {isGenerating ? "Generating..." : "Generate Concept"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generation Progress Overlay
// ---------------------------------------------------------------------------

function GenerationProgress({
  currentStepIndex,
}: {
  currentStepIndex: number;
}) {
  const totalSteps = GENERATION_STEPS.length;
  const progressPercent = Math.min(
    ((currentStepIndex + 1) / totalSteps) * 100,
    100
  );

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 animate-pulse">
            <Sparkle weight="duotone" className="size-8 text-primary" />
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progressPercent} className="h-2" />

        {/* Step list */}
        <div className="space-y-3">
          {GENERATION_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isDone = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div
                key={step.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  isCurrent && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                    isDone
                      ? "bg-success/10"
                      : isCurrent
                        ? "bg-primary/10"
                        : "bg-surface"
                  )}
                >
                  {isDone ? (
                    <Check weight="bold" className="size-3.5 text-success" />
                  ) : isCurrent ? (
                    <SpinnerGap
                      weight="bold"
                      className="size-3.5 animate-spin text-primary"
                    />
                  ) : (
                    <StepIcon
                      weight="duotone"
                      className="size-3.5 text-muted-foreground"
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm",
                    isDone
                      ? "text-success"
                      : isCurrent
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase B: Concept Display
// ---------------------------------------------------------------------------

function ConceptDisplay({
  treatment,
  researchReport,
  onRegenerate,
  onAccept,
  onTreatmentChange,
  isRegenerating,
  isSaving,
}: {
  treatment: Treatment;
  researchReport: ResearchReport;
  onRegenerate: () => void;
  onAccept: () => void;
  onTreatmentChange: (updated: Treatment) => void;
  isRegenerating: boolean;
  isSaving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-success/50 text-success">
            <Check weight="bold" className="size-3" />
            Concept Generated
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating || isSaving}
            className="gap-1.5"
          >
            {isRegenerating ? (
              <SpinnerGap weight="bold" className="size-3.5 animate-spin" />
            ) : (
              <ArrowClockwise weight="duotone" className="size-3.5" />
            )}
            Regenerate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            disabled={isRegenerating || isSaving}
            className="gap-1.5"
          >
            {isEditing ? (
              <X weight="bold" className="size-3.5" />
            ) : (
              <PencilSimple weight="duotone" className="size-3.5" />
            )}
            {isEditing ? "Stop Editing" : "Edit"}
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isRegenerating || isSaving}
            className={cn(
              "gap-1.5",
              "bg-gradient-to-r from-primary to-secondary text-white",
              "hover:from-primary/90 hover:to-secondary/90"
            )}
          >
            {isSaving ? (
              <SpinnerGap weight="bold" className="size-3.5 animate-spin" />
            ) : (
              <Check weight="bold" className="size-3.5" />
            )}
            Accept & Continue
          </Button>
        </div>
      </div>

      {/* Two-card layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Research Report */}
        <ResearchReportCard report={researchReport} />

        {/* Treatment */}
        <TreatmentCard
          treatment={treatment}
          isEditing={isEditing}
          onTreatmentChange={onTreatmentChange}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Research Report Card
// ---------------------------------------------------------------------------

function ResearchReportCard({ report }: { report: ResearchReport }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/10">
            <MagnifyingGlass
              weight="duotone"
              className="size-3.5 text-secondary"
            />
          </div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Research Report
          </h3>
        </div>
      </div>
      <div className="space-y-4 p-5">
        {/* Topic */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Topic
          </p>
          <p className="text-sm text-foreground">{report.topic}</p>
        </div>

        {/* Summary */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Summary
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {report.summary}
          </p>
        </div>

        {/* Key Points */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Key Points
          </p>
          <ul className="space-y-1.5">
            {report.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <ListBullets
                  weight="duotone"
                  className="mt-0.5 size-3.5 shrink-0 text-secondary"
                />
                <span className="text-sm text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sources */}
        {report.sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sources
            </p>
            <div className="flex flex-wrap gap-1.5">
              {report.sources.map((source, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="gap-1 text-xs"
                >
                  <Globe weight="duotone" className="size-3" />
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Treatment Card
// ---------------------------------------------------------------------------

function TreatmentCard({
  treatment,
  isEditing,
  onTreatmentChange,
}: {
  treatment: Treatment;
  isEditing: boolean;
  onTreatmentChange: (updated: Treatment) => void;
}) {
  const updateField = useCallback(
    <K extends keyof Treatment>(key: K, value: Treatment[K]) => {
      onTreatmentChange({ ...treatment, [key]: value });
    },
    [treatment, onTreatmentChange]
  );

  const updateScene = useCallback(
    (
      index: number,
      field: "narration" | "visual",
      value: string
    ) => {
      const updatedScenes = treatment.scenes.map((scene, i) =>
        i === index ? { ...scene, [field]: value } : scene
      );
      onTreatmentChange({ ...treatment, scenes: updatedScenes });
    },
    [treatment, onTreatmentChange]
  );

  const addScene = useCallback(() => {
    const newScene = {
      narration: "New scene narration...",
      visual: "Visual description for this scene...",
    };
    onTreatmentChange({
      ...treatment,
      scenes: [...treatment.scenes, newScene],
    });
  }, [treatment, onTreatmentChange]);

  const removeScene = useCallback(
    (index: number) => {
      if (treatment.scenes.length <= 1) return;
      const updatedScenes = treatment.scenes.filter((_, i) => i !== index);
      onTreatmentChange({ ...treatment, scenes: updatedScenes });
    },
    [treatment, onTreatmentChange]
  );

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <FilmSlate weight="duotone" className="size-3.5 text-primary" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Treatment
          </h3>
          {isEditing && (
            <Badge variant="outline" className="ml-auto gap-1 border-warning/50 text-warning text-xs">
              <PencilSimple weight="bold" className="size-3" />
              Editing
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-4 p-5">
        {/* Title */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Title
          </p>
          {isEditing ? (
            <input
              type="text"
              value={treatment.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full rounded-md border border-border bg-surface/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          ) : (
            <p className="font-heading text-sm font-semibold text-foreground">
              {treatment.title}
            </p>
          )}
        </div>

        {/* Hook */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Lightning weight="duotone" className="mr-1 inline size-3 text-warning" />
            Hook
          </p>
          {isEditing ? (
            <textarea
              value={treatment.hook}
              onChange={(e) => updateField("hook", e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-surface/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          ) : (
            <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
              <p className="text-sm italic text-foreground">
                <Quotes weight="duotone" className="mr-1 inline size-3.5 text-warning" />
                {treatment.hook}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Scenes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Scenes ({treatment.scenes.length})
            </p>
            {isEditing && (
              <button
                type="button"
                onClick={addScene}
                className="flex items-center gap-1 rounded-md border border-border bg-surface/50 px-2 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                <Plus weight="bold" className="size-3" />
                Add Scene
              </button>
            )}
          </div>
          <div className="space-y-3">
            {treatment.scenes.map((scene, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-lg border border-border bg-surface/30 p-3 transition-all",
                  isEditing && "hover:border-primary/30"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    Scene {index + 1}
                  </Badge>
                  {isEditing && treatment.scenes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeScene(index)}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash weight="duotone" className="size-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="mb-0.5 text-xs text-muted-foreground">
                      Narration
                    </p>
                    {isEditing ? (
                      <textarea
                        value={scene.narration}
                        onChange={(e) =>
                          updateScene(index, "narration", e.target.value)
                        }
                        rows={2}
                        className="w-full resize-none rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    ) : (
                      <p className="text-xs leading-relaxed text-foreground">
                        {scene.narration}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-muted-foreground">
                      Visual
                    </p>
                    {isEditing ? (
                      <textarea
                        value={scene.visual}
                        onChange={(e) =>
                          updateScene(index, "visual", e.target.value)
                        }
                        rows={2}
                        className="w-full resize-none rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground italic">
                        {scene.visual}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* CTA */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Target weight="duotone" className="mr-1 inline size-3 text-primary" />
            Call to Action
          </p>
          {isEditing ? (
            <textarea
              value={treatment.cta}
              onChange={(e) => updateField("cta", e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-surface/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          ) : (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-sm text-foreground">{treatment.cta}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepIdeaConcept() {
  const projectData = useWizardStore((s) => s.projectData);
  const updateProjectData = useWizardStore((s) => s.updateProjectData);
  const setSaving = useWizardStore((s) => s.setSaving);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);
  const projectId = useWizardStore((s) => s.projectId);

  // Local state
  const [ideaText, setIdeaText] = useState(projectData?.ideaText ?? "");
  const [treatment, setTreatment] = useState<Treatment | null>(
    projectData?.treatment ?? null
  );
  const [researchReport, setResearchReport] = useState<ResearchReport | null>(
    projectData?.researchReport ?? null
  );

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Determine which phase to show
  const showConcept = treatment !== null && researchReport !== null && !isGenerating;

  // Sync from store on project load
  useEffect(() => {
    if (projectData) {
      setIdeaText(projectData.ideaText ?? "");
      setTreatment(projectData.treatment ?? null);
      setResearchReport(projectData.researchReport ?? null);
    }
  }, [projectData]);

  // Handle generation with fake progress steps
  const handleGenerate = useCallback(async () => {
    if (!projectId || !projectData) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStepIndex(0);
    setTreatment(null);
    setResearchReport(null);

    // Simulate progress steps
    for (let i = 0; i < GENERATION_STEPS.length; i++) {
      setGenerationStepIndex(i);
      await new Promise((resolve) =>
        setTimeout(resolve, GENERATION_STEPS[i].durationMs)
      );
    }

    // Call API route instead of server action to avoid RSC refresh crash
    try {
      const res = await fetch("/api/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ideaText,
          platform: projectData.platform,
          duration: projectData.targetDuration,
          locale: "de",
        }),
      });

      const result = await res.json();

      if (result.success) {
        setTreatment(result.treatment);
        setResearchReport(result.researchReport);
        updateProjectData({
          ideaText,
          treatment: result.treatment,
          researchReport: result.researchReport,
        });
      } else {
        setGenerationError(result.error || "Failed to generate concept");
      }
    } catch {
      setGenerationError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, projectData, ideaText, updateProjectData]);

  // Handle regeneration
  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Handle treatment updates from the editor
  const handleTreatmentChange = useCallback((updated: Treatment) => {
    setTreatment(updated);
  }, []);

  // Handle accept & continue
  const handleAccept = useCallback(async () => {
    if (!projectId || !treatment || !researchReport) return;

    setIsSaving(true);
    setSaving(true);

    try {
      // Save idea text, treatment, and research via API route
      const res = await fetch("/api/project-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ideaText,
          treatment,
          researchReport,
        }),
      });

      const result = await res.json();

      if (result.success) {
        updateProjectData({
          ideaText,
          treatment,
          researchReport,
        });
        markStepCompleted(2);
      }
    } finally {
      setIsSaving(false);
      setSaving(false);
    }
  }, [
    projectId,
    treatment,
    researchReport,
    ideaText,
    updateProjectData,
    markStepCompleted,
    setSaving,
  ]);

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        {/* Error banner */}
        {generationError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{generationError}</p>
          </div>
        )}

        {/* Phase: Generating */}
        {isGenerating && (
          <GenerationProgress currentStepIndex={generationStepIndex} />
        )}

        {/* Phase A: Idea Input */}
        {!isGenerating && !showConcept && (
          <IdeaInput
            ideaText={ideaText}
            onIdeaChange={setIdeaText}
            platform={projectData.platform}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}

        {/* Phase B: Concept Display */}
        {showConcept && treatment && researchReport && (
          <>
            {/* Show the idea text for reference */}
            <div className="rounded-lg border border-border bg-surface/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Lightbulb
                  weight="duotone"
                  className="size-4 shrink-0 text-primary"
                />
                <p className="text-sm text-foreground">
                  <span className="font-medium">Idea:</span>{" "}
                  <span className="text-muted-foreground">{ideaText}</span>
                </p>
              </div>
            </div>

            <ConceptDisplay
              treatment={treatment}
              researchReport={researchReport}
              onRegenerate={handleRegenerate}
              onAccept={handleAccept}
              onTreatmentChange={handleTreatmentChange}
              isRegenerating={isGenerating}
              isSaving={isSaving}
            />
          </>
        )}
      </div>
    </StepContent>
  );
}
