"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Gear,
  Lightbulb,
  NotePencil,
  Microphone,
  ImageSquare,
  Images,
  FilmStrip,
  MusicNotes,
  Subtitles,
  Play,
} from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Icon } from "@phosphor-icons/react";

interface StepDefinition {
  id: number;
  label: string;
  icon: Icon;
  conditionalKey?: "promptReview";
}

const STEPS: StepDefinition[] = [
  { id: 1, label: "Setup", icon: Gear },
  { id: 2, label: "Idee", icon: Lightbulb },
  { id: 3, label: "Skript", icon: NotePencil },
  { id: 4, label: "Voice Over", icon: Microphone },
  { id: 5, label: "Prompt Review", icon: ImageSquare, conditionalKey: "promptReview" },
  { id: 6, label: "Bildgenerierung", icon: Images },
  { id: 7, label: "Video", icon: FilmStrip },
  { id: 8, label: "Musik", icon: MusicNotes },
  { id: 9, label: "Untertitel", icon: Subtitles },
  { id: 10, label: "Render", icon: Play },
];

interface StepRailProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  promptReviewEnabled?: boolean;
}

export function StepRail({
  currentStep,
  completedSteps,
  onStepClick,
  promptReviewEnabled = true,
}: StepRailProps) {
  const visibleSteps = STEPS.filter((step) => {
    if (step.conditionalKey === "promptReview" && !promptReviewEnabled) {
      return false;
    }
    return true;
  });

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-4">
        {visibleSteps.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isClickable = isActive || isCompleted;

          return (
            <Tooltip key={step.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    isActive && "bg-primary/20 text-primary",
                    isCompleted && !isActive && "text-secondary hover:bg-secondary/10",
                    !isActive && !isCompleted && "cursor-not-allowed text-muted-foreground opacity-40"
                  )}
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="step-indicator"
                        className="absolute inset-0 rounded-lg border-2 border-primary"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                  </AnimatePresence>
                  <step.icon weight="duotone" className="relative z-10 size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {step.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
