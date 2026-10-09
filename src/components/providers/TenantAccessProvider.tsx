"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { resolveTenantId } from "@/lib/platform/resolve-tenant";
import {
  buildTenantAccess,
  navModuleToPlatform,
  portalModuleKey,
  type TenantAccess,
} from "@/lib/platform/tenant-access";
import type { PlatformModuleId } from "@/types/platform";

interface TenantAccessContextValue {
  ready: boolean;
  tenantId: string;
  access: TenantAccess | null;
  refreshAccess: () => Promise<void>;
  canUseNavModule: (navId: string) => boolean;
  canUsePortal: (
    portal:
      | "teacher"
      | "accountant"
      | "parent"
      | "student"
      | "principal"
      | "librarian"
      | "receptionist",
  ) => boolean;
  hasModule: (moduleId: PlatformModuleId) => boolean;
}

const TenantAccessContext = createContext<TenantAccessContextValue | null>(null);

export function TenantAccessProvider({ children }: { children: ReactNode }) {
  const { session, ready: authReady } = useAuth();
  const [access, setAccess] = useState<TenantAccess | null>(null);
  const [ready, setReady] = useState(false);

  const tenantId = useMemo(() => resolveTenantId(session), [session]);

  const refreshAccess = useCallback(async () => {
    if (!tenantId || session?.portal === "super") {
      setAccess(null);
      setReady(true);
      return;
    }
    try {
      const res = await fetch(`/api/platform/access?tenantId=${tenantId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        setAccess((await res.json()) as TenantAccess);
      } else {
        setAccess(null);
      }
    } catch {
      setAccess(null);
    }
    setReady(true);
  }, [tenantId, session?.portal]);

  useEffect(() => {
    if (!authReady) return;
    setReady(false);
    void refreshAccess();
  }, [authReady, refreshAccess]);

  const hasModule = useCallback(
    (moduleId: PlatformModuleId) => {
      if (session?.portal === "super") return true;
      if (!access) return true;
      return access.modules.includes(moduleId);
    },
    [access, session?.portal],
  );

  const canUseNavModule = useCallback(
    (navId: string) => {
      if (navId === "dashboard" || navId === "settings" || navId === "subscription") return true;
      const platformId = navModuleToPlatform(navId);
      if (!platformId) return true;
      return hasModule(platformId);
    },
    [hasModule],
  );

  const canUsePortal = useCallback(
    (
      portal:
        | "teacher"
        | "accountant"
        | "parent"
        | "student"
        | "principal"
        | "librarian"
        | "receptionist",
    ) => hasModule(portalModuleKey(portal)),
    [hasModule],
  );

  const value = useMemo(
    () => ({
      ready,
      tenantId,
      access,
      refreshAccess,
      canUseNavModule,
      canUsePortal,
      hasModule,
    }),
    [ready, tenantId, access, refreshAccess, canUseNavModule, canUsePortal, hasModule],
  );

  return (
    <TenantAccessContext.Provider value={value}>{children}</TenantAccessContext.Provider>
  );
}

export function useTenantAccess() {
  const ctx = useContext(TenantAccessContext);
  if (!ctx) throw new Error("useTenantAccess must be used within TenantAccessProvider");
  return ctx;
}
