"use client";

import { useEffect, useMemo } from "react";
import { useWizardStore, type ProjectData } from "@/stores/wizard-store";
import { WizardStepRail } from "@/components/wizard/step-rail";
import { WizardActionBar } from "@/components/wizard/action-bar";
import { StepProjectSetup } from "@/components/wizard/steps/step-project-setup";
import { StepIdeaConcept } from "@/components/wizard/steps/step-idea-concept";
import { StepScript } from "@/components/wizard/steps/step-script";
import { StepVoiceOver } from "@/components/wizard/steps/step-voice-over";
import { StepImages } from "@/components/wizard/steps/step-images";
import { StepVideo } from "@/components/wizard/steps/step-video";
import { StepMusic } from "@/components/wizard/steps/step-music";
import { StepSubtitles } from "@/components/wizard/steps/step-subtitles";
import { StepPreview } from "@/components/wizard/steps/step-preview";
import { StepRender } from "@/components/wizard/steps/step-render";

// ---------------------------------------------------------------------------
// Step component registry
// ---------------------------------------------------------------------------

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: StepProjectSetup,
  2: StepIdeaConcept,
  3: StepScript,
  4: StepVoiceOver,
  5: StepImages,
  6: StepVideo,
  7: StepMusic,
  8: StepSubtitles,
  9: StepPreview,
  10: StepRender,
};

// ---------------------------------------------------------------------------
// Wizard shell
// ---------------------------------------------------------------------------

interface WizardShellProps {
  project: ProjectData;
  children?: React.ReactNode;
}

export function WizardShell({ project, children }: WizardShellProps) {
  const setProject = useWizardStore((s) => s.setProject);
  const reset = useWizardStore((s) => s.reset);
  const currentStep = useWizardStore((s) => s.currentStep);
  const isLoading = useWizardStore((s) => s.isLoading);

  // Hydrate the store with project data from the server
  useEffect(() => {
    setProject(project);

    return () => {
      reset();
    };
  }, [project, setProject, reset]);

  // Get the active step component
  const ActiveStepComponent = useMemo(() => {
    return STEP_COMPONENTS[currentStep] ?? StepProjectSetup;
  }, [currentStep]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Step rail */}
        <WizardStepRail />

        {/* Center: Content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <WizardLoadingSkeleton />
          ) : (
            <ActiveStepComponent />
          )}
        </div>

        {/* Right: Future side panel placeholder */}
        {/* This space is reserved for context-sensitive panels in future tasks */}
      </div>

      {/* Bottom: Action bar */}
      <WizardActionBar />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton for initial hydration
// ---------------------------------------------------------------------------

function WizardLoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="shrink-0 border-b border-border bg-surface/50 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-primary/10" />
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted-foreground/10" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted-foreground/10" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded bg-muted-foreground/10" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted-foreground/10" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-32 animate-pulse rounded-xl bg-muted-foreground/10" />
            <div className="h-32 animate-pulse rounded-xl bg-muted-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
