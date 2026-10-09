"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTenantAccess } from "@/components/providers/TenantAccessProvider";
import { Button } from "@/components/ui/Button";

export function TenantGate({ children }: { children: React.ReactNode }) {
  const { session, exitImpersonation } = useAuth();
  const { ready, access } = useTenantAccess();

  if (!ready || !access) return <>{children}</>;
  if (session?.portal === "super") return <>{children}</>;
  if (access.canOperate) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-600" />
        <h1 className="mt-4 text-xl font-semibold text-[var(--ims-text)]">Access blocked</h1>
        <p className="mt-2 text-sm text-[var(--ims-text-muted)]">{access.blockReason}</p>
        <p className="mt-1 text-xs text-[var(--ims-text-subtle)]">
          {access.schoolName} · Status: {access.status}
        </p>
        {session?.impersonatingSchoolId ? (
          <Button className="mt-6" onClick={() => exitImpersonation()}>
            Return to Super Admin
          </Button>
        ) : (
          <Link href="/login" className="mt-6 inline-block">
            <Button variant="secondary">Back to login</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
