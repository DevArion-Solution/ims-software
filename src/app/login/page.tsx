"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  DEMO_ACCOUNTS,
  portalHome,
  useAuth,
  type DemoAccount,
} from "@/components/providers/AuthProvider";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const roleMeta: Record<
  DemoAccount["portal"],
  { label: string; color: string }
> = {
  super: {
    label: "Super Admin",
    color: "border-[var(--sa-gold)] text-[#7a6210] bg-[var(--sa-gold-soft)]/40",
  },
  admin: { label: "Admin", color: "border-[var(--ims-primary)] text-[var(--ims-primary)]" },
  teacher: { label: "Teacher", color: "border-sky-600 text-sky-700" },
  accountant: { label: "Accountant", color: "border-amber-600 text-amber-700" },
  parent: { label: "Parent", color: "border-emerald-600 text-emerald-700" },
  student: { label: "Student", color: "border-[var(--ims-accent)] text-[var(--ims-accent)]" },
  principal: { label: "Principal", color: "border-indigo-600 text-indigo-700" },
  librarian: { label: "Librarian", color: "border-teal-600 text-teal-700" },
  receptionist: { label: "Reception", color: "border-rose-600 text-rose-700" },
};

export default function LoginPage() {
  const router = useRouter();
  const { dict, locale, setLocale } = useLocale();
  const { login, loginAs, logout, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("super@ims.cloud");
  const [password, setPassword] = useState("super123");
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (session) await logout();
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Login failed");
      return;
    }
    router.push(portalHome(result.portal!));
  }

  async function quickLogin(account: DemoAccount) {
    setLoading(true);
    setError("");
    setEmail(account.email);
    setPassword(account.password);
    if (session) await logout();
    const result = await loginAs(account);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Login failed");
      return;
    }
    router.push(portalHome(result.portal ?? account.portal));
  }

  async function continueAsCurrent() {
    if (!session) return;
    router.push(portalHome(session.portal));
  }

  async function switchAccount() {
    setLoading(true);
    await logout();
    setLoading(false);
    setError("");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--ims-bg)]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 20%, #d8e8ec 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 10%, rgba(201,162,39,0.22) 0%, transparent 50%), linear-gradient(160deg, #f7fafb 0%, #eef3f5 45%, #f5efe9 100%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sa-ink)] font-[family-name:var(--font-display)] text-xl font-bold text-[var(--sa-gold)]">
                IMS
              </div>
              <div suppressHydrationWarning>
                <p className="text-sm font-semibold text-[var(--ims-primary)]" suppressHydrationWarning>
                  {dict.brand.name}
                </p>
                <p className="text-xs text-[var(--ims-text-muted)]" suppressHydrationWarning>
                  {dict.brand.tagline}
                </p>
              </div>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight text-[var(--ims-text)] sm:text-5xl">
              One cloud. Every school. Full control.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--ims-text-muted)]">
              Super Admin runs the platform. Each school gets Admin, Teacher, Accountant,
              Parent and Student portals — with plans, seats and modules under your command.
            </p>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => quickLogin(account)}
                  className={cn(
                    "rounded-xl border bg-white/85 p-3 text-left transition hover:shadow-md",
                    roleMeta[account.portal].color,
                  )}
                >
                  <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
                    {account.portal === "super" ? <Crown className="h-3.5 w-3.5" /> : null}
                    {roleMeta[account.portal].label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--ims-text)]">{account.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--ims-text-muted)]">{account.description}</p>
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-[var(--ims-text-muted)]">
              New institute?{" "}
              <Link href="/register-school" className="font-semibold text-[var(--ims-primary)]">
                Register your school
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--ims-border)] bg-white/95 p-6 shadow-[0_18px_50px_rgba(18,56,68,0.08)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--ims-text)]">{dict.auth.welcomeBack}</h2>
                <p className="mt-1 text-sm text-[var(--ims-text-muted)]">
                  Sign in with a portal account, or tap a role card
                </p>
              </div>
              <select
                aria-label={dict.common.language}
                value={locale}
                onChange={(e) => setLocale(e.target.value as "en" | "ur")}
                className="h-9 rounded-md border border-[var(--ims-border)] bg-white px-2 text-xs"
              >
                {SUPPORTED_LOCALES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {session ? (
              <div className="mb-4 rounded-xl border border-[var(--ims-border)] bg-[var(--ims-muted)]/50 p-3">
                <p className="text-sm text-[var(--ims-text)]">
                  Already signed in as{" "}
                  <span className="font-semibold">{session.user.name}</span>
                  <span className="text-[var(--ims-text-muted)]"> ({session.portal})</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={continueAsCurrent} disabled={loading}>
                    Continue
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={switchAccount}
                    disabled={loading}
                  >
                    Switch account
                  </Button>
                </div>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                label={dict.auth.email}
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label={dict.auth.password}
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? dict.common.loading : dict.auth.signIn}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-[var(--ims-text-muted)]">
              Form defaults to Super Admin for demo — tap any role card to switch
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
