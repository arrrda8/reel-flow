import { redirect } from "next/navigation";
import { getProjectById } from "@/lib/project-actions";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

/**
 * The project index page simply redirects to the wizard.
 * The WizardShell (rendered via layout.tsx) will handle displaying
 * the correct step based on the project's currentStep from the store.
 */
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.success) {
    redirect("/dashboard");
  }

  // The layout already renders WizardShell with the step content,
  // so this page just needs to return null. The shell handles everything.
  return null;
}
