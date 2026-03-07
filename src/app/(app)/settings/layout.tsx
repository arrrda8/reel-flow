import { GearSix } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | ReelFlow",
  description: "Manage your account, API keys, and usage",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <GearSix weight="duotone" className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your account, API keys, and usage
            </p>
          </div>
        </div>

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
