"use client";

import { ArrowLeft, ArrowRight, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface ActionBarProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  showBack?: boolean;
}

export function ActionBar({
  onBack,
  onNext,
  nextLabel = "Next",
  isNextDisabled = false,
  isLoading = false,
  showBack = true,
}: ActionBarProps) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between border-t border-border bg-surface px-6">
      {/* Left: Back button */}
      <div>
        {showBack && onBack && (
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft weight="duotone" className="size-4" />
            Back
          </Button>
        )}
      </div>

      {/* Right: Next/action button */}
      <Button
        onClick={onNext}
        disabled={isNextDisabled || isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <SpinnerGap weight="bold" className="size-4 animate-spin" />
        ) : null}
        {nextLabel}
        {!isLoading && <ArrowRight weight="duotone" className="size-4" />}
      </Button>
    </div>
  );
}
