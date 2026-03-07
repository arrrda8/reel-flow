import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjects } from "@/lib/project-actions";
import { ProjectCard } from "@/components/projects/project-card";
import { EmptyState } from "@/components/projects/empty-state";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | ReelFlow",
  description: "Manage your video projects",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const projects = await getProjects();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Your Projects
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {projects.length > 0
                ? `${projects.length} project${projects.length === 1 ? "" : "s"}`
                : "Create your first faceless video"}
            </p>
          </div>
          <CreateProjectDialog>
            <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none">
              <Plus weight="bold" className="size-4" />
              New Project
            </button>
          </CreateProjectDialog>
        </div>

        {/* Project Grid or Empty State */}
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
