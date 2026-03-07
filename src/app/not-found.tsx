import Link from "next/link";
import { FilmReel } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Icon */}
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <FilmReel className="h-10 w-10 text-primary" weight="duotone" />
      </div>

      {/* 404 number */}
      <h1 className="font-heading text-8xl font-bold tracking-tighter bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent sm:text-9xl">
        404
      </h1>

      {/* Heading */}
      <h2 className="mt-4 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
        Page not found
      </h2>

      {/* Description */}
      <p className="mt-3 max-w-md text-center text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      {/* Back to Dashboard */}
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
