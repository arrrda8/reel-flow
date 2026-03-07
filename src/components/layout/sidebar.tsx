"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  House,
  FolderOpen,
  GearSix,
  ShieldCheck,
  Plus,
  FilmReel,
} from "@phosphor-icons/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/projects", label: "Projekte", icon: FolderOpen },
  { href: "/settings", label: "Einstellungen", icon: GearSix },
];

const adminItems = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-surface/50">
      {/* Logo */}
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <FilmReel weight="duotone" className="size-6 text-primary" />
        <span className="font-heading text-lg font-bold tracking-tight">
          ReelFlow
        </span>
      </div>

      {/* New Project Button */}
      <div className="p-3">
        <Link
          href="/projects/new"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus weight="bold" className="size-4" />
          Neues Projekt
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <item.icon weight={isActive ? "fill" : "regular"} className="size-5" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-border" />
            {adminItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  <item.icon weight={isActive ? "fill" : "regular"} className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
