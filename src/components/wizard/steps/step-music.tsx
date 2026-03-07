"use client";

import { useCallback, useState } from "react";
import {
  MusicNotes,
  Play,
  Pause,
  Check,
  Timer,
  Metronome,
  Waveform,
  SpeakerHigh,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Mock music tracks
// ---------------------------------------------------------------------------

interface MockTrack {
  id: string;
  name: string;
  genre: string;
  mood: string;
  bpm: number;
  durationMs: number;
}

const MOCK_TRACKS: MockTrack[] = [
  {
    id: "track-1",
    name: "Electric Horizons",
    genre: "Electronic",
    mood: "Energetic",
    bpm: 128,
    durationMs: 180000,
  },
  {
    id: "track-2",
    name: "Gentle Morning",
    genre: "Ambient",
    mood: "Calm",
    bpm: 72,
    durationMs: 240000,
  },
  {
    id: "track-3",
    name: "Urban Pulse",
    genre: "Hip-Hop",
    mood: "Motivating",
    bpm: 95,
    durationMs: 210000,
  },
  {
    id: "track-4",
    name: "Cinematic Rise",
    genre: "Orchestral",
    mood: "Dramatic",
    bpm: 60,
    durationMs: 300000,
  },
  {
    id: "track-5",
    name: "Sunshine Vibes",
    genre: "Pop",
    mood: "Uplifting",
    bpm: 120,
    durationMs: 195000,
  },
  {
    id: "track-6",
    name: "Midnight Jazz",
    genre: "Jazz",
    mood: "Mysterious",
    bpm: 85,
    durationMs: 270000,
  },
  {
    id: "track-7",
    name: "Tech Innovation",
    genre: "Electronic",
    mood: "Informative",
    bpm: 110,
    durationMs: 150000,
  },
  {
    id: "track-8",
    name: "Acoustic Journey",
    genre: "Acoustic",
    mood: "Melancholic",
    bpm: 78,
    durationMs: 225000,
  },
  {
    id: "track-9",
    name: "Power Drive",
    genre: "Rock",
    mood: "Energetic",
    bpm: 140,
    durationMs: 195000,
  },
];

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Track Card
// ---------------------------------------------------------------------------

function TrackCard({
  track,
  isSelected,
  isPlaying,
  onSelect,
  onTogglePlay,
}: {
  track: MockTrack;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onTogglePlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
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

      {/* Play button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay();
        }}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
          isPlaying
            ? "bg-primary text-white"
            : "bg-surface text-muted-foreground hover:bg-primary/10 hover:text-primary"
        )}
      >
        {isPlaying ? (
          <Pause weight="fill" className="size-4" />
        ) : (
          <Play weight="fill" className="size-4 ml-0.5" />
        )}
      </button>

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold truncate", isSelected ? "text-primary" : "text-foreground")}>
          {track.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {track.genre}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {track.mood}
          </Badge>
        </div>
      </div>

      {/* Metadata */}
      <div className="shrink-0 text-right space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Metronome weight="duotone" className="size-3" />
          {track.bpm} BPM
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Timer weight="duotone" className="size-3" />
          {formatDuration(track.durationMs)}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Waveform Visualization (mock)
// ---------------------------------------------------------------------------

function WaveformVisualization({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex h-16 items-center gap-[2px] px-4">
      {Array.from({ length: 80 }).map((_, i) => {
        // Generate a pseudo-waveform pattern
        const height = Math.sin(i * 0.3) * 30 + Math.cos(i * 0.7) * 20 + 40;
        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-300",
              isPlaying ? "bg-primary" : "bg-primary/30"
            )}
            style={{
              height: `${Math.max(10, height)}%`,
              opacity: isPlaying ? 0.6 + Math.random() * 0.4 : 0.4,
              animationDuration: isPlaying ? `${0.3 + Math.random() * 0.3}s` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepMusic() {
  const projectData = useWizardStore((s) => s.projectData);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);

  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(
    projectData?.musicSettings?.volume ?? 50
  );
  const [fadeIn, setFadeIn] = useState(
    projectData?.musicSettings?.fadeIn ?? true
  );
  const [fadeOut, setFadeOut] = useState(
    projectData?.musicSettings?.fadeOut ?? true
  );

  const currentTrack = MOCK_TRACKS.find((t) => t.id === selectedTrack);

  const handleTogglePlay = useCallback(
    (trackId: string) => {
      if (playingTrack === trackId) {
        setPlayingTrack(null);
      } else {
        setPlayingTrack(trackId);
        // Auto-stop after 5 seconds (mock)
        setTimeout(() => setPlayingTrack(null), 5000);
      }
    },
    [playingTrack]
  );

  const handleApply = useCallback(() => {
    if (selectedTrack) {
      markStepCompleted(7);
    }
  }, [selectedTrack, markStepCompleted]);

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        {/* Music library grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MusicNotes weight="duotone" className="size-4 text-primary" />
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Music Library
            </h3>
            <Badge variant="outline" className="ml-auto text-xs">
              {MOCK_TRACKS.length} tracks
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_TRACKS.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isSelected={selectedTrack === track.id}
                isPlaying={playingTrack === track.id}
                onSelect={() => setSelectedTrack(track.id)}
                onTogglePlay={() => handleTogglePlay(track.id)}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Selected track details */}
        {currentTrack ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Waveform weight="duotone" className="size-4 text-secondary" />
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Selected Track
              </h3>
            </div>

            <div className="rounded-xl border border-primary/30 bg-card overflow-hidden">
              {/* Track header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(currentTrack.id)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                      playingTrack === currentTrack.id
                        ? "bg-primary text-white"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    {playingTrack === currentTrack.id ? (
                      <Pause weight="fill" className="size-4" />
                    ) : (
                      <Play weight="fill" className="size-4 ml-0.5" />
                    )}
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {currentTrack.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentTrack.genre} -- {currentTrack.mood} -- {currentTrack.bpm} BPM -- {formatDuration(currentTrack.durationMs)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Waveform visualization */}
              <div className="bg-surface/30">
                <WaveformVisualization isPlaying={playingTrack === currentTrack.id} />
              </div>
            </div>

            {/* Audio settings */}
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Volume */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">
                    <SpeakerHigh weight="duotone" className="mr-1 inline size-3 text-secondary" />
                    Volume
                  </Label>
                  <span className="font-mono text-xs text-primary">{volume}%</span>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={([val]) => setVolume(val)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              {/* Fade In */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  Fade In
                </Label>
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-4 py-3">
                  <span className="text-sm text-foreground">
                    {fadeIn ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    checked={fadeIn}
                    onCheckedChange={setFadeIn}
                  />
                </div>
              </div>

              {/* Fade Out */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  Fade Out
                </Label>
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-4 py-3">
                  <span className="text-sm text-foreground">
                    {fadeOut ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    checked={fadeOut}
                    onCheckedChange={setFadeOut}
                  />
                </div>
              </div>
            </div>

            {/* Apply button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleApply}
                className="gap-1.5"
              >
                <Check weight="bold" className="size-3.5" />
                Apply Music Settings
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center">
            <MusicNotes weight="duotone" className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Select a track from the library above to configure audio settings.
            </p>
          </div>
        )}
      </div>
    </StepContent>
  );
}
