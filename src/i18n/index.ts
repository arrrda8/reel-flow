"use client";

import { useMemo, useSyncExternalStore } from "react";
import { en } from "./en";
import { de } from "./de";
import type { Translations } from "./en";

function getLocaleFromCookie(): "en" | "de" {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
  return match?.[1] === "de" ? "de" : "en";
}

// Simple external store to react to cookie changes within the same tab
let currentLocale = typeof document !== "undefined" ? getLocaleFromCookie() : "en";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  const fresh = getLocaleFromCookie();
  if (fresh !== currentLocale) {
    currentLocale = fresh;
  }
  return currentLocale;
}

function getServerSnapshot() {
  return "en" as const;
}

/**
 * Notify the translation hook that the locale cookie has changed.
 * Call this after setting the cookie so all components re-render.
 */
export function notifyLocaleChange() {
  currentLocale = getLocaleFromCookie();
  listeners.forEach((cb) => cb());
}

/**
 * React hook that returns the translation object based on the current locale cookie.
 */
export function useTranslations(): Translations {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => (locale === "de" ? de : en), [locale]);
}

/**
 * React hook that returns the current locale string.
 */
export function useLocale(): "en" | "de" {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type { Translations };
