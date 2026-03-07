import Link from "next/link";
import {
  YoutubeLogo,
  DeviceMobile,
  Monitor,
  Clock,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProjectWithSceneCount } from "@/lib/project-actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 10;

const platformConfig: Record<
  string,
  { label: string; icon: typeof YoutubeLogo; gradient: string }
> = {
  youtube: {
    label: "YouTube",
    icon: YoutubeLogo,
    gradient: "from-red-600/30 to-red-900/30",
  },
  shorts: {
    label: "Shorts",
    icon: DeviceMobile,
    gradient: "from-red-500/30 to-orange-600/30",
  },
  reels: {
    label: "Reels",
    icon: DeviceMobile,
    gradient: "from-pink-500/30 to-purple-600/30",
  },
  tiktok: {
    label: "TikTok",
    icon: DeviceMobile,
    gradient: "from-cyan-500/30 to-pink-500/30",
  },
  custom: {
    label: "Custom",
    icon: Monitor,
    gradient: "from-violet-600/30 to-indigo-600/30",
  },
};

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-primary/20 text-primary border-primary/30",
  },
  rendering: {
    label: "Rendering",
    className: "bg-warning/20 text-warning border-warning/30",
  },
  completed: {
    label: "Completed",
    className: "bg-success/20 text-success border-success/30",
  },
};

// ---------------------------------------------------------------------------
// Relative time formatter
// ---------------------------------------------------------------------------

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}

// ---------------------------------------------------------------------------
// Duration formatter
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}min`;
  return `${mins}m ${secs}s`;
}

// ---------------------------------------------------------------------------
// ProjectCard component
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  project: ProjectWithSceneCount;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const platform = platformConfig[project.platform] ?? platformConfig.custom;
  const status = statusConfig[project.status] ?? statusConfig.draft;
  const PlatformIcon = platform.icon;
  const progressPercent = Math.round(
    (project.currentStep / TOTAL_STEPS) * 100
  );

  return (
    <Link
      href={`/project/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
    >
      {/* Thumbnail or gradient placeholder */}
      <div className="relative aspect-video w-full overflow-hidden">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${platform.gradient}`}
          >
            <PlatformIcon
              weight="duotone"
              className="size-12 text-foreground/20"
            />
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Title */}
        <h3 className="font-heading text-base font-semibold leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {project.name}
        </h3>

        {/* Platform & meta badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <PlatformIcon weight="duotone" className="size-3" />
            {platform.label}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock weight="duotone" className="size-3" />
            {formatDuration(project.targetDuration)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {project.aspectRatio}
          </Badge>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2">
          <Progress
            value={progressPercent}
            className="h-1.5 flex-1"
          />
          <span className="shrink-0 text-xs text-muted-foreground">
            Step {project.currentStep}/{TOTAL_STEPS}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span>
            {project.sceneCount}{" "}
            {project.sceneCount === 1 ? "scene" : "scenes"}
          </span>
          <span>{getRelativeTime(project.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
