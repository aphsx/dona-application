"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Droplets,
  MapPinned,
  Umbrella,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { PlotThumb } from "@/components/plot-thumb";
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

const DAY_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function dayHeading(iso: string, todayIso: string) {
  if (iso === todayIso) return "วันนี้";
  const today = new Date(`${todayIso}T12:00:00`);
  const day = new Date(`${iso}T12:00:00`);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff === 1) return "พรุ่งนี้";
  return DAY_TH[day.getDay()] ?? "";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    void listMyPlots(session.farmerId)
      .then((rows) => {
        setPlots(rows);
        if (rows[0]) setPlotId(rows[0].id);
      })
      .catch(() => setPlots([]));
  }, [session]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);

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

      <div className="relative z-20 mx-4 mt-4" ref={pickerRef}>
        <button
          type="button"
          disabled={plots.length <= 1}
          onClick={() => setPickerOpen((open) => !open)}
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          className="flex w-full items-center gap-3 rounded-[20px] border border-brand/[0.10] bg-white px-3.5 py-3 text-left shadow-[0_10px_24px_rgba(15,73,59,0.10)] disabled:cursor-default"
        >
          {selected ? (
            <PlotThumb plot={selected} />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-card-tint text-brand">
              <MapPinned size={22} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold tracking-wide text-brand/70">
              แปลงที่ดูอากาศ
            </span>
            <span className="mt-0.5 block truncate text-[15px] font-bold text-brand-dark">
              {selected?.name || "ยังไม่มีแปลง"}
            </span>
            <span className="mt-0.5 block truncate text-[12px] font-medium text-brand-dark/50">
              {locationLabel}
            </span>
          </span>
          {plots.length > 1 && (
            <ChevronDown
              size={18}
              className={`shrink-0 text-brand/60 transition ${pickerOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {pickerOpen && plots.length > 1 && (
          <ul
            role="listbox"
            className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[20px] border border-brand/[0.08] bg-white py-1.5 shadow-[0_16px_36px_rgba(15,73,59,0.16)]"
          >
            {plots.map((plot) => {
              const active = (selected?.id ?? "") === plot.id;
              const plotPlace = placeFromPlot(plot);
              const plotPlaceLabel = plotPlace
                ? placeLabel(plotPlace) !== "—"
                  ? placeLabel(plotPlace)
                  : provinceName(plot.provinceId)
                : "—";
              return (
                <li key={plot.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      setPlotId(plot.id);
                      setPickerOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition ${
                      active ? "bg-card-tint" : "hover:bg-brand-light/80"
                    }`}
                  >
                    <PlotThumb plot={plot} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-brand-dark">
                        {plot.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-brand-dark/50">
                        {plotPlaceLabel}
                      </span>
                    </span>
                    {active && <Check size={18} className="shrink-0 text-brand" strokeWidth={2.5} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="relative z-10 mx-4 mt-4">
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
                          {dayHeading(day.date, todayIso)}
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
