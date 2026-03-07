import { SessionProvider } from "next-auth/react";
import { TopBar } from "@/components/layout/top-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { isAdmin } from "@/lib/settings-actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let adminStatus = false;
  try {
    adminStatus = await isAdmin();
  } catch {
    // Fail gracefully if DB or auth is unavailable
  }

  return (
    <SessionProvider>
      <div className="flex h-screen bg-background">
        <Sidebar isAdmin={adminStatus} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
