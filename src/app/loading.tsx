import { FilmReel } from "@phosphor-icons/react/dist/ssr";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Pulsing logo icon */}
        <div className="animate-pulse">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <FilmReel className="h-8 w-8 text-primary" weight="duotone" />
          </div>
        </div>

        {/* Brand name */}
        <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
          ReelFlow
        </span>

        {/* Spinner bar */}
        <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary to-secondary" />
        </div>
      </div>
    </div>
  );
}
