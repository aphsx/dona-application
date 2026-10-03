"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, List, MessageCircle, User } from "lucide-react";

const NAV = [
  { href: "/home", label: "หน้าหลัก", icon: Home },
  { href: "/plots", label: "แปลงนา", icon: List },
  { href: "/notifications", label: "แจ้งเตือน", icon: Bell },
  { href: "/chat", label: "แชท", icon: MessageCircle },
  { href: "/profile", label: "ข้อมูลส่วนตัว", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-col bg-brand-light">
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <nav className="grid shrink-0 grid-cols-5 border-t border-black/5 bg-white px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-[11px] ${
                active ? "font-bold text-brand" : "text-brand-dark/45"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
