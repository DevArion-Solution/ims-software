"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { NAV_MODULES } from "@/lib/config/modules";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { useTenantAccess } from "@/components/providers/TenantAccessProvider";

function moduleIdForPath(pathname: string): string | null {
  const match = NAV_MODULES.find(
    (m) => pathname === m.href || pathname.startsWith(`${m.href}/`),
  );
  return match?.id ?? null;
}

/**
 * Enforces plan modules + per-user SystemUser ACL for admin routes.
 * Sidebar already hides items; this blocks direct URL access.
 */
export function ModuleGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const { data } = useData();
  const { canUseNavModule, ready } = useTenantAccess();

  const moduleId = moduleIdForPath(pathname);
  const email = session?.user.email;
  const systemUser = data.systemUsers.find((u) => u.email === email && u.active);

  let allowed = true;
  let reason = "";

  if (moduleId) {
    if (!canUseNavModule(moduleId)) {
      allowed = false;
      reason = "This module is not enabled on your school plan.";
    } else if (
      systemUser &&
      systemUser.modules.length > 0 &&
      moduleId !== "dashboard" &&
      moduleId !== "settings" &&
      !systemUser.modules.includes(moduleId)
    ) {
      allowed = false;
      reason = "Your account is not permitted to open this module.";
    }
  }

  useEffect(() => {
    if (!ready || allowed) return;
    // stay on page with message — don't auto-bounce (user sees why)
  }, [ready, allowed]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--ims-text-muted)]">
        Checking module access…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-600" />
        <h1 className="text-xl font-semibold text-[var(--ims-text)]">Access restricted</h1>
        <p className="text-sm text-[var(--ims-text-muted)]">{reason}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-lg bg-[var(--ims-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
