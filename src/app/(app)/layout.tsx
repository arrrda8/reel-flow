import { SessionProvider } from "next-auth/react";
import { TopBar } from "@/components/layout/top-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex h-screen flex-col bg-background">
        <TopBar />
        <main className="flex flex-1 overflow-hidden">{children}</main>
      </div>
    </SessionProvider>
  );
}
