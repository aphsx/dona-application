"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CloudSun,
  Leaf,
  MapPinned,
  ShoppingBag,
  Stethoscope,
  Store,
  Users,
  Wheat,
} from "lucide-react";
import { listMyPlots, type Plot } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const MENUS = [
  { href: "/plots", label: "แปลงนา", icon: MapPinned },
  { href: "/notifications", label: "วิเคราะห์โรค", icon: Stethoscope },
  { href: "/notifications", label: "บริการเกษตร", icon: Leaf },
  { href: "/notifications", label: "ร้านค้า", icon: Store },
  { href: "/notifications", label: "ฟางข้าว", icon: Wheat },
  { href: "/notifications", label: "กลุ่ม", icon: Users },
  { href: "/notifications", label: "พยากรณ์อากาศ", icon: CloudSun },
  { href: "/notifications", label: "สินค้า", icon: ShoppingBag },
];

export default function HomePage() {
  const { session } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);

  useEffect(() => {
    if (!session) return;
    void listMyPlots(session.farmerId).then(setPlots).catch(() => setPlots([]));
  }, [session]);

  const area = plots.reduce((sum, plot) => sum + (plot.areaRai || 0), 0);

  return (
    <div className="pb-6">
      <header className="bg-gradient-to-br from-brand to-brand-dark px-6 pb-8 pt-10 text-white">
        <p className="text-[14px] text-white/80">สวัสดี</p>
        <h1 className="mt-1 text-[24px] font-bold">{session?.displayName}</h1>
        <p className="mt-1 text-[13px] text-white/75">{session?.tel}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-[13px]">
            {session?.role === "leader" ? "หัวหน้ากลุ่ม" : "สมาชิก"}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-[13px]">{plots.length} แปลง</span>
        </div>
      </header>

      <section className="-mt-4 px-5">
        <div className="rounded-3xl bg-gradient-to-br from-white to-card-tint p-5 shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-brand/15 p-4 text-brand">
              <CloudSun size={36} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">พยากรณ์อากาศ</div>
              <p className="mt-1 text-[13px] text-brand-dark/65">เร็วๆ นี้ · ดูรายละเอียดได้จากเมนู</p>
            </div>
            <div className="text-right">
              <div className="text-[28px] font-bold leading-none">—</div>
              <div className="mt-2 rounded-xl bg-brand/10 px-3 py-1 text-[12px] font-semibold text-brand">ตรวจสอบพยากรณ์</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-4 px-5">
        <Stat value={String(plots.length || "—")} label="แปลงที่ดูแล" />
        <Stat value={area ? `${area.toFixed(2)} ไร่` : "—"} label="พื้นที่รวม" />
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-[16px] font-bold">เมนูหลัก</h2>
        <div className="grid grid-cols-4 gap-3">
          {MENUS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3 text-center shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card-tint text-brand">
                  <Icon size={24} />
                </span>
                <span className="text-[12px] font-semibold leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[22px] border border-brand/10 bg-white p-[18px] shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
      <div className="text-[22px] font-bold text-brand-dark">{value}</div>
      <div className="mt-1 text-[13px] text-brand-dark/65">{label}</div>
    </div>
  );
}
