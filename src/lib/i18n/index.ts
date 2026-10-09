import en, { type Dictionary } from "./en";
import ur from "./ur";
import type { Locale } from "@/types";

const dictionaries: Record<Locale, Dictionary> = { en, ur };

export type { Dictionary, Locale };

export function getDictionary(locale: Locale = "en"): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export function t(
  dict: Dictionary,
  path: string,
): string {
  const parts = path.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

export const SUPPORTED_LOCALES: { code: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ur", label: "اردو", dir: "rtl" },
];
