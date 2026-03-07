import { redirect } from "next/navigation";
import { getProjectById } from "@/lib/project-actions";
import { WizardShell } from "@/components/wizard/wizard-shell";

export const dynamic = "force-dynamic";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;

  let result;
  try {
    result = await getProjectById(id);
  } catch (error) {
    console.error("ProjectLayout: getProjectById threw:", error);
    redirect("/dashboard");
  }

  if (!result.success) {
    redirect("/dashboard");
  }

  // Serialize for the client component (converts Dates to strings)
  const project = JSON.parse(JSON.stringify(result.project));

  return (
    <WizardShell project={project}>
      {children}
    </WizardShell>
  );
}
