"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function IndexPage() {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(session ? "/home" : "/login");
  }, [ready, session, router]);

  return (
    <div className="flex min-h-full items-center justify-center bg-brand-light text-brand-dark/60">
      กำลังโหลด…
    </div>
  );
}
