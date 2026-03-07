"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GearSix,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  MonitorPlay,
  FilmSlate,
  Timer,
  Palette,
  Brain,
  Eye,
  Check,
  Sparkle,
  FilmStrip,
  Rewind,
  Lightning,
  Leaf,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { callAction } from "@/lib/call-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS = [
  {
    value: "youtube" as const,
    label: "YouTube",
    icon: YoutubeLogo,
    description: "Long-form video",
  },
  {
    value: "shorts" as const,
    label: "YouTube Shorts",
    icon: YoutubeLogo,
    description: "Vertical short-form",
  },
  {
    value: "reels" as const,
    label: "Instagram Reels",
    icon: InstagramLogo,
    description: "Vertical short-form",
  },
  {
    value: "tiktok" as const,
    label: "TikTok",
    icon: TiktokLogo,
    description: "Vertical short-form",
  },
  {
    value: "custom" as const,
    label: "Custom",
    icon: MonitorPlay,
    description: "Custom format",
  },
];

const DURATION_PRESETS = [
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
  { label: "90s", value: 90 },
  { label: "3min", value: 180 },
  { label: "5min", value: 300 },
  { label: "10min", value: 600 },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", description: "Landscape", width: 64, height: 36 },
  { value: "9:16", label: "9:16", description: "Portrait", width: 36, height: 64 },
  { value: "1:1", label: "1:1", description: "Square", width: 48, height: 48 },
  { value: "4:5", label: "4:5", description: "Social", width: 40, height: 50 },
];

const DEFAULT_PRESETS = [
  {
    id: "preset-cinematic",
    name: "Cinematic",
    nameEn: "Cinematic",
    stylePrompt: "cinematic, dramatic lighting, movie-quality",
    transitionType: "fade",
    icon: FilmSlate,
    description: "Dramatic lighting with movie-quality feel",
  },
  {
    id: "preset-minimal",
    name: "Minimal",
    nameEn: "Minimal",
    stylePrompt: "clean, minimal, white space, modern",
    transitionType: "fade",
    icon: Sparkle,
    description: "Clean and modern with white space",
  },
  {
    id: "preset-retro",
    name: "Retro",
    nameEn: "Retro",
    stylePrompt: "vintage, film grain, warm tones, retro",
    transitionType: "dissolve",
    icon: Rewind,
    description: "Vintage look with warm film grain",
  },
  {
    id: "preset-neon",
    name: "Neon",
    nameEn: "Neon",
    stylePrompt: "neon lights, cyberpunk, vibrant colors, dark",
    transitionType: "slide",
    icon: Lightning,
    description: "Cyberpunk vibes with neon lights",
  },
  {
    id: "preset-nature",
    name: "Nature",
    nameEn: "Nature",
    stylePrompt: "natural, organic, earth tones, peaceful",
    transitionType: "fade",
    icon: Leaf,
    description: "Organic earth tones and peaceful feel",
  },
];

const LLM_PROVIDERS = [
  { value: "anthropic" as const, label: "Anthropic (Claude)", description: "Best for creative writing" },
  { value: "openai" as const, label: "OpenAI (GPT)", description: "Versatile all-rounder" },
  { value: "gemini" as const, label: "Google (Gemini)", description: "Strong reasoning" },
];

// ---------------------------------------------------------------------------
// Helper: format seconds to human-readable
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepProjectSetup() {
  const projectData = useWizardStore((s) => s.projectData);
  const updateProjectData = useWizardStore((s) => s.updateProjectData);
  const setSaving = useWizardStore((s) => s.setSaving);
  const projectId = useWizardStore((s) => s.projectId);

  // Local form state (initialized from store)
  const [name, setName] = useState(projectData?.name ?? "");
  const [platform, setPlatform] = useState<string>(projectData?.platform ?? "youtube");
  const [targetDuration, setTargetDuration] = useState(projectData?.targetDuration ?? 60);
  const [aspectRatio, setAspectRatio] = useState(projectData?.aspectRatio ?? "16:9");
  const [stylePresetId, setStylePresetId] = useState<string | null>(
    projectData?.stylePresetId ?? null
  );
  const [llmProvider, setLlmProvider] = useState<string>(
    projectData?.llmProvider ?? "anthropic"
  );
  const [promptReviewEnabled, setPromptReviewEnabled] = useState(
    projectData?.promptReviewEnabled ?? false
  );

  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync local state when project data loads/changes
  useEffect(() => {
    if (projectData) {
      setName(projectData.name);
      setPlatform(projectData.platform);
      setTargetDuration(projectData.targetDuration);
      setAspectRatio(projectData.aspectRatio);
      setStylePresetId(projectData.stylePresetId);
      setLlmProvider(projectData.llmProvider);
      setPromptReviewEnabled(projectData.promptReviewEnabled);
    }
  }, [projectData]);

  // Detect if user has made changes (mark step dirty for auto-save awareness)
  const hasChanges = useMemo(() => {
    if (!projectData) return false;
    return (
      name !== projectData.name ||
      platform !== projectData.platform ||
      targetDuration !== projectData.targetDuration ||
      aspectRatio !== projectData.aspectRatio ||
      stylePresetId !== projectData.stylePresetId ||
      llmProvider !== projectData.llmProvider ||
      promptReviewEnabled !== projectData.promptReviewEnabled
    );
  }, [
    projectData,
    name,
    platform,
    targetDuration,
    aspectRatio,
    stylePresetId,
    llmProvider,
    promptReviewEnabled,
  ]);

  // Auto-save via debounce when changes are detected
  useEffect(() => {
    if (!hasChanges || !projectId) return;

    const timeout = setTimeout(async () => {
      setSaving(true);
      setSaveError(null);

      try {
        const result = await callAction<{ success: boolean; error?: string }>(
          "updateProjectSettings",
          projectId,
          {
            name,
            platform,
            targetDuration,
            aspectRatio,
            stylePresetId,
            llmProvider,
            promptReviewEnabled,
          }
        );

        if (result.success) {
          updateProjectData({
            name,
            platform: platform as ProjectData["platform"],
            targetDuration,
            aspectRatio,
            stylePresetId,
            llmProvider: llmProvider as ProjectData["llmProvider"],
            promptReviewEnabled,
          });
        } else {
          setSaveError(result.error ?? "Failed to save settings");
        }
      } finally {
        setSaving(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    hasChanges,
    projectId,
    name,
    platform,
    targetDuration,
    aspectRatio,
    stylePresetId,
    llmProvider,
    promptReviewEnabled,
    setSaving,
    updateProjectData,
  ]);

  // Auto-adjust aspect ratio when platform changes
  const handlePlatformChange = useCallback(
    (value: string) => {
      setPlatform(value);
      // Auto-suggest aspect ratio based on platform
      if (value === "youtube") {
        setAspectRatio("16:9");
      } else if (
        value === "shorts" ||
        value === "reels" ||
        value === "tiktok"
      ) {
        setAspectRatio("9:16");
      }
    },
    []
  );

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-8">
        {/* Error banner */}
        {saveError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{saveError}</p>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-sm font-medium text-foreground">
                Project Name
              </Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Video"
                className="bg-surface/50"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to identify your project.
              </p>
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Platform
              </Label>
              <Select value={platform} onValueChange={handlePlatformChange}>
                <SelectTrigger className="w-full bg-surface/50">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <p.icon weight="duotone" className="size-4 text-primary" />
                        <span>{p.label}</span>
                        <span className="text-xs text-muted-foreground">
                          -- {p.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Duration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  Target Duration
                </Label>
                <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1">
                  <Timer weight="duotone" className="size-3.5 text-primary" />
                  <span className="font-mono text-sm font-medium text-primary">
                    {formatDuration(targetDuration)}
                  </span>
                </div>
              </div>

              {/* Duration preset chips */}
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setTargetDuration(preset.value)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
                      targetDuration === preset.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <Slider
                value={[targetDuration]}
                onValueChange={([val]) => setTargetDuration(val)}
                min={10}
                max={600}
                step={5}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10s</span>
                <span>10min</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Aspect Ratio */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Aspect Ratio
              </Label>
              <div className="grid grid-cols-4 gap-3">
                {ASPECT_RATIOS.map((ar) => {
                  const isSelected = aspectRatio === ar.value;
                  // Scale down for visual preview
                  const scale = 0.5;
                  const displayW = ar.width * scale;
                  const displayH = ar.height * scale;

                  return (
                    <button
                      key={ar.value}
                      type="button"
                      onClick={() => setAspectRatio(ar.value)}
                      className={cn(
                        "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                          : "border-border bg-surface/50 hover:border-primary/50"
                      )}
                    >
                      {/* Check badge */}
                      {isSelected && (
                        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check weight="bold" className="size-3 text-white" />
                        </div>
                      )}

                      {/* Aspect ratio preview box */}
                      <div
                        className={cn(
                          "rounded border-2 transition-colors",
                          isSelected
                            ? "border-primary bg-primary/20"
                            : "border-border bg-surface group-hover:border-primary/30"
                        )}
                        style={{
                          width: `${displayW}px`,
                          height: `${displayH}px`,
                        }}
                      />

                      <div className="text-center">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isSelected ? "text-primary" : "text-foreground"
                          )}
                        >
                          {ar.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ar.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style Preset */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Style Preset
              </Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {DEFAULT_PRESETS.map((preset) => {
                  const isSelected = stylePresetId === preset.id;
                  const PresetIcon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setStylePresetId(isSelected ? null : preset.id)
                      }
                      className={cn(
                        "group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                          : "border-border bg-surface/50 hover:border-primary/50"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check weight="bold" className="size-3 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                          isSelected
                            ? "bg-primary/20"
                            : "bg-surface group-hover:bg-primary/10"
                        )}
                      >
                        <PresetIcon
                          weight="duotone"
                          className={cn(
                            "size-4",
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-primary"
                          )}
                        />
                      </div>
                      <div>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-primary" : "text-foreground"
                          )}
                        >
                          {preset.name}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Optional. Select a visual style or leave blank to configure later.
              </p>
            </div>
          </div>
        </div>

        {/* FULL-WIDTH BOTTOM SECTION: Settings */}
        <Separator className="my-2" />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GearSix weight="duotone" className="size-4 text-muted-foreground" />
            <h3 className="font-heading text-sm font-semibold text-foreground">
              AI Settings
            </h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* LLM Provider */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                <Brain weight="duotone" className="mr-1.5 inline size-3.5 text-secondary" />
                AI Provider
              </Label>
              <Select value={llmProvider} onValueChange={setLlmProvider}>
                <SelectTrigger className="w-full bg-surface/50">
                  <SelectValue placeholder="Select AI provider" />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <span>{p.label}</span>
                        <span className="text-xs text-muted-foreground">
                          -- {p.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for script generation, concepts, and prompts.
              </p>
            </div>

            {/* Prompt Review */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                <Eye weight="duotone" className="mr-1.5 inline size-3.5 text-secondary" />
                Prompt Review Mode
              </Label>
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Review AI prompts before execution
                  </p>
                  <p className="text-xs text-muted-foreground">
                    See and edit every prompt the AI sends
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          checked={promptReviewEnabled}
                          onCheckedChange={setPromptReviewEnabled}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {promptReviewEnabled ? "Disable" : "Enable"} prompt review
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/50 px-4 py-3">
          <span className="mr-1 text-xs font-medium text-muted-foreground">
            Summary:
          </span>
          <Badge variant="outline" className="gap-1">
            <FilmStrip weight="duotone" className="size-3" />
            {PLATFORMS.find((p) => p.value === platform)?.label ?? platform}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Timer weight="duotone" className="size-3" />
            {formatDuration(targetDuration)}
          </Badge>
          <Badge variant="outline" className="gap-1">
            {aspectRatio}
          </Badge>
          {stylePresetId && (
            <Badge variant="outline" className="gap-1">
              <Palette weight="duotone" className="size-3" />
              {DEFAULT_PRESETS.find((p) => p.id === stylePresetId)?.name ?? "Custom"}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Brain weight="duotone" className="size-3" />
            {LLM_PROVIDERS.find((p) => p.value === llmProvider)?.label ?? llmProvider}
          </Badge>
          {promptReviewEnabled && (
            <Badge variant="outline" className="gap-1 border-secondary/50 text-secondary">
              <Eye weight="duotone" className="size-3" />
              Review ON
            </Badge>
          )}
        </div>
      </div>
    </StepContent>
  );
}

// Re-export type helper for the auto-save effect
type ProjectData = NonNullable<ReturnType<typeof useWizardStore.getState>["projectData"]>;
