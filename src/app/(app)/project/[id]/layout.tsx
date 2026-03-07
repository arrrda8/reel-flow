import { WizardShellLoader } from "@/components/wizard/wizard-shell";

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

  return (
    <WizardShellLoader projectId={id}>
      {children}
    </WizardShellLoader>
  );
}
