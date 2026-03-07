import { VideoCamera, Plus } from "@phosphor-icons/react/dist/ssr";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

export function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center justify-center text-center">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="flex size-24 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <VideoCamera
            weight="duotone"
            className="size-12 text-primary"
          />
        </div>
        {/* Decorative glow */}
        <div className="absolute inset-0 -z-10 size-24 rounded-2xl bg-primary/5 blur-xl" />
      </div>

      {/* Text */}
      <h2 className="font-heading text-xl font-semibold text-foreground">
        No projects yet
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first faceless video project. Choose a platform, set your
        preferences, and let the AI guide you through each step.
      </p>

      {/* CTA */}
      <CreateProjectDialog>
        <button className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none">
          <Plus weight="bold" className="size-4" />
          Create Your First Project
        </button>
      </CreateProjectDialog>

      {/* Subtle hint cards */}
      <div className="mt-12 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card/50 p-4 text-left">
          <div className="mb-2 text-2xl font-heading font-bold text-primary">1</div>
          <p className="text-xs text-muted-foreground">
            Pick a platform and describe your video idea
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-4 text-left">
          <div className="mb-2 text-2xl font-heading font-bold text-primary">2</div>
          <p className="text-xs text-muted-foreground">
            AI generates script, visuals, and voice-over
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-4 text-left">
          <div className="mb-2 text-2xl font-heading font-bold text-primary">3</div>
          <p className="text-xs text-muted-foreground">
            Review, refine, and export your finished video
          </p>
        </div>
      </div>
    </div>
  );
}
