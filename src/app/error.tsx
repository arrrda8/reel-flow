"use client";

import Link from "next/link";
import { Warning } from "@phosphor-icons/react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Icon */}
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
        <Warning className="h-10 w-10 text-destructive" weight="duotone" />
      </div>

      {/* Heading */}
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        Something went wrong
      </h1>

      {/* Error message */}
      <p className="mt-3 max-w-md text-center text-muted-foreground">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
