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

const KEY = "ims.campusFilter.v1";

type CampusFilter = "all" | string;

interface CampusContextValue {
  campusFilter: CampusFilter;
  setCampusFilter: (id: CampusFilter) => void;
  /** true if row matches current filter (or filter is all / row has no campus) */
  matchesCampus: (campusId?: string | null) => boolean;
}

const CampusContext = createContext<CampusContextValue | null>(null);

export function CampusProvider({ children }: { children: ReactNode }) {
  const [campusFilter, setCampusFilterState] = useState<CampusFilter>("all");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setCampusFilterState(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setCampusFilter = useCallback((id: CampusFilter) => {
    setCampusFilterState(id);
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const matchesCampus = useCallback(
    (campusId?: string | null) => {
      if (campusFilter === "all") return true;
      if (!campusId) return true;
      return campusId === campusFilter;
    },
    [campusFilter],
  );

  const value = useMemo(
    () => ({ campusFilter, setCampusFilter, matchesCampus }),
    [campusFilter, setCampusFilter, matchesCampus],
  );

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export function useCampus() {
  const ctx = useContext(CampusContext);
  if (!ctx) throw new Error("useCampus must be used within CampusProvider");
  return ctx;
}
