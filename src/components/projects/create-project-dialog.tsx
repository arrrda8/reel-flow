"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  YoutubeLogo,
  DeviceMobile,
  Monitor,
  FilmStrip,
  Clock,
  Rows,
  Spinner,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Platform presets
// ---------------------------------------------------------------------------

type Platform = "youtube" | "shorts" | "reels" | "tiktok" | "custom";

interface PlatformPreset {
  label: string;
  icon: typeof YoutubeLogo;
  aspectRatio: string;
  defaultDuration: number;
}

const platformPresets: Record<Platform, PlatformPreset> = {
  youtube: {
    label: "YouTube",
    icon: YoutubeLogo,
    aspectRatio: "16:9",
    defaultDuration: 300,
  },
  shorts: {
    label: "YouTube Shorts",
    icon: DeviceMobile,
    aspectRatio: "9:16",
    defaultDuration: 60,
  },
  reels: {
    label: "Instagram Reels",
    icon: DeviceMobile,
    aspectRatio: "9:16",
    defaultDuration: 30,
  },
  tiktok: {
    label: "TikTok",
    icon: DeviceMobile,
    aspectRatio: "9:16",
    defaultDuration: 60,
  },
  custom: {
    label: "Custom",
    icon: Monitor,
    aspectRatio: "16:9",
    defaultDuration: 180,
  },
};

// ---------------------------------------------------------------------------
// Duration presets
// ---------------------------------------------------------------------------

interface DurationPreset {
  label: string;
  value: number;
}

const durationPresets: DurationPreset[] = [
  { label: "30 seconds", value: 30 },
  { label: "60 seconds", value: 60 },
  { label: "90 seconds", value: 90 },
  { label: "3 minutes", value: 180 },
  { label: "5 minutes", value: 300 },
  { label: "10 minutes", value: 600 },
];

// ---------------------------------------------------------------------------
// Aspect ratio options
// ---------------------------------------------------------------------------

const aspectRatioOptions = [
  { label: "16:9 (Landscape)", value: "16:9" },
  { label: "9:16 (Portrait)", value: "9:16" },
  { label: "1:1 (Square)", value: "1:1" },
  { label: "4:5 (Portrait)", value: "4:5" },
];

// ---------------------------------------------------------------------------
// CreateProjectDialog
// ---------------------------------------------------------------------------

interface CreateProjectDialogProps {
  children: React.ReactNode;
}

export function CreateProjectDialog({ children }: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [duration, setDuration] = useState("300");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  // Submission state
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  // Handle platform change -> auto-set aspect ratio & duration
  const handlePlatformChange = useCallback((value: string) => {
    const p = value as Platform;
    setPlatform(p);
    const preset = platformPresets[p];
    setAspectRatio(preset.aspectRatio);
    setDuration(String(preset.defaultDuration));
  }, []);

  // Reset form when dialog opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setName("");
      setPlatform("youtube");
      setDuration("300");
      setAspectRatio("16:9");
      setError(null);
      setFieldErrors(null);
    }
  }, []);

  // Handle form submission via fetch (NOT server action)
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsPending(true);
      setError(null);
      setFieldErrors(null);

      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            platform,
            targetDuration: Number(duration),
            aspectRatio,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.fieldErrors) {
            setFieldErrors(data.fieldErrors);
          } else {
            setError(data.error || "Failed to create project");
          }
          return;
        }

        setOpen(false);
        router.push(`/project/${data.projectId}`);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setIsPending(false);
      }
    },
    [name, platform, duration, aspectRatio, router]
  );

  const PlatformIcon = platformPresets[platform].icon;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <FilmStrip weight="duotone" className="size-5 text-primary" />
            New Project
          </DialogTitle>
          <DialogDescription>
            Set up your video project. You can adjust all settings later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Video"
              maxLength={500}
              required
              autoFocus
              aria-invalid={fieldErrors?.name ? true : undefined}
            />
            {fieldErrors?.name && (
              <p className="text-xs text-destructive">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Platform */}
          <div className="grid gap-2">
            <Label htmlFor="platform-select">Platform</Label>
            <Select
              value={platform}
              onValueChange={handlePlatformChange}
            >
              <SelectTrigger id="platform-select" className="w-full">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(platformPresets) as Platform[]).map((key) => {
                  const preset = platformPresets[key];
                  const Icon = preset.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <Icon weight="duotone" className="size-4" />
                      {preset.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {fieldErrors?.platform && (
              <p className="text-xs text-destructive">
                {fieldErrors.platform}
              </p>
            )}
          </div>

          {/* Duration */}
          <div className="grid gap-2">
            <Label htmlFor="duration-select" className="flex items-center gap-1.5">
              <Clock weight="duotone" className="size-3.5 text-muted-foreground" />
              Target Duration
            </Label>
            <Select
              value={duration}
              onValueChange={setDuration}
            >
              <SelectTrigger id="duration-select" className="w-full">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durationPresets.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors?.targetDuration && (
              <p className="text-xs text-destructive">
                {fieldErrors.targetDuration}
              </p>
            )}
          </div>

          {/* Aspect Ratio */}
          <div className="grid gap-2">
            <Label htmlFor="aspect-ratio-select" className="flex items-center gap-1.5">
              <Rows weight="duotone" className="size-3.5 text-muted-foreground" />
              Aspect Ratio
            </Label>
            <Select
              value={aspectRatio}
              onValueChange={setAspectRatio}
            >
              <SelectTrigger id="aspect-ratio-select" className="w-full">
                <SelectValue placeholder="Select aspect ratio" />
              </SelectTrigger>
              <SelectContent>
                {aspectRatioOptions.map((ar) => (
                  <SelectItem key={ar.value} value={ar.value}>
                    {ar.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto-selected for {platformPresets[platform].label}. Override if needed.
            </p>
            {fieldErrors?.aspectRatio && (
              <p className="text-xs text-destructive">
                {fieldErrors.aspectRatio}
              </p>
            )}
          </div>

          {/* General error */}
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Preview pill */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs text-muted-foreground">
            <PlatformIcon weight="duotone" className="size-4 text-primary" />
            <span className="font-medium text-foreground">
              {platformPresets[platform].label}
            </span>
            <span className="text-border">|</span>
            <span>{aspectRatio}</span>
            <span className="text-border">|</span>
            <span>
              {durationPresets.find((d) => String(d.value) === duration)
                ?.label ?? `${duration}s`}
            </span>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner weight="bold" className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
