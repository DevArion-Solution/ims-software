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
import { useData } from "@/components/providers/DataProvider";
import type { Student } from "@/types";

const KEY = "ims.parentChild.v1";

interface ParentChildContextValue {
  children: Student[];
  childId: string | null;
  child: Student | null;
  setChildId: (id: string) => void;
}

const ParentChildContext = createContext<ParentChildContextValue | null>(null);

export function ParentChildProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { data } = useData();
  const [childId, setChildIdState] = useState<string | null>(null);

  const linked = useMemo(() => {
    const ids = session?.linkedStudentIds?.length
      ? session.linkedStudentIds
      : session?.linkedStudentId
        ? [session.linkedStudentId]
        : [];
    const list = ids
      .map((id) => data.students.find((s) => s.id === id))
      .filter(Boolean) as Student[];
    if (list.length) return list;
    // fallback: match guardian name to parent session
    if (session?.user.role === "parent") {
      const byGuardian = data.students.filter((s) =>
        s.guardians.some((g) => g.name.toLowerCase() === session.user.name.toLowerCase()),
      );
      if (byGuardian.length) return byGuardian;
    }
    return data.students.slice(0, 1);
  }, [session, data.students]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved && linked.some((s) => s.id === saved)) {
        setChildIdState(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    setChildIdState(linked[0]?.id ?? null);
  }, [linked]);

  const setChildId = useCallback((id: string) => {
    setChildIdState(id);
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const child = linked.find((s) => s.id === childId) ?? linked[0] ?? null;

  const value = useMemo(
    () => ({
      children: linked,
      childId: child?.id ?? null,
      child,
      setChildId,
    }),
    [linked, child, setChildId],
  );

  return <ParentChildContext.Provider value={value}>{children}</ParentChildContext.Provider>;
}

export function useParentChild() {
  const ctx = useContext(ParentChildContext);
  if (!ctx) throw new Error("useParentChild must be used within ParentChildProvider");
  return ctx;
}
