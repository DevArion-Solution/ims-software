"use client";

import { ParentChildProvider } from "@/components/providers/ParentChildProvider";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <ParentChildProvider>{children}</ParentChildProvider>;
}
