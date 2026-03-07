"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Microphone,
  SpeakerHigh,
  Waveform,
  Check,
  SpinnerGap,
  User,
  Play,
  Pause,
  Warning,
} from "@phosphor-icons/react";
import Link from "next/link";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  listVoices,
  generateVoiceOver,
  getVoiceOverUrl,
} from "@/lib/voice-actions";

// ---------------------------------------------------------------------------
// Voice type from API
// ---------------------------------------------------------------------------

interface Voice {
  id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  previewUrl: string;
}

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
  voice: Voice;
  isSelected: boolean;
  onSelect: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}) {
  const gender = voice.labels?.gender ?? "";
  const accent = voice.labels?.accent ?? voice.labels?.language ?? "";
  const style = voice.category || voice.labels?.use_case || "";

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
            {accent && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground capitalize">{gender}{gender && accent ? " · " : ""}{accent}</span>
              </div>
            )}
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

      {style && (
        <Badge variant="outline" className="text-xs capitalize">
          {style}
        </Badge>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepVoiceOver() {
  const projectData = useWizardStore((s) => s.projectData);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);
  const updateProjectData = useWizardStore((s) => s.updateProjectData);

  // Voice list state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  // Local state
  const [selectedVoice, setSelectedVoice] = useState<string | null>(
    projectData?.voiceId ?? null
  );
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  const [sceneAudioUrls, setSceneAudioUrls] = useState<Record<number, string>>({});
  const [sceneErrors, setSceneErrors] = useState<Record<number, string>>({});
  const [playingScene, setPlayingScene] = useState<number | null>(null);
  const sceneAudioRef = useRef<HTMLAudioElement | null>(null);

  const scenes = projectData?.scenes ?? [];

  // Load voices on mount
  useEffect(() => {
    let cancelled = false;

    async function loadVoices() {
      setVoicesLoading(true);
      setApiKeyMissing(false);
      setVoicesError(null);

      try {
        const result = await listVoices();
        if (!cancelled) {
          setVoices(result);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("No ElevenLabs API key")) {
          setApiKeyMissing(true);
        } else {
          setVoicesError(message);
        }
      } finally {
        if (!cancelled) {
          setVoicesLoading(false);
        }
      }
    }

    loadVoices();
    return () => { cancelled = true; };
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      sceneAudioRef.current?.pause();
    };
  }, []);

  const handleTogglePlay = useCallback(
    (voiceId: string) => {
      if (playingVoice === voiceId) {
        // Stop playing
        audioRef.current?.pause();
        audioRef.current = null;
        setPlayingVoice(null);
        return;
      }

      // Stop any current playback
      audioRef.current?.pause();

      const voice = voices.find((v) => v.id === voiceId);
      if (!voice?.previewUrl) return;

      const audio = new Audio(voice.previewUrl);
      audioRef.current = audio;
      setPlayingVoice(voiceId);

      audio.addEventListener("ended", () => {
        setPlayingVoice(null);
        audioRef.current = null;
      });

      audio.addEventListener("error", () => {
        setPlayingVoice(null);
        audioRef.current = null;
      });

      audio.play().catch(() => {
        setPlayingVoice(null);
        audioRef.current = null;
      });
    },
    [playingVoice, voices]
  );

  const handleToggleScenePlay = useCallback(
    (sceneIndex: number) => {
      if (playingScene === sceneIndex) {
        sceneAudioRef.current?.pause();
        sceneAudioRef.current = null;
        setPlayingScene(null);
        return;
      }

      sceneAudioRef.current?.pause();

      const url = sceneAudioUrls[sceneIndex];
      if (!url) return;

      const audio = new Audio(url);
      sceneAudioRef.current = audio;
      setPlayingScene(sceneIndex);

      audio.addEventListener("ended", () => {
        setPlayingScene(null);
        sceneAudioRef.current = null;
      });

      audio.addEventListener("error", () => {
        setPlayingScene(null);
        sceneAudioRef.current = null;
      });

      audio.play().catch(() => {
        setPlayingScene(null);
        sceneAudioRef.current = null;
      });
    },
    [playingScene, sceneAudioUrls]
  );

  const handleGenerateAll = useCallback(async () => {
    if (!selectedVoice || !projectData?.id) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedScenes(new Set());
    setSceneErrors({});
    setSceneAudioUrls({});

    const scenesWithText = scenes.filter((s) => s.narrationText);
    const totalScenes = scenesWithText.length;

    if (totalScenes === 0) {
      setIsGenerating(false);
      return;
    }

    const settings = { stability, similarityBoost, speed };
    let allSucceeded = true;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene.narrationText) continue;

      try {
        const result = await generateVoiceOver(
          projectData.id,
          scene.id,
          selectedVoice,
          scene.narrationText,
          settings
        );

        // Get a playable URL for the generated audio
        if (result.audioKey) {
          try {
            const url = await getVoiceOverUrl(result.audioKey);
            setSceneAudioUrls((prev) => ({ ...prev, [i]: url }));
          } catch {
            // Non-critical: audio URL fetch failed but generation succeeded
          }
        }

        setGeneratedScenes((prev) => new Set([...prev, i]));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setSceneErrors((prev) => ({ ...prev, [i]: message }));
        allSucceeded = false;
      }

      const completedCount = [...Array(i + 1)].filter(
        (_, idx) => scenes[idx]?.narrationText
      ).length;
      setGenerationProgress((completedCount / totalScenes) * 100);
    }

    setIsGenerating(false);

    if (allSucceeded) {
      // Update project data with selected voice and settings
      updateProjectData({
        voiceId: selectedVoice,
        voiceSettings: settings,
      });
      markStepCompleted(4);
    }
  }, [selectedVoice, projectData?.id, scenes, stability, similarityBoost, speed, markStepCompleted, updateProjectData]);

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        {/* API key missing banner */}
        {apiKeyMissing && (
          <div className="flex items-center gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3">
            <Warning weight="duotone" className="size-5 shrink-0 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">
                ElevenLabs API Key fehlt
              </p>
              <p className="text-xs text-muted-foreground">
                Bitte unter{" "}
                <Link href="/settings" className="underline text-primary hover:text-primary/80">
                  Einstellungen &rarr; API Keys
                </Link>{" "}
                hinzufuegen.
              </p>
            </div>
          </div>
        )}

        {/* Generic error banner */}
        {voicesError && !apiKeyMissing && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <Warning weight="duotone" className="size-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{voicesError}</p>
          </div>
        )}

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
                {voices.find((v) => v.id === selectedVoice)?.name}
              </Badge>
            )}
          </div>

          {voicesLoading ? (
            <div className="flex items-center justify-center py-12">
              <SpinnerGap weight="bold" className="size-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading voices...</span>
            </div>
          ) : voices.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {voices.map((voice) => (
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
          ) : !apiKeyMissing && !voicesError ? (
            <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No voices available.
              </p>
            </div>
          ) : null}
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
              disabled={!selectedVoice || isGenerating || apiKeyMissing}
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
                {generatedScenes.size + 1} of {scenes.filter((s) => s.narrationText).length}...
              </p>
            </div>
          )}

          {/* Scene list */}
          <div className="space-y-2">
            {scenes.length > 0 ? (
              scenes.map((scene, index) => {
                const isGenerated = generatedScenes.has(index);
                const sceneError = sceneErrors[index];
                const hasAudioUrl = !!sceneAudioUrls[index];

                return (
                  <div
                    key={scene.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-all",
                      sceneError
                        ? "border-destructive/30 bg-destructive/5"
                        : isGenerated
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
                      {sceneError && (
                        <div className="mt-2 flex items-center gap-2">
                          <Warning weight="duotone" className="size-3.5 text-destructive" />
                          <span className="text-xs text-destructive">{sceneError}</span>
                        </div>
                      )}
                      {isGenerated && (
                        <div className="mt-2 flex items-center gap-2">
                          {hasAudioUrl && (
                            <button
                              type="button"
                              onClick={() => handleToggleScenePlay(index)}
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                                playingScene === index
                                  ? "bg-success text-white"
                                  : "bg-success/20 text-success hover:bg-success/30"
                              )}
                            >
                              {playingScene === index ? (
                                <Pause weight="fill" className="size-2.5" />
                              ) : (
                                <Play weight="fill" className="size-2.5" />
                              )}
                            </button>
                          )}
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
