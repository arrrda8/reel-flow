"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GearSix,
  SignOut,
  Translate,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslations, notifyLocaleChange } from "@/i18n";

interface TopBarProps {
  projectName?: string;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TopBar({ projectName }: TopBarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentLocale, setCurrentLocale] = useState("de");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
    if (match) setCurrentLocale(match[1]);
  }, []);

  const t = useTranslations();

  function handleLocaleChange(locale: "de" | "en") {
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setCurrentLocale(locale);
    notifyLocaleChange();
    router.refresh();
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      {/* Left: Project name (optional) */}
      <div>
        {projectName && (
          <span className="text-sm font-medium text-muted-foreground">
            {projectName}
          </span>
        )}
      </div>

      {/* Right: Language switcher + User menu */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <Translate weight="duotone" className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t.topBar.language}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleLocaleChange("de")}
              className={currentLocale === "de" ? "bg-accent" : ""}
            >
              <span className="font-medium">DE</span>
              <span className="text-muted-foreground">Deutsch</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLocaleChange("en")}
              className={currentLocale === "en" ? "bg-accent" : ""}
            >
              <span className="font-medium">EN</span>
              <span className="text-muted-foreground">English</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full"
            >
              <Avatar size="default">
                <AvatarImage
                  src={session?.user?.image ?? undefined}
                  alt={session?.user?.name ?? "User"}
                />
                <AvatarFallback>
                  {getInitials(session?.user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium leading-none">
                  {session?.user?.name ?? "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email ?? ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <GearSix weight="duotone" className="size-4" />
                {t.common.settings}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="cursor-pointer"
            >
              <SignOut weight="duotone" className="size-4" />
              {t.topBar.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
