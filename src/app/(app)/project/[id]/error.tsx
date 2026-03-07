"use client";

import Link from "next/link";
import { Warning } from "@phosphor-icons/react";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <Warning className="h-8 w-8 text-destructive" weight="duotone" />
      </div>
      <h2 className="font-heading text-xl font-bold">
        Project could not be loaded
      </h2>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
