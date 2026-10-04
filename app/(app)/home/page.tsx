"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listMyPlots, type Plot } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { placeCenter, placeLabel, provinceName } from "@/lib/thai-place";
import {
  fetchWeather,
  weatherIconSrc,
  weatherLabel,
  type WeatherBundle,
} from "@/lib/weather";

const NOTIFICATIONS = [
  "แจ้งเตือนโรคระบาด",
  "แจ้งเตือนพยากรณ์อากาศ",
  "แจ้งเตือนนัดหมายบริการ",
  "แจ้งเตือนลดราคาสินค้า",
];

const MENUS = [
  { href: "/plots", label: "แปลงนา", icon: "/icons/menu-plots.png", enabled: true },
  { href: "/plan", label: "แผนปลูก", icon: "/icons/menu-plan.png", enabled: true },
  { href: "#", label: "วิเคราะห์โรค", icon: "/icons/menu-disease.png", enabled: false },
  { href: "#", label: "บริการเกษตร", icon: "/icons/menu-service.png", enabled: false },
  { href: "#", label: "ร้านค้า", icon: "/icons/menu-store.png", enabled: false },
  { href: "#", label: "ฟางข้าว", icon: "/icons/menu-straw.png", enabled: false },
] as const;

function formatAreaRai(totalRai: number): string {
  if (!totalRai || totalRai <= 0) return "-";
  let fullRai = Math.floor(totalRai);
  let ngan = Math.round((totalRai - fullRai) * 4);
  if (ngan === 4) {
    fullRai += 1;
    ngan = 0;
  }
  return `${fullRai} ไร่${ngan > 0 ? ` ${ngan} งาน` : ""}`;
}

export default function HomePage() {
  const { session } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [weather, setWeather] = useState<WeatherBundle | null>(null);

  useEffect(() => {
    if (!session) return;
    void listMyPlots(session.farmerId).then(setPlots).catch(() => setPlots([]));
  }, [session]);

  const place = useMemo(() => {
    const plot = plots.find((item) => item.provinceId);
    if (plot) {
      return {
        provinceId: plot.provinceId,
        districtId: plot.districtId,
        subdistrictId: plot.subdistrictId,
        name: plot.name,
      };
    }
    const farmer = session?.farmer;
    if (farmer?.provinceId) {
      return {
        provinceId: farmer.provinceId,
        districtId: farmer.districtId,
        subdistrictId: farmer.subdistrictId,
        name: "",
      };
    }
    return null;
  }, [plots, session]);

  const focus = placeCenter(place);

  useEffect(() => {
    if (!focus) {
      setWeather(null);
      return;
    }
    let cancelled = false;
    void fetchWeather(focus.lat, focus.lng, 7)
      .then((bundle) => {
        if (!cancelled) setWeather(bundle);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });
    return () => {
      cancelled = true;
    };
  }, [focus?.lat, focus?.lng]);

  const displayName = session?.displayName?.trim() || "ผู้ใช้งาน";
  const fieldCount = plots.length ? String(plots.length) : "-";
  const totalArea = plots.reduce((sum, plot) => sum + (plot.areaRai || 0), 0);
  const areaLabel = formatAreaRai(totalArea);
  const notifCount = NOTIFICATIONS.length;
  const weatherPlace =
    place && placeLabel(place) !== "—"
      ? placeLabel(place)
      : place?.name || (place ? provinceName(place.provinceId) : "ยังไม่มีข้อมูลพื้นที่");
  const weatherTemp = weather ? `${Math.round(weather.current.temperature)}°` : "—";
  const weatherCondition = weather
    ? weatherLabel(weather.current.weatherCode)
    : place
      ? "กำลังโหลด…"
      : "แตะเพื่อดูพยากรณ์";

  return (
    <div className="home-page relative min-h-full pb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(120%_80%_at_10%_-10%,#1d8a6a_0%,#0f493b_45%,transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230f493b' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* Top bar */}
      <header className="home-fade relative px-5 pt-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold tracking-[0.18em] text-white/70 uppercase">
              dona
            </p>
            <h1 className="mt-1 truncate text-[26px] font-bold leading-tight text-white">
              สวัสดี, {displayName}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              href="/notifications"
              className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              aria-label="การแจ้งเตือน"
            >
              <Bell size={22} strokeWidth={1.75} />
              {notifCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-md bg-accent px-1 text-[10px] font-bold text-brand-dark">
                  {notifCount}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              className="block h-11 w-11 overflow-hidden rounded-2xl bg-white/20 ring-1 ring-white/35"
            >
              <Image
                src={session?.farmer?.avatarUrl || "/images/account-icon.png"}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
                unoptimized={Boolean(session?.farmer?.avatarUrl)}
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Weather + stats as one composition */}
      <section className="home-rise relative mt-6 px-5">
        <Link
          href="/weather"
          className="group block overflow-hidden rounded-[28px] bg-white/95 shadow-[0_18px_40px_rgba(15,73,59,0.18)] ring-1 ring-white/60 backdrop-blur"
        >
          <div className="relative flex items-center gap-4 px-5 py-5">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(29,138,106,0.12),transparent_60%)]" />
            <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-card-tint">
              <Image
                src={
                  weather
                    ? weatherIconSrc(weather.current.weatherCode)
                    : "/icons/weather/partly_cloudy.png"
                }
                alt=""
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="text-[12px] font-semibold tracking-wide text-brand/80">พยากรณ์อากาศ</p>
              <p className="mt-0.5 truncate text-[17px] font-bold text-brand-dark">{weatherPlace}</p>
              <p className="mt-0.5 text-[13px] text-brand-dark/55">{weatherCondition}</p>
            </div>
            <div className="relative text-right">
              <p className="text-[32px] font-bold leading-none tracking-tight text-brand-dark">{weatherTemp}</p>
              <ChevronRight
                size={18}
                className="ml-auto mt-2 text-brand/50 transition group-hover:translate-x-0.5 group-hover:text-brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-brand-dark/[0.06] bg-brand-light/70">
            <Metric value={fieldCount} label="แปลง" />
            <Metric value={areaLabel} label="พื้นที่รวม" divider />
            <Metric value="0" label="งานรอ" divider />
          </div>
        </Link>
      </section>

      {/* Solutions — layout mirrors Flutter home_screen quick actions */}
      <section className="home-rise relative mt-8 px-5" style={{ animationDelay: "80ms" }}>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-brand-dark">โซลูชันโดน่า</h2>
            <p className="mt-0.5 text-[13px] text-brand-dark/50">เครื่องมือหลักสำหรับงานในนา</p>
          </div>
          <span className="cursor-default text-[13px] font-semibold text-brand">
            ทั้งหมด
          </span>
        </div>

        <div className="grid grid-cols-3 justify-items-center gap-x-0 gap-y-4">
          {MENUS.map((item) => (
            <SolutionCard key={item.label} item={item} />
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="home-rise relative mt-8 px-5" style={{ animationDelay: "140ms" }}>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-brand-dark">การแจ้งเตือน</h2>
            <p className="mt-0.5 text-[13px] text-brand-dark/50">{notifCount} รายการที่ควรดู</p>
          </div>
          <Link href="/notifications" className="text-[13px] font-semibold text-brand">
            ดูทั้งหมด
          </Link>
        </div>

        <ul className="overflow-hidden rounded-[24px] bg-white ring-1 ring-brand-dark/[0.05]">
          {NOTIFICATIONS.map((text, index) => (
            <li key={text}>
              <Link
                href="/notifications"
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-card-tint/50"
              >
                <span className="h-2 w-2 shrink-0 rounded-sm bg-accent" />
                <span className="flex-1 text-[14px] font-medium text-brand-dark/85">{text}</span>
                <ChevronRight size={18} className="text-brand/40" />
              </Link>
              {index < NOTIFICATIONS.length - 1 && (
                <div className="mx-4 h-px bg-brand-dark/[0.05]" />
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Tip */}
      <section className="home-rise relative mt-8 px-5" style={{ animationDelay: "200ms" }}>
        <div className="flex gap-4 rounded-[24px] bg-[linear-gradient(135deg,#e7f5ee_0%,#f3fbf7_55%,#fff8e8_100%)] px-5 py-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-brand shadow-[0_6px_14px_rgba(15,73,59,0.08)]">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-brand-dark">คอนเทนต์แนะนำกำลังมา</p>
            <p className="mt-1 text-[13px] leading-relaxed text-brand-dark/60">
              เรากำลังรวบรวมบทความ เทคนิค และสินค้าที่เหมาะกับไร่ของคุณ
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  value,
  label,
  divider,
}: {
  value: string;
  label: string;
  divider?: boolean;
}) {
  return (
    <div
      className={`px-3 py-3.5 text-center ${
        divider ? "border-l border-brand-dark/[0.06]" : ""
      }`}
    >
      <p className="truncate text-[16px] font-bold text-brand-dark">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-brand-dark/50">{label}</p>
    </div>
  );
}

function SolutionCard({
  item,
}: {
  item: (typeof MENUS)[number];
}) {
  const body = (
    <>
      <Image
        src={item.icon}
        alt=""
        width={80}
        height={80}
        className="h-20 w-20 object-contain"
      />
      <span className="text-center text-[14px] font-semibold leading-tight text-brand-dark">
        {item.label}
      </span>
    </>
  );

  const shell =
    "flex w-[116px] shrink-0 flex-col items-center gap-1.5 rounded-[20px] border border-brand/[0.08] bg-white px-2 py-2.5 shadow-[0_8px_12px_rgba(0,0,0,0.05)]";

  if (item.enabled) {
    return (
      <Link href={item.href} className={`${shell} transition active:scale-[0.98]`}>
        {body}
      </Link>
    );
  }

  return (
    <div aria-disabled title="เร็วๆ นี้" className={`${shell} cursor-default`}>
      {body}
    </div>
  );
}
