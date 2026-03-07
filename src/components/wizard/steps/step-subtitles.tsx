"use client";

import { useCallback, useState } from "react";
import {
  Subtitles,
  TextT,
  ArrowsVertical,
  Palette,
  Check,
  TextAa,
} from "@phosphor-icons/react";
import { StepContent } from "@/components/wizard/step-content";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const FONT_FAMILIES = [
  { value: "Inter", label: "Inter" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Roboto Mono", label: "Roboto Mono" },
  { value: "Poppins", label: "Poppins" },
  { value: "Bebas Neue", label: "Bebas Neue" },
];

const PRESET_COLORS = [
  { value: "#FFFFFF", label: "White", className: "bg-white" },
  { value: "#FACC15", label: "Yellow", className: "bg-yellow-400" },
  { value: "#06B6D4", label: "Cyan", className: "bg-cyan-500" },
  { value: "#8B5CF6", label: "Violet", className: "bg-violet-500" },
  { value: "#10B981", label: "Green", className: "bg-emerald-500" },
  { value: "#F43F5E", label: "Rose", className: "bg-rose-500" },
  { value: "#F97316", label: "Orange", className: "bg-orange-500" },
];

const POSITIONS = [
  { value: "top" as const, label: "Top" },
  { value: "center" as const, label: "Center" },
  { value: "bottom" as const, label: "Bottom" },
];

const BACKGROUNDS = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid Black" },
  { value: "semi-transparent", label: "Semi-Transparent" },
  { value: "blur", label: "Blur" },
];

const ANIMATIONS = [
  { value: "none" as const, label: "None" },
  { value: "fade" as const, label: "Fade" },
  { value: "slide" as const, label: "Slide" },
  { value: "typewriter" as const, label: "Typewriter" },
];

type Position = "top" | "center" | "bottom";
type Animation = "none" | "fade" | "slide" | "typewriter";

const SAMPLE_TEXT = "This is how your subtitles will look in the final video.";

// ---------------------------------------------------------------------------
// Preview Component
// ---------------------------------------------------------------------------

function SubtitlePreview({
  fontFamily,
  fontSize,
  color,
  position,
  background,
  animation,
}: {
  fontFamily: string;
  fontSize: number;
  color: string;
  position: Position;
  background: string;
  animation: Animation;
}) {
  const positionClass =
    position === "top"
      ? "items-start pt-6"
      : position === "center"
        ? "items-center"
        : "items-end pb-6";

  const bgStyle = (() => {
    switch (background) {
      case "solid":
        return "bg-black/90 px-4 py-2 rounded-lg";
      case "semi-transparent":
        return "bg-black/50 px-4 py-2 rounded-lg";
      case "blur":
        return "bg-black/30 backdrop-blur-md px-4 py-2 rounded-lg";
      default:
        return "";
    }
  })();

  const animationClass = (() => {
    switch (animation) {
      case "fade":
        return "animate-pulse";
      case "slide":
        return "animate-bounce";
      default:
        return "";
    }
  })();

  return (
    <div className={cn("flex h-full justify-center", positionClass)}>
      <div className={cn(bgStyle, animationClass)}>
        <p
          style={{
            fontFamily,
            fontSize: `${fontSize}px`,
            color,
            textShadow:
              background === "none"
                ? "0 2px 4px rgba(0,0,0,0.8), 0 0px 2px rgba(0,0,0,0.5)"
                : "none",
          }}
          className="text-center font-semibold leading-snug"
        >
          {SAMPLE_TEXT}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StepSubtitles() {
  const projectData = useWizardStore((s) => s.projectData);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);

  const [fontFamily, setFontFamily] = useState(
    projectData?.subtitleStyle?.fontFamily ?? "Inter"
  );
  const [fontSize, setFontSize] = useState(
    projectData?.subtitleStyle?.fontSize ?? 28
  );
  const [color, setColor] = useState(
    projectData?.subtitleStyle?.color ?? "#FFFFFF"
  );
  const [position, setPosition] = useState<Position>(
    projectData?.subtitleStyle?.position ?? "bottom"
  );
  const [background, setBackground] = useState(
    projectData?.subtitleStyle?.background ?? "semi-transparent"
  );
  const [animation, setAnimation] = useState<Animation>(
    projectData?.subtitleStyle?.animation ?? "none"
  );

  const handleApply = useCallback(() => {
    markStepCompleted(8);
  }, [markStepCompleted]);

  // Determine aspect ratio for preview
  const aspectRatio = projectData?.aspectRatio ?? "16:9";
  const isPortrait = aspectRatio === "9:16" || aspectRatio === "4:5";

  if (!projectData) return <StepContent isLoading />;

  return (
    <StepContent>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: Style configurator */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Subtitles weight="duotone" className="size-4 text-primary" />
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Subtitle Style
              </h3>
            </div>

            {/* Font family */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                <TextAa weight="duotone" className="mr-1 inline size-3 text-secondary" />
                Font Family
              </Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="w-full bg-surface/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <span style={{ fontFamily: f.value }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  <TextT weight="duotone" className="mr-1 inline size-3 text-secondary" />
                  Font Size
                </Label>
                <span className="font-mono text-xs text-primary">{fontSize}px</span>
              </div>
              <Slider
                value={[fontSize]}
                onValueChange={([val]) => setFontSize(val)}
                min={16}
                max={48}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>16px</span>
                <span>48px</span>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                <Palette weight="duotone" className="mr-1 inline size-3 text-secondary" />
                Text Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                      color === c.value
                        ? "border-primary scale-110 shadow-lg"
                        : "border-transparent hover:border-primary/50"
                    )}
                  >
                    <div
                      className={cn("h-6 w-6 rounded-full", c.className)}
                    />
                    {color === c.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check weight="bold" className="size-3 text-black drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                <ArrowsVertical weight="duotone" className="mr-1 inline size-3 text-secondary" />
                Position
              </Label>
              <div className="flex gap-2">
                {POSITIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPosition(p.value)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all",
                      position === p.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Background
              </Label>
              <Select value={background} onValueChange={setBackground}>
                <SelectTrigger className="w-full bg-surface/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUNDS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Animation */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Animation
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {ANIMATIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAnimation(a.value)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-center text-xs font-medium transition-all",
                      animation === a.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Live preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Subtitles weight="duotone" className="size-4 text-secondary" />
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Live Preview
              </h3>
            </div>

            <div
              className={cn(
                "relative overflow-hidden rounded-xl border border-border bg-slate-900",
                isPortrait ? "aspect-[9/16] max-h-[500px] mx-auto max-w-[280px]" : "aspect-video"
              )}
            >
              {/* Background mock video content */}
              <div className="absolute inset-0 bg-slate-800/30" />
              <div className="absolute inset-0 flex">
                <SubtitlePreview
                  fontFamily={fontFamily}
                  fontSize={fontSize}
                  color={color}
                  position={position}
                  background={background}
                  animation={animation}
                />
              </div>
            </div>

            {/* Current style summary */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {fontFamily}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {fontSize}px
              </Badge>
              <Badge variant="outline" className="text-xs">
                <div
                  className="mr-1 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {PRESET_COLORS.find((c) => c.value === color)?.label ?? color}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {position}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {background === "none" ? "No BG" : background}
              </Badge>
              {animation !== "none" && (
                <Badge variant="outline" className="text-xs capitalize">
                  {animation}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Apply button */}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleApply}
            className="gap-1.5"
          >
            <Check weight="bold" className="size-3.5" />
            Apply to All Scenes
          </Button>
        </div>
      </div>
    </StepContent>
  );
}
