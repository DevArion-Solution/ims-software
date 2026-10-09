"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TenantGate } from "@/components/platform/TenantGate";
import { ModuleGate } from "@/components/platform/ModuleGate";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.portal !== "admin" && !session.impersonatingSchoolId) {
      const homes: Record<string, string> = {
        super: "/super-admin",
        teacher: "/teacher",
        accountant: "/accountant",
        parent: "/parent",
        student: "/student",
      };
      router.replace(homes[session.portal] ?? "/login");
    }
  }, [ready, session, router]);

  if (!ready || !session || (session.portal !== "admin" && !session.impersonatingSchoolId)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--ims-text-muted)]">
        Checking session…
      </div>
    );
  }

  return (
    <AppShell>
      <TenantGate>
        <ModuleGate>{children}</ModuleGate>
      </TenantGate>
    </AppShell>
  );
}
