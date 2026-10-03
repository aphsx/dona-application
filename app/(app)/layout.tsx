"use client";

import { AppShell } from "@/components/shell";
import { RequireAuth } from "@/lib/auth";

export default function LoggedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
