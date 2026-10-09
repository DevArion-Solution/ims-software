"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { session, exitImpersonation } = useAuth();
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-[var(--ims-bg)]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
        <Sidebar />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {session?.impersonatingSchoolId ? (
          <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 bg-[var(--sa-ink)] px-4 py-2.5 text-white sm:px-6">
            <p className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-[var(--sa-gold)]" />
              Support mode · viewing{" "}
              <strong>{session.impersonatingSchoolName}</strong> as school admin
            </p>
            <Button
              size="sm"
              className="bg-[var(--sa-gold)] text-[var(--sa-ink)] hover:bg-[#b8931f]"
              onClick={async () => {
                await exitImpersonation();
                router.push("/super-admin/schools");
              }}
            >
              Return to Super Admin
            </Button>
          </div>
        ) : null}
        <Header onMenuClick={() => setOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
