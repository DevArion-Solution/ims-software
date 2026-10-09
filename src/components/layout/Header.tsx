"use client";

import { Bell, LogOut, Menu, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useData } from "@/components/providers/DataProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCampus } from "@/components/providers/CampusProvider";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { dict, locale, setLocale } = useLocale();
  const { data } = useData();
  const { session, logout } = useAuth();
  const { campusFilter, setCampusFilter } = useCampus();
  const institute = data.institute;
  const currentUser = session?.user;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--ims-border)] bg-[var(--ims-surface)]/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md p-2 text-[var(--ims-text-muted)] hover:bg-[var(--ims-muted)] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 flex-1 md:block">
        <p className="truncate text-sm font-medium text-[var(--ims-text)]">{institute.name}</p>
        <p className="truncate text-xs text-[var(--ims-text-muted)]">
          Admin Portal · {institute.city} · {institute.campuses.length} campuses
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <select
          aria-label="Campus filter"
          value={campusFilter}
          onChange={(e) => setCampusFilter(e.target.value)}
          className="h-9 max-w-[9rem] rounded-md border border-[var(--ims-border)] bg-white px-2 text-xs outline-none sm:max-w-none"
        >
          <option value="all">All campuses</option>
          {institute.campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ims-text-subtle)]" />
          <input
            type="search"
            placeholder={dict.common.search}
            className="h-9 w-44 rounded-md border border-[var(--ims-border)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--ims-primary)] focus:ring-2 focus:ring-[var(--ims-primary-soft)] lg:w-56"
          />
        </div>

        <select
          aria-label={dict.common.language}
          value={locale}
          onChange={(e) => setLocale(e.target.value as "en" | "ur")}
          className="h-9 rounded-md border border-[var(--ims-border)] bg-white px-2 text-xs text-[var(--ims-text)] outline-none"
        >
          {SUPPORTED_LOCALES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>

        <Button variant="ghost" size="sm" className="relative px-2" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ims-accent)]" />
        </Button>

        {currentUser ? (
          <div className="flex items-center gap-2 rounded-md border border-[var(--ims-border)] bg-white py-1 pl-1 pr-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--ims-primary)] text-xs font-semibold text-white">
              {currentUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-xs font-medium text-[var(--ims-text)]">{currentUser.name}</p>
              <p className="text-[10px] capitalize text-[var(--ims-text-muted)]">
                {currentUser.role.replace(/_/g, " ")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
