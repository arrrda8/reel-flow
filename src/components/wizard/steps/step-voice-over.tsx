"use client";

import { useCallback, useState } from "react";
import {
  Microphone,
  SpeakerHigh,
  Waveform,
  Check,
  SpinnerGap,
  User,
  Play,
  Pause,
  GenderFemale,
  GenderMale,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Mock voice data
// ---------------------------------------------------------------------------

interface MockVoice {
  id: string;
  name: string;
  description: string;
  gender: "male" | "female";
  accent: string;
  style: string;
}

const MOCK_VOICES: MockVoice[] = [
  {
    id: "voice-1",
    name: "Alex Morgan",
    description: "Warm, authoritative narrator with a natural cadence. Great for documentaries and explainers.",
    gender: "male",
    accent: "American",
    style: "Narrative",
  },
  {
    id: "voice-2",
    name: "Sarah Chen",
    description: "Crisp and energetic voice with excellent clarity. Perfect for tech content and tutorials.",
    gender: "female",
    accent: "American",
    style: "Energetic",
  },
  {
    id: "voice-3",
    name: "James Porter",
    description: "Deep, cinematic voice with gravitas. Ideal for dramatic storytelling and trailers.",
    gender: "male",
    accent: "British",
    style: "Cinematic",
  },
  {
    id: "voice-4",
    name: "Emma Wells",
    description: "Friendly and conversational tone. Works beautifully for social media and lifestyle content.",
    gender: "female",
    accent: "British",
    style: "Conversational",
  },
  {
    id: "voice-5",
    name: "David Kim",
    description: "Calm and measured delivery with a soothing quality. Great for meditation and educational content.",
    gender: "male",
    accent: "American",
    style: "Calm",
  },
  {
    id: "voice-6",
    name: "Mia Johnson",
    description: "Bold and dynamic voice with great projection. Excellent for motivational and fitness content.",
    gender: "female",
    accent: "Australian",
    style: "Dynamic",
  },
  {
    id: "voice-7",
    name: "Marcus Reed",
    description: "Smooth and polished voice with commercial appeal. Perfect for product showcases and ads.",
    gender: "male",
    accent: "American",
    style: "Commercial",
  },
  {
    id: "voice-8",
    name: "Lily Zhang",
    description: "Soft, whispery narration that draws listeners in. Ideal for ASMR and intimate storytelling.",
    gender: "female",
    accent: "American",
    style: "Soft",
  },
];

// ---------------------------------------------------------------------------
// Voice Card
// ---------------------------------------------------------------------------

function VoiceCard({
  voice,
  isSelected,
  onSelect,
  isPlaying,
  onTogglePlay,
}: {
  voice: MockVoice;
  isSelected: boolean;
  onSelect: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}) {
  const GenderIcon = voice.gender === "male" ? GenderMale : GenderFemale;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
        isSelected
          ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      {isSelected && (
        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check weight="bold" className="size-3 text-white" />
        </div>
      )}

      <div className="flex w-full items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              isSelected ? "bg-primary/20" : "bg-surface"
            )}
          >
            <User weight="duotone" className={cn("size-4", isSelected ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-foreground")}>
              {voice.name}
            </p>
            <div className="flex items-center gap-1.5">
              <GenderIcon weight="duotone" className="size-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{voice.accent}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            isPlaying
              ? "bg-primary text-white"
              : "bg-surface text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          {isPlaying ? (
            <Pause weight="fill" className="size-3" />
          ) : (
            <Play weight="fill" className="size-3" />
          )}
        </button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
        {voice.description}
      </p>

      <Badge variant="outline" className="text-xs">
        {voice.style}
      </Badge>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepVoiceOver() {
  const projectData = useWizardStore((s) => s.projectData);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);

  // Local state
  const [selectedVoice, setSelectedVoice] = useState<string | null>(
    projectData?.voiceId ?? null
  );
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [stability, setStability] = useState(
    projectData?.voiceSettings?.stability ?? 0.5
  );
  const [similarityBoost, setSimilarityBoost] = useState(
    projectData?.voiceSettings?.similarityBoost ?? 0.75
  );
  const [speed, setSpeed] = useState(
    projectData?.voiceSettings?.speed ?? 1.0
  );

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedScenes, setGeneratedScenes] = useState<Set<number>>(new Set());

  const scenes = projectData?.scenes ?? [];

  const handleTogglePlay = useCallback(
    (voiceId: string) => {
      if (playingVoice === voiceId) {
        setPlayingVoice(null);
      } else {
        setPlayingVoice(voiceId);
        // Auto-stop after 3 seconds (mock)
        setTimeout(() => setPlayingVoice(null), 3000);
      }
    },
    [playingVoice]
  );

  const handleGenerateAll = useCallback(async () => {
    if (!selectedVoice) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedScenes(new Set());

    const sceneCount = Math.max(scenes.length, 1);

    for (let i = 0; i < sceneCount; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setGenerationProgress(((i + 1) / sceneCount) * 100);
      setGeneratedScenes((prev) => new Set([...prev, i]));
    }

    setIsGenerating(false);
    markStepCompleted(4);
  }, [selectedVoice, scenes.length, markStepCompleted]);

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        {/* Voice selection grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Microphone weight="duotone" className="size-4 text-primary" />
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Select a Voice
            </h3>
            {selectedVoice && (
              <Badge variant="outline" className="ml-auto gap-1 border-success/50 text-success text-xs">
                <Check weight="bold" className="size-3" />
                {MOCK_VOICES.find((v) => v.id === selectedVoice)?.name}
              </Badge>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MOCK_VOICES.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                isSelected={selectedVoice === voice.id}
                onSelect={() => setSelectedVoice(voice.id)}
                isPlaying={playingVoice === voice.id}
                onTogglePlay={() => handleTogglePlay(voice.id)}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Voice settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SpeakerHigh weight="duotone" className="size-4 text-secondary" />
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Voice Settings
            </h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Stability */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Stability
                </Label>
                <span className="font-mono text-xs text-primary">
                  {stability.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[stability]}
                onValueChange={([val]) => setStability(val)}
                min={0}
                max={1}
                step={0.01}
              />
              <p className="text-xs text-muted-foreground">
                Higher values make the voice more consistent and predictable.
              </p>
            </div>

            {/* Similarity Boost */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Similarity Boost
                </Label>
                <span className="font-mono text-xs text-primary">
                  {similarityBoost.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[similarityBoost]}
                onValueChange={([val]) => setSimilarityBoost(val)}
                min={0}
                max={1}
                step={0.01}
              />
              <p className="text-xs text-muted-foreground">
                Higher values make the voice closer to the original sample.
              </p>
            </div>

            {/* Speed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Speed
                </Label>
                <span className="font-mono text-xs text-primary">
                  {speed.toFixed(2)}x
                </span>
              </div>
              <Slider
                value={[speed]}
                onValueChange={([val]) => setSpeed(val)}
                min={0.5}
                max={2.0}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground">
                Adjust playback speed from 0.5x to 2x.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Scene-by-scene preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waveform weight="duotone" className="size-4 text-primary" />
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Scene Voice Overs
              </h3>
            </div>
            <Button
              size="sm"
              onClick={handleGenerateAll}
              disabled={!selectedVoice || isGenerating}
              className={cn(
                "gap-1.5",
                "bg-gradient-to-r from-primary to-secondary text-white",
                "hover:from-primary/90 hover:to-secondary/90",
                "shadow-lg shadow-primary/20",
                "disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
              )}
            >
              {isGenerating ? (
                <SpinnerGap weight="bold" className="size-3.5 animate-spin" />
              ) : (
                <Microphone weight="duotone" className="size-3.5" />
              )}
              {isGenerating ? "Generating..." : "Generate All"}
            </Button>
          </div>

          {/* Progress bar during generation */}
          {isGenerating && (
            <div className="space-y-2">
              <Progress value={generationProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Generating voice over for scene{" "}
                {generatedScenes.size + 1} of {Math.max(scenes.length, 1)}...
              </p>
            </div>
          )}

          {/* Scene list */}
          <div className="space-y-2">
            {scenes.length > 0 ? (
              scenes.map((scene, index) => {
                const isGenerated = generatedScenes.has(index);

                return (
                  <div
                    key={scene.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-all",
                      isGenerated
                        ? "border-success/30 bg-success/5"
                        : "border-border bg-surface/30"
                    )}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-0.5 shrink-0 text-xs",
                        isGenerated && "border-success/50 text-success"
                      )}
                    >
                      {index + 1}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-clamp-2">
                        {scene.narrationText || (
                          <span className="italic text-muted-foreground">
                            No narration text
                          </span>
                        )}
                      </p>
                      {isGenerated && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex h-1.5 flex-1 items-center gap-[2px]">
                            {Array.from({ length: 40 }).map((_, i) => (
                              <div
                                key={i}
                                className="h-full w-1 rounded-full bg-success/40"
                                style={{
                                  height: `${Math.random() * 100}%`,
                                  minHeight: "20%",
                                }}
                              />
                            ))}
                          </div>
                          <Badge variant="outline" className="gap-1 border-success/50 text-success text-xs">
                            <Check weight="bold" className="size-2.5" />
                            Generated
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No scenes found. Please complete the Script step first to add scenes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StepContent>
  );
}
