"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useWizardStore } from "@/stores/wizard-store";
import { getStepById } from "@/lib/wizard-steps";

// ---------------------------------------------------------------------------
// Step content wrapper
// ---------------------------------------------------------------------------

interface StepContentProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

export function StepContent({ children, isLoading }: StepContentProps) {
  const currentStep = useWizardStore((s) => s.currentStep);
  const step = getStepById(currentStep);

  if (!step) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Step header */}
      <div className="shrink-0 border-b border-border bg-surface/50 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <step.icon weight="duotone" className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              {step.title}
            </h2>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <ScrollArea className="flex-1">
        <div className="p-8">
          {isLoading ? <StepLoadingSkeleton /> : children}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function StepLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}
