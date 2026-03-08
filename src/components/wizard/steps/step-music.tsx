"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MusicNotes,
  Play,
  Pause,
  Check,
  Timer,
  Metronome,
  Waveform,
  SpeakerHigh,
  Warning,
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
// CC0 / royalty-free music tracks with real audio URLs
// Sources: freepd.com (all CC0 public domain)
// ---------------------------------------------------------------------------

interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  genre: string;
  mood: string;
  bpm: number;
  durationMs: number;
  audioUrl: string;
}

const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "track-1",
    name: "Stomper",
    artist: "Kevin MacLeod",
    genre: "Electronic",
    mood: "Energetic",
    bpm: 128,
    durationMs: 123000,
    audioUrl: "https://freepd.com/music/Stomper.mp3",
  },
  {
    id: "track-2",
    name: "Carefree",
    artist: "Kevin MacLeod",
    genre: "Pop",
    mood: "Uplifting",
    bpm: 120,
    durationMs: 153000,
    audioUrl: "https://freepd.com/music/Carefree.mp3",
  },
  {
    id: "track-3",
    name: "Bossa Antigua",
    artist: "Kevin MacLeod",
    genre: "Jazz",
    mood: "Calm",
    bpm: 85,
    durationMs: 200000,
    audioUrl: "https://freepd.com/music/Bossa%20Antigua.mp3",
  },
  {
    id: "track-4",
    name: "Cipher",
    artist: "Kevin MacLeod",
    genre: "Electronic",
    mood: "Mysterious",
    bpm: 110,
    durationMs: 147000,
    audioUrl: "https://freepd.com/music/Cipher.mp3",
  },
  {
    id: "track-5",
    name: "Inspired",
    artist: "Kevin MacLeod",
    genre: "Orchestral",
    mood: "Dramatic",
    bpm: 60,
    durationMs: 222000,
    audioUrl: "https://freepd.com/music/Inspired.mp3",
  },
  {
    id: "track-6",
    name: "Heartland",
    artist: "Kevin MacLeod",
    genre: "Acoustic",
    mood: "Motivating",
    bpm: 95,
    durationMs: 180000,
    audioUrl: "https://freepd.com/music/Heartland.mp3",
  },
  {
    id: "track-7",
    name: "Happy Rock",
    artist: "Kevin MacLeod",
    genre: "Rock",
    mood: "Energetic",
    bpm: 140,
    durationMs: 105000,
    audioUrl: "https://freepd.com/music/Happy%20Rock.mp3",
  },
  {
    id: "track-8",
    name: "Dreamy Flashback",
    artist: "Kevin MacLeod",
    genre: "Ambient",
    mood: "Melancholic",
    bpm: 72,
    durationMs: 216000,
    audioUrl: "https://freepd.com/music/Dreamy%20Flashback.mp3",
  },
  {
    id: "track-9",
    name: "Funky Chunk",
    artist: "Kevin MacLeod",
    genre: "Hip-Hop",
    mood: "Informative",
    bpm: 100,
    durationMs: 132000,
    audioUrl: "https://freepd.com/music/Funky%20Chunk.mp3",
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
  hasError,
  onSelect,
  onTogglePlay,
}: {
  track: MusicTrack;
  isSelected: boolean;
  isPlaying: boolean;
  hasError: boolean;
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
          hasError
            ? "bg-destructive/10 text-destructive"
            : isPlaying
              ? "bg-primary text-white"
              : "bg-surface text-muted-foreground hover:bg-primary/10 hover:text-primary"
        )}
      >
        {hasError ? (
          <Warning weight="fill" className="size-4" />
        ) : isPlaying ? (
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
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
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
// Waveform Visualization
// ---------------------------------------------------------------------------

function WaveformVisualization({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex h-16 items-center gap-[2px] px-4">
      {Array.from({ length: 80 }).map((_, i) => {
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
  const updateProjectData = useWizardStore((s) => s.updateProjectData);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);

  const [selectedTrack, setSelectedTrack] = useState<string | null>(
    projectData?.musicSettings?.trackId ?? null
  );
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [errorTracks, setErrorTracks] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState(
    projectData?.musicSettings?.volume ?? 50
  );
  const [fadeIn, setFadeIn] = useState(
    projectData?.musicSettings?.fadeIn ?? true
  );
  const [fadeOut, setFadeOut] = useState(
    projectData?.musicSettings?.fadeOut ?? true
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = MUSIC_TRACKS.find((t) => t.id === selectedTrack);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sync volume changes to currently playing audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handleTogglePlay = useCallback(
    (trackId: string) => {
      if (playingTrack === trackId) {
        // Pause current track
        audioRef.current?.pause();
        setPlayingTrack(null);
      } else {
        // Stop previous track if any
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const track = MUSIC_TRACKS.find((t) => t.id === trackId);
        if (!track?.audioUrl) return;

        const audio = new Audio(track.audioUrl);
        audio.volume = volume / 100;
        audio.onended = () => {
          setPlayingTrack(null);
        };
        audio.onerror = () => {
          setPlayingTrack(null);
          setErrorTracks((prev) => new Set(prev).add(trackId));
        };

        audio
          .play()
          .then(() => {
            // Clear any previous error for this track
            setErrorTracks((prev) => {
              const next = new Set(prev);
              next.delete(trackId);
              return next;
            });
          })
          .catch(() => {
            setPlayingTrack(null);
            setErrorTracks((prev) => new Set(prev).add(trackId));
          });

        audioRef.current = audio;
        setPlayingTrack(trackId);
      }
    },
    [playingTrack, volume]
  );

  const handleApply = useCallback(() => {
    if (selectedTrack) {
      updateProjectData({
        musicSettings: {
          trackId: selectedTrack,
          volume,
          fadeIn,
          fadeOut,
        },
      });
      markStepCompleted(7);
    }
  }, [selectedTrack, volume, fadeIn, fadeOut, updateProjectData, markStepCompleted]);

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
              {MUSIC_TRACKS.length} tracks
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            All tracks are CC0 public domain -- free to use in any project.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MUSIC_TRACKS.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isSelected={selectedTrack === track.id}
                isPlaying={playingTrack === track.id}
                hasError={errorTracks.has(track.id)}
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
                      errorTracks.has(currentTrack.id)
                        ? "bg-destructive/10 text-destructive"
                        : playingTrack === currentTrack.id
                          ? "bg-primary text-white"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    {errorTracks.has(currentTrack.id) ? (
                      <Warning weight="fill" className="size-4" />
                    ) : playingTrack === currentTrack.id ? (
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
                      {currentTrack.artist} -- {currentTrack.genre} -- {currentTrack.mood} -- {currentTrack.bpm} BPM -- {formatDuration(currentTrack.durationMs)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Waveform visualization */}
              <div className="bg-surface/30">
                <WaveformVisualization isPlaying={playingTrack === currentTrack.id} />
              </div>

              {/* Error message */}
              {errorTracks.has(currentTrack.id) && (
                <div className="flex items-center gap-2 px-5 py-2 bg-destructive/5 border-t border-destructive/20">
                  <Warning weight="fill" className="size-3.5 text-destructive" />
                  <p className="text-xs text-destructive">
                    Audio could not be loaded. The track may be temporarily unavailable.
                  </p>
                </div>
              )}
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
