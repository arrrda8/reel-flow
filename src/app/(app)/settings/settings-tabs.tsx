"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCircle,
  Key,
  ChartBar,
} from "@phosphor-icons/react";
import { ProfileTab } from "./profile-tab";
import { ApiKeysTab } from "./api-keys-tab";
import { UsageTab } from "./usage-tab";
import type { UserProfile, ApiKeyEntry, CostSummary } from "@/lib/settings-actions";

interface SettingsTabsProps {
  profile: UserProfile;
  apiKeys: ApiKeyEntry[];
  costSummary: CostSummary;
}

export function SettingsTabs({ profile, apiKeys, costSummary }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="profile">
      <TabsList variant="line" className="w-full justify-start border-b border-border pb-0">
        <TabsTrigger value="profile" className="gap-2">
          <UserCircle weight="duotone" className="size-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="api-keys" className="gap-2">
          <Key weight="duotone" className="size-4" />
          API Keys
        </TabsTrigger>
        <TabsTrigger value="usage" className="gap-2">
          <ChartBar weight="duotone" className="size-4" />
          Usage & Costs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <ProfileTab profile={profile} />
      </TabsContent>

      <TabsContent value="api-keys" className="mt-6">
        <ApiKeysTab apiKeys={apiKeys} />
      </TabsContent>

      <TabsContent value="usage" className="mt-6">
        <UsageTab costSummary={costSummary} />
      </TabsContent>
    </Tabs>
  );
}
