import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProfile, getApiKeys, getCostSummary } from "@/lib/settings-actions";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [profile, keys, costSummary] = await Promise.all([
    getProfile(),
    getApiKeys(),
    getCostSummary(),
  ]);

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
