import { Skeleton } from "@/components/ui/skeleton";

function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Thumbnail skeleton */}
      <Skeleton className="aspect-video w-full" />

      {/* Content */}
      <div className="flex flex-col gap-3 p-4">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />

        {/* Badges row */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Skeleton className="h-9 w-56" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        {/* Grid skeleton */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
