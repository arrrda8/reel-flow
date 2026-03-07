"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { getProjectById } from "@/lib/project-actions";

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
// Wizard Shell Loader — loads project data client-side to avoid RSC crashes
// ---------------------------------------------------------------------------

interface WizardShellLoaderProps {
  projectId: string;
  children?: React.ReactNode;
}

export function WizardShellLoader({ projectId, children }: WizardShellLoaderProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    try {
      const result = await getProjectById(projectId);
      if (!result.success) {
        router.replace("/dashboard");
        return;
      }
      // Serialize dates
      setProject(JSON.parse(JSON.stringify(result.project)));
    } catch {
      setError("Failed to load project");
    }
  }, [projectId, router]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return <WizardLoadingSkeleton />;
  }

  return (
    <WizardShell project={project}>
      {children}
    </WizardShell>
  );
}

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
