import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProfile, getApiKeys, getCostSummary } from "@/lib/settings-actions";
import { SettingsTabs } from "./settings-tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let profile, keys, costSummary;
  try {
    [profile, keys, costSummary] = await Promise.all([
      getProfile(),
      getApiKeys(),
      getCostSummary(),
    ]);
  } catch (error) {
    console.error("Settings page error:", error);
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Einstellungen konnten nicht geladen werden</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unbekannter Fehler"}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    redirect("/login");
  }

  return (
    <SettingsTabs
      profile={profile}
      apiKeys={keys}
      costSummary={costSummary}
    />
  );
}
