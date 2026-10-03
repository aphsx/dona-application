"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Droplets, Umbrella, Wind, type LucideIcon } from "lucide-react";
import { listMyPlots, type Plot } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { placeCenter, placeLabel, provinceName } from "@/lib/thai-place";
import {
  fetchWeather,
  weatherIconSrc,
  weatherKind,
  weatherLabel,
  type WeatherBundle,
  type WeatherDay,
  type WeatherKind,
} from "@/lib/weather";

const DAY_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

const KIND_TINT: Record<WeatherKind, string> = {
  clear: "from-[#FFF4D6] to-[#FFE8A8]",
  partly: "from-[#E8F6FF] to-[#D6EEFF]",
  cloud: "from-[#EEF2F5] to-[#E0E7ED]",
  fog: "from-[#F0F2F4] to-[#E4E8EC]",
  drizzle: "from-[#E8F4FF] to-[#D4E9FF]",
  rain: "from-[#E3F0FF] to-[#C9E0FF]",
  storm: "from-[#E8E4F8] to-[#D4CCF0]",
  snow: "from-[#F2F7FF] to-[#E4EEFF]",
};

function dayShort(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return DAY_TH[date.getDay()] ?? "";
}

function dayHeading(iso: string, todayIso: string) {
  if (iso === todayIso) return "วันนี้";
  const tomorrow = new Date(`${todayIso}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === tomorrow.toISOString().slice(0, 10)) return "พรุ่งนี้";
  return dayShort(iso);
}

function WeatherArt({ code, size }: { code: number; size: number }) {
  return (
    <Image
      src={weatherIconSrc(code)}
      alt=""
      width={size}
      height={size}
      className="object-contain drop-shadow-sm"
      priority={size >= 64}
    />
  );
}

function placeFromPlot(plot: Plot | null | undefined) {
  if (!plot?.provinceId) return null;
  return {
    provinceId: plot.provinceId,
    districtId: plot.districtId,
    subdistrictId: plot.subdistrictId,
  };
}

export default function WeatherPage() {
  const { session } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [plotId, setPlotId] = useState("");
  const [weather, setWeather] = useState<WeatherBundle | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    void listMyPlots(session.farmerId)
      .then((rows) => {
        setPlots(rows);
        if (rows[0]) setPlotId(rows[0].id);
      })
      .catch(() => setPlots([]));
  }, [session]);

  const selected = plots.find((plot) => plot.id === plotId) ?? plots[0] ?? null;
  const place = useMemo(() => {
    const fromPlot = placeFromPlot(selected);
    if (fromPlot) return fromPlot;
    const farmer = session?.farmer;
    if (farmer?.provinceId) {
      return {
        provinceId: farmer.provinceId,
        districtId: farmer.districtId,
        subdistrictId: farmer.subdistrictId,
      };
    }
    return { provinceId: 16, districtId: 2502, subdistrictId: 0 };
  }, [selected, session]);

  const focus = placeCenter(place);
  const locationLabel =
    placeLabel(place) !== "—"
      ? placeLabel(place)
      : selected?.name || provinceName(place.provinceId);

  useEffect(() => {
    if (!focus) {
      setWeather(null);
      setError("ยังไม่มีพิกัดจากที่อยู่แปลง");
      return;
    }
    let cancelled = false;
    setBusy(true);
    setError("");
    void fetchWeather(focus.lat, focus.lng, 7)
      .then((bundle) => {
        if (cancelled) return;
        setWeather(bundle);
        setSelectedDate(bundle.daily[0]?.date ?? "");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setWeather(null);
          setSelectedDate("");
          setError(err instanceof Error ? err.message : "โหลดอากาศไม่สำเร็จ");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [focus?.lat, focus?.lng]);

  const todayIso = weather?.daily[0]?.date ?? "";
  const featured: WeatherDay | null =
    weather?.daily.find((day) => day.date === selectedDate) ?? weather?.daily[0] ?? null;
  const featuredKind = featured ? weatherKind(featured.weatherCode) : "cloud";
  const isToday = featured?.date === todayIso;

  return (
    <div
      className="relative min-h-full overflow-x-hidden pb-10"
      style={{
        background: "linear-gradient(180deg, #7EB8D4 0%, #A8D4C8 28%, #E8F4F0 55%, #F3FBF7 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[220px]"
        style={{
          background: "linear-gradient(135deg, #5FA8C4 0%, #6BB89A 55%, #8FCBB0 100%)",
        }}
      />

      <header className="relative z-10 grid grid-cols-[44px_1fr_44px] items-center px-4 pt-6">
        <Link
          href="/home"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm"
          aria-label="กลับ"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-center text-[18px] font-bold tracking-tight text-white">
          พยากรณ์ 7 วัน
        </h1>
        <div />
      </header>

      <p className="relative z-10 mt-2 px-5 text-center text-[12px] font-medium text-white/80">
        {locationLabel}
      </p>

      {plots.length > 1 && (
        <div className="relative z-10 mt-3 flex justify-center gap-2 overflow-x-auto px-5">
          {plots.map((plot) => {
            const active = (selected?.id ?? "") === plot.id;
            return (
              <button
                key={plot.id}
                type="button"
                onClick={() => setPlotId(plot.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
                  active ? "bg-white text-[#2F6B7A]" : "bg-white/25 text-white"
                }`}
              >
                {plot.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative z-10 mx-4 mt-5">
        {busy && !weather && (
          <div className="rounded-[28px] bg-white/90 px-5 py-10 text-center text-[14px] text-[#5A7A88]">
            กำลังโหลดอากาศ…
          </div>
        )}
        {error && !weather && (
          <div className="rounded-[28px] bg-white/90 px-5 py-10 text-center text-[14px] font-semibold text-danger">
            {error}
          </div>
        )}

        {weather && featured && (
          <>
            <section className="overflow-hidden rounded-[28px] bg-white px-5 pb-5 pt-6 shadow-[0_18px_40px_rgba(47,107,122,0.16)]">
              <div className="flex items-center gap-4">
                <div
                  className={`grid h-[120px] w-[120px] shrink-0 place-items-center rounded-[28px] bg-gradient-to-br ${KIND_TINT[featuredKind]}`}
                >
                  <WeatherArt code={featured.weatherCode} size={88} />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-[13px] font-medium text-[#8AA0AD]">
                    {dayHeading(featured.date, todayIso)}
                  </p>
                  <p className="mt-1 text-[34px] font-bold leading-none tracking-tight text-[#2F5F7A]">
                    {Math.round(featured.tempMax)}°
                    <span className="mx-1 text-[18px] font-semibold text-[#8AA0AD]">/</span>
                    {Math.round(featured.tempMin)}°
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[#8AA0AD]">สูงสุด / ต่ำสุด</p>
                  <p className="mt-2 text-[15px] font-semibold text-[#4A7A90]">
                    {weatherLabel(featured.weatherCode)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#E8F0F4] pt-4">
                <Stat
                  icon={Umbrella}
                  value={`${Math.round(featured.precipProb)}%`}
                  label="โอกาสฝน"
                />
                <Stat
                  icon={Droplets}
                  value={isToday ? `${weather.current.humidity}%` : `${featured.precipitation.toFixed(1)} มม.`}
                  label={isToday ? "ความชื้น" : "ปริมาณฝน"}
                />
                <Stat
                  icon={Wind}
                  value={isToday ? `${Math.round(weather.current.windSpeed)} กม./ชม.` : "—"}
                  label="ความเร็วลม"
                />
              </div>
            </section>

            <section className="mt-4 overflow-hidden rounded-[28px] bg-white/95 px-2 py-2 shadow-[0_10px_28px_rgba(47,107,122,0.08)]">
              <ul>
                {weather.daily.map((day, index) => {
                  const active = day.date === featured.date;
                  return (
                    <li key={day.date}>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(day.date)}
                        className={`flex w-full items-center gap-3 px-3 py-3.5 text-left transition ${
                          active ? "bg-[#E8F6F2]" : "hover:bg-[#F5FAFC]"
                        } ${index < weather.daily.length - 1 ? "border-b border-[#EEF4F7]" : ""}`}
                      >
                        <span
                          className={`w-[72px] shrink-0 text-[13px] font-medium ${
                            active ? "font-bold text-brand" : "text-[#8AA0AD]"
                          }`}
                        >
                          {dayShort(day.date)}
                        </span>
                        <span className="grid h-10 w-10 shrink-0 place-items-center">
                          <WeatherArt code={day.weatherCode} size={34} />
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-[14px] font-medium ${
                            active ? "text-[#2F5F7A]" : "text-[#5A7A88]"
                          }`}
                        >
                          {weatherLabel(day.weatherCode)}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[14px] font-semibold text-[#2F5F7A]">
                            {Math.round(day.tempMax)}°
                          </span>
                          <span className="block text-[12px] text-[#8AA0AD]">
                            ต่ำ {Math.round(day.tempMin)}°
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <p className="mt-4 text-center text-[11px] text-[#7A96A3]/70">
              Open-Meteo · {weather.current.time.replace("T", " ")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <Icon size={18} strokeWidth={1.75} className="mx-auto text-[#6BB3C9]" />
      <p className="mt-1.5 text-[15px] font-bold text-[#2F5F7A]">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-[#8AA0AD]">{label}</p>
    </div>
  );
}
