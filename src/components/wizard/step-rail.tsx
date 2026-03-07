"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "@/lib/wizard-steps";
import { useWizardStore, type StepStatus } from "@/stores/wizard-store";

// ---------------------------------------------------------------------------
// Step item
// ---------------------------------------------------------------------------

interface StepItemProps {
  step: (typeof WIZARD_STEPS)[number];
  status: StepStatus;
  isLast: boolean;
  onNavigate: (stepId: number) => void;
}

function StepItem({ step, status, isLast, onNavigate }: StepItemProps) {
  const Icon = step.icon;
  const isCurrent = status === "current";
  const isCompleted = status === "completed";
  const isAvailable = status === "available";
  const isLocked = status === "locked";
  const isClickable = isCurrent || isCompleted || isAvailable;

  const handleClick = useCallback(() => {
    if (isClickable) {
      onNavigate(step.id);
    }
  }, [isClickable, onNavigate, step.id]);

  return (
    <div className="flex flex-col items-center">
      {/* Step button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={isLocked}
            aria-label={`Step ${step.id}: ${step.title}`}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
              isCurrent && "bg-primary/15 text-primary",
              isCompleted && "bg-success/10 text-success hover:bg-success/20",
              isAvailable && "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              isLocked && "cursor-not-allowed text-muted-foreground/30"
            )}
          >
            {/* Active step glow ring */}
            <AnimatePresence>
              {isCurrent && (
                <motion.div
                  layoutId="wizard-step-ring"
                  className="absolute inset-0 rounded-xl border-2 border-primary/60"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
            </AnimatePresence>

            {/* Pulsing dot for current step */}
            {isCurrent && (
              <motion.div
                className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}

            {/* Icon or check mark */}
            <div className="relative z-10">
              {isCompleted ? (
                <Check weight="bold" className="size-4" />
              ) : (
                <Icon weight="duotone" className="size-5" />
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="max-w-48">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">
              {step.id}. {step.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {isLocked
                ? "Complete previous steps to unlock"
                : isCompleted
                  ? "Completed"
                  : isCurrent
                    ? "In progress"
                    : "Click to navigate"}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Connector line */}
      {!isLast && (
        <div className="relative my-1 h-4 w-px">
          <div
            className={cn(
              "absolute inset-0 w-px transition-colors duration-300",
              isCompleted ? "bg-success/40" : "bg-border"
            )}
          />
          {/* Animated fill for completed connections */}
          {isCompleted && (
            <motion.div
              className="absolute inset-0 w-px bg-success/60"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.3 }}
              style={{ transformOrigin: "top" }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step rail
// ---------------------------------------------------------------------------

export function WizardStepRail() {
  const stepStatus = useWizardStore((s) => s.stepStatus);
  const goToStep = useWizardStore((s) => s.goToStep);

  const handleNavigate = useCallback(
    (stepId: number) => {
      goToStep(stepId);
    },
    [goToStep]
  );

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label="Wizard steps"
        className="flex w-16 shrink-0 flex-col border-r border-border bg-surface"
      >
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center gap-0 py-4">
            {WIZARD_STEPS.map((step, index) => (
              <StepItem
                key={step.id}
                step={step}
                status={stepStatus[step.id] ?? "locked"}
                isLast={index === WIZARD_STEPS.length - 1}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Step counter at the bottom */}
        <div className="flex shrink-0 items-center justify-center border-t border-border py-3">
          <StepCounter />
        </div>
      </nav>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Step counter badge
// ---------------------------------------------------------------------------

function StepCounter() {
  const stepStatus = useWizardStore((s) => s.stepStatus);

  const completedCount = Object.values(stepStatus).filter(
    (s) => s === "completed"
  ).length;

  return (
    <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
      {completedCount}/{WIZARD_STEPS.length}
    </span>
  );
}
