"use client";

import { useCallback, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  SpinnerGap,
  CloudCheck,
  CloudSlash,
  Rocket,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOTAL_STEPS } from "@/lib/wizard-steps";
import { useWizardStore } from "@/stores/wizard-store";
import { useTranslations } from "@/i18n";

// ---------------------------------------------------------------------------
// Save status indicator
// ---------------------------------------------------------------------------

function SaveIndicator() {
  const isSaving = useWizardStore((s) => s.isSaving);
  const lastSavedAt = useWizardStore((s) => s.lastSavedAt);
  const t = useTranslations();

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <SpinnerGap weight="bold" className="size-3.5 animate-spin" />
        <span>{t.wizard.saving}</span>
      </div>
    );
  }

  if (lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CloudCheck weight="duotone" className="size-3.5 text-success" />
        <span>{t.wizard.saved}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CloudSlash weight="duotone" className="size-3.5" />
      <span>{t.wizard.notSaved}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action bar
// ---------------------------------------------------------------------------

export function WizardActionBar() {
  const currentStep = useWizardStore((s) => s.currentStep);
  const projectId = useWizardStore((s) => s.projectId);
  const isSaving = useWizardStore((s) => s.isSaving);
  const nextStep = useWizardStore((s) => s.nextStep);
  const prevStep = useWizardStore((s) => s.prevStep);
  const markStepCompleted = useWizardStore((s) => s.markStepCompleted);
  const setSaving = useWizardStore((s) => s.setSaving);
  const t = useTranslations();

  const [isPending, setIsPending] = useState(false);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;
  const isNavigating = isSaving || isPending;

  const handlePrevious = useCallback(() => {
    prevStep();
  }, [prevStep]);

  const handleNext = useCallback(async () => {
    if (!projectId) return;

    setSaving(true);
    setIsPending(true);

    try {
      // Save current step progress to the database via API route (not server action)
      // to avoid Next.js automatic RSC refresh that crashes the layout
      const targetStep = isLastStep ? currentStep : currentStep + 1;
      await fetch("/api/project-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, step: targetStep }),
      });

      // Mark current step as completed and move forward
      markStepCompleted(currentStep);

      if (!isLastStep) {
        nextStep();
      }
    } finally {
      setSaving(false);
      setIsPending(false);
    }
  }, [
    projectId,
    currentStep,
    isLastStep,
    nextStep,
    markStepCompleted,
    setSaving,
  ]);

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-t border-border bg-surface px-6">
      {/* Left: Previous button */}
      <div className="flex min-w-[120px] items-center">
        {!isFirstStep && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={isNavigating}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft weight="duotone" className="size-4" />
            {t.common.previous}
          </Button>
        )}
      </div>

      {/* Center: Save indicator */}
      <div className="flex items-center">
        <SaveIndicator />
      </div>

      {/* Right: Next / Render button */}
      <div className="flex min-w-[120px] items-center justify-end">
        {isLastStep ? (
          <Button
            size="sm"
            onClick={handleNext}
            disabled={isNavigating}
            className={cn(
              "gap-2",
              "bg-gradient-to-r from-primary to-secondary text-white",
              "hover:from-primary/90 hover:to-secondary/90",
              "shadow-lg shadow-primary/20"
            )}
          >
            {isNavigating ? (
              <SpinnerGap weight="bold" className="size-4 animate-spin" />
            ) : (
              <Rocket weight="duotone" className="size-4" />
            )}
            {t.wizard.startRender}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleNext}
            disabled={isNavigating}
            className="gap-2"
          >
            {isNavigating ? (
              <SpinnerGap weight="bold" className="size-4 animate-spin" />
            ) : (
              <>
                {t.common.next}
                <ArrowRight weight="duotone" className="size-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
