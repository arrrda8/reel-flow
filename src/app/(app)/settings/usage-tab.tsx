"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CurrencyDollar,
  CalendarBlank,
  Folder,
  Brain,
  Robot,
  Sparkle,
  Waveform,
  FilmSlate,
} from "@phosphor-icons/react";
import type { CostSummary, CostEntry } from "@/lib/settings-actions";

// ---------------------------------------------------------------------------
// Provider colors & icons for usage display
// ---------------------------------------------------------------------------

const PROVIDER_CONFIG: Record<
  string,
  { label: string; colorClass: string; barColor: string; icon: React.ReactNode }
> = {
  anthropic: {
    label: "Anthropic",
    colorClass: "text-orange-400",
    barColor: "bg-orange-500",
    icon: <Brain weight="duotone" className="size-4 text-orange-400" />,
  },
  openai: {
    label: "OpenAI",
    colorClass: "text-emerald-400",
    barColor: "bg-emerald-500",
    icon: <Robot weight="duotone" className="size-4 text-emerald-400" />,
  },
  gemini: {
    label: "Gemini",
    colorClass: "text-blue-400",
    barColor: "bg-blue-500",
    icon: <Sparkle weight="duotone" className="size-4 text-blue-400" />,
  },
  elevenlabs: {
    label: "ElevenLabs",
    colorClass: "text-cyan-400",
    barColor: "bg-cyan-500",
    icon: <Waveform weight="duotone" className="size-4 text-cyan-400" />,
  },
  kling: {
    label: "Kling",
    colorClass: "text-pink-400",
    barColor: "bg-pink-500",
    icon: <FilmSlate weight="duotone" className="size-4 text-pink-400" />,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UsageTabProps {
  costSummary: CostSummary;
}

export function UsageTab({ costSummary }: UsageTabProps) {
  const { totalCents, thisMonthCents, projectCount, recentEntries } =
    costSummary;

  // Aggregate costs by provider for the bar chart
  const costByProvider = new Map<string, number>();
  for (const entry of recentEntries) {
    const current = costByProvider.get(entry.provider) ?? 0;
    costByProvider.set(entry.provider, current + entry.costCents);
  }
  const maxProviderCost = Math.max(
    ...Array.from(costByProvider.values()),
    1 // avoid division by zero
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CurrencyDollar weight="duotone" className="size-4 text-primary" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold">
              {formatCents(totalCents)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarBlank weight="duotone" className="size-4 text-secondary" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold">
              {formatCents(thisMonthCents)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Folder weight="duotone" className="size-4 text-success" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold">{projectCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost by provider bar chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-heading text-base font-semibold">
          Cost by Provider
        </h3>
        {costByProvider.size === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No usage data yet. Costs will appear here as you use AI providers.
          </p>
        ) : (
          <div className="space-y-3">
            {Array.from(costByProvider.entries())
              .sort(([, a], [, b]) => b - a)
              .map(([provider, cents]) => {
                const config = PROVIDER_CONFIG[provider] ?? {
                  label: provider,
                  colorClass: "text-muted-foreground",
                  barColor: "bg-muted-foreground",
                  icon: null,
                };
                const pct = (cents / maxProviderCost) * 100;

                return (
                  <div key={provider} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {config.icon}
                        <span className={config.colorClass}>
                          {config.label}
                        </span>
                      </span>
                      <span className="font-mono text-foreground">
                        {formatCents(cents)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                      <div
                        className={`h-full rounded-full transition-all ${config.barColor}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Recent cost entries table */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-heading text-base font-semibold">
          Recent Activity
        </h3>
        {recentEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No cost entries yet. Activity will be logged as you generate content.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Provider</th>
                  <th className="pb-3 pr-4 font-medium">Operation</th>
                  <th className="pb-3 pr-4 font-medium">Project</th>
                  <th className="pb-3 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentEntries.map((entry) => {
                  const config = PROVIDER_CONFIG[entry.provider];
                  return (
                    <tr key={entry.id} className="text-foreground">
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="outline"
                          className={`${config?.colorClass ?? "text-muted-foreground"}`}
                        >
                          {config?.label ?? entry.provider}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{entry.operation}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {entry.projectName ?? "--"}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatCents(entry.costCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
