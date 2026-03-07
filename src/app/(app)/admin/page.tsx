import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin, getAdminStats, getDbHealth } from "@/lib/settings-actions";
import {
  ShieldCheck,
  Users,
  Folder,
  CurrencyDollar,
  CalendarBlank,
  EnvelopeSimple,
  Database,
  CheckCircle,
  XCircle,
  Clock,
  Circle,
} from "@phosphor-icons/react/dist/ssr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | ReelFlow",
  description: "Administration overview",
};

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

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const adminAccess = await isAdmin();
  if (!adminAccess) {
    redirect("/dashboard");
  }

  const [stats, dbHealth] = await Promise.all([
    getAdminStats(),
    getDbHealth(),
  ]);

  if (!stats) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck weight="duotone" className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Platform overview and system management
            </p>
          </div>
        </div>

        {/* System Health Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold">
            <Database weight="duotone" className="size-5 text-primary" />
            System Health
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Database weight="duotone" className="size-4" />
                  Database Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {dbHealth.connected ? (
                    <>
                      <CheckCircle
                        weight="fill"
                        className="size-5 text-green-500"
                      />
                      <span className="font-medium text-green-600 dark:text-green-400">
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle
                        weight="fill"
                        className="size-5 text-destructive"
                      />
                      <span className="font-medium text-destructive">
                        Error
                      </span>
                    </>
                  )}
                </div>
                {dbHealth.connected && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock weight="duotone" className="size-3" />
                    Latency: {dbHealth.latencyMs}ms
                  </p>
                )}
                {dbHealth.error && !dbHealth.connected && (
                  <p className="mt-1 text-xs text-destructive/80">
                    {dbHealth.error}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Circle weight="duotone" className="size-4" />
                  Platform Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Users</span>
                    <span className="font-medium">{stats.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projects</span>
                    <span className="font-medium">{stats.totalProjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="font-medium">
                      {formatCents(stats.totalCostCents)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users weight="duotone" className="size-4 text-primary" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold">
                {stats.totalUsers}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Folder weight="duotone" className="size-4 text-secondary" />
                Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold">
                {stats.totalProjects}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CurrencyDollar
                  weight="duotone"
                  className="size-4 text-success"
                />
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold">
                {formatCents(stats.totalCostCents)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Management Section */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold">
            <Users weight="duotone" className="size-5 text-primary" />
            User Management
          </h2>
          {stats.userList.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">User</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 text-center font-medium">
                      Projects
                    </th>
                    <th className="pb-3 pr-4 font-medium">Registered</th>
                    <th className="pb-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {stats.userList.map((user) => (
                    <tr key={user.id} className="text-foreground">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {user.name
                              .split(" ")
                              .map((p) => p[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <EnvelopeSimple
                            weight="duotone"
                            className="size-3.5"
                          />
                          {user.email}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge variant="outline">{user.projectCount}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarBlank
                            weight="duotone"
                            className="size-3.5"
                          />
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <Badge
                          variant="outline"
                          className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                        >
                          <CheckCircle
                            weight="fill"
                            className="mr-1 size-3"
                          />
                          Active
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
