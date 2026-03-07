import { redirect } from "next/navigation";
import { getProjectById } from "@/lib/project-actions";
import { WizardShell } from "@/components/wizard/wizard-shell";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.success) {
    redirect("/dashboard");
  }

  // Serialize dates for the client component
  const project = {
    ...result.project,
    createdAt: result.project.createdAt,
    updatedAt: result.project.updatedAt,
    scenes: result.project.scenes.map((scene) => ({
      ...scene,
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt,
    })),
  };

  return (
    <WizardShell project={JSON.parse(JSON.stringify(project))}>
      {children}
    </WizardShell>
  );
}
