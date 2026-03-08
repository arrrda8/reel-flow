"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  FloppyDisk,
  SpinnerGap,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { updateProfile } from "@/lib/settings-actions";
import type { UserProfile } from "@/lib/settings-actions";
import { notifyLocaleChange } from "@/i18n";

interface ProfileTabProps {
  profile: UserProfile;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileTab({ profile }: ProfileTabProps) {
  const [name, setName] = useState(profile.name);
  const [locale, setLocale] = useState(profile.locale);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData();
    formData.set("name", name);
    formData.set("locale", locale);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.success) {
        // Sync locale cookie so client-side translations update immediately
        document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        notifyLocaleChange();
        toast.success("Profile updated successfully");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar section */}
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-16">
            <AvatarImage
              src={profile.avatarUrl ?? undefined}
              alt={profile.name}
            />
            <AvatarFallback className="text-lg">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">Profile Photo</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1.5"
              onClick={() => toast.info("Avatar upload is not available in this version")}
            >
              <Camera weight="duotone" className="size-4" />
              Upload Photo
            </Button>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            required
            minLength={1}
            maxLength={255}
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={profile.email}
            disabled
            readOnly
            className="opacity-60"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="locale">Language</Label>
          <Select value={locale} onValueChange={(val) => setLocale(val as "de" | "en")}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de">
                <span className="flex items-center gap-2">
                  <span className="font-medium">DE</span>
                  <span className="text-muted-foreground">Deutsch</span>
                </span>
              </SelectItem>
              <SelectItem value="en">
                <span className="flex items-center gap-2">
                  <span className="font-medium">EN</span>
                  <span className="text-muted-foreground">English</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Save button */}
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <SpinnerGap weight="bold" className="size-4 animate-spin" />
          ) : (
            <FloppyDisk weight="duotone" className="size-4" />
          )}
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
