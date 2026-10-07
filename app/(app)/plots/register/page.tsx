"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Footprints, MapPinned, RotateCcw } from "lucide-react";
import {
  apiMessage,
  createPlot,
  formatAreaRai,
  measurePlotArea,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  closeRing,
  distanceMeters,
  isClosedRing,
  nearPoint,
  openRing,
  polygonAreaRai,
  ringCentroid,
  type LngLat,
} from "@/lib/plot-ring";
import { placeAt, placeCenter, placeLabel } from "@/lib/thai-place";

const PlotDrawMap = dynamic(
  () => import("@/components/plot-draw-map").then((m) => m.PlotDrawMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center bg-[#0f493b]/10 text-[13px] text-brand-dark/55">
        กำลังโหลดแผนที่…
      </div>
    ),
  },
);

const GPS_MIN_STEP_M = 4;
const GPS_MAX_ACCURACY_M = 35;
const GPS_LEAVE_START_M = 12;
const GPS_CLOSE_START_M = 10;

export default function RegisterPlotPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [draft, setDraft] = useState<LngLat[]>([]);
  const [areaRai, setAreaRai] = useState<number | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [provinceId, setProvinceId] = useState(0);
  const [districtId, setDistrictId] = useState(0);
  const [subdistrictId, setSubdistrictId] = useState(0);
  const [placeSeeded, setPlaceSeeded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [walking, setWalking] = useState(false);
  const [gps, setGps] = useState<{ lng: number; lat: number; accuracy?: number } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const leftStartRef = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const closed = isClosedRing(draft);
  const points = openRing(draft);

  useEffect(() => {
    if (placeSeeded || !session?.farmer) return;
    setProvinceId(session.farmer.provinceId || 0);
    setDistrictId(session.farmer.districtId || 0);
    setSubdistrictId(session.farmer.subdistrictId || 0);
    setPlaceSeeded(true);
  }, [session, placeSeeded]);

  const focus = useMemo(
    () =>
      placeCenter({ provinceId, districtId, subdistrictId }) ??
      placeCenter(session?.farmer) ??
      null,
    [provinceId, districtId, subdistrictId, session?.farmer],
  );

  useEffect(() => {
    if (!closed) {
      setAreaRai(null);
      setMeasuring(false);
      return;
    }
    let alive = true;
    setMeasuring(true);
    void measurePlotArea(draft)
      .then((result) => {
        if (!alive) return;
        setAreaRai(result.areaRai);
      })
      .catch(() => {
        if (!alive) return;
        setAreaRai(polygonAreaRai(draft));
      })
      .finally(() => {
        if (alive) setMeasuring(false);
      });

    const center = ringCentroid(draft);
    if (center) {
      const place = placeAt(center.lng, center.lat);
      if (place) {
        setProvinceId(place.provinceId);
        setDistrictId(place.districtId);
        setSubdistrictId(place.subdistrictId);
      }
    }

    return () => {
      alive = false;
    };
  }, [closed, draft]);

  function stopWalking() {
    if (watchIdRef.current != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWalking(false);
  }

  useEffect(() => {
    if (closed) stopWalking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function finishRing(ring: LngLat[]) {
    const shape = closeRing(ring);
    if (!shape) return false;
    setDraft(shape);
    stopWalking();
    return true;
  }

  function appendGpsPoint(lng: number, lat: number) {
    const next: LngLat = [lng, lat];
    const ring = openRing(draftRef.current);
    if (ring.length === 0) {
      leftStartRef.current = false;
      setDraft([next]);
      return;
    }

    const last = ring[ring.length - 1];
    if (distanceMeters(last, next) < GPS_MIN_STEP_M) return;

    if (!leftStartRef.current && distanceMeters(ring[0], next) >= GPS_LEAVE_START_M) {
      leftStartRef.current = true;
    }

    if (
      leftStartRef.current &&
      ring.length >= 3 &&
      distanceMeters(ring[0], next) <= GPS_CLOSE_START_M
    ) {
      finishRing(ring);
      return;
    }

    setDraft([...ring, next]);
  }

  function startWalking() {
    if (closed) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }
    setError("");
    leftStartRef.current = openRing(draftRef.current).length >= 2;
    setWalking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { longitude, latitude, accuracy } = pos.coords;
        setGps({ lng: longitude, lat: latitude, accuracy: accuracy ?? undefined });
        if (accuracy != null && accuracy > GPS_MAX_ACCURACY_M) return;
        if (isClosedRing(draftRef.current)) return;
        appendGpsPoint(longitude, latitude);
      },
      (err) => {
        setWalking(false);
        watchIdRef.current = null;
        if (err.code === err.PERMISSION_DENIED) {
          setError("ไม่ได้รับอนุญาตใช้ตำแหน่ง — เปิด GPS แล้วอนุญาตแอป");
        } else {
          setError("หาตำแหน่ง GPS ไม่ได้ ลองใหม่อีกครั้ง");
        }
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
  }

  function finishWalking() {
    const ring = openRing(draftRef.current);
    if (ring.length < 3) {
      setError("เดินรอบแปลงให้ครบก่อน แล้วค่อยกดเสร็จ");
      return;
    }
    setError("");
    finishRing(ring);
  }

  function placePoint(lng: number, lat: number) {
    if (closed || walking) return;
    const ring = openRing(draft);
    const next: LngLat = [lng, lat];
    if (ring.length >= 3 && nearPoint(ring[0], next)) {
      finishRing(ring);
      return;
    }
    setDraft([...ring, next]);
  }

  function resetDraft() {
    stopWalking();
    leftStartRef.current = false;
    setDraft([]);
    setAreaRai(null);
    setName("");
    setError("");
  }

  const placeText = placeLabel({ provinceId, districtId, subdistrictId });
  const canSubmit =
    Boolean(session?.farmerId) &&
    name.trim() &&
    closed &&
    areaRai != null &&
    areaRai > 0 &&
    provinceId > 0 &&
    districtId > 0 &&
    subdistrictId > 0 &&
    !measuring;

  const hint = closed
    ? "ตั้งชื่อแปลงแล้วบันทึก"
    : walking
      ? "เดินตามขอบแปลง · กลับจุดเริ่มหรือกดเสร็จ"
      : points.length === 0
        ? "แตะมุมแปลงบนแผนที่ หรือเดินวัดด้วย GPS"
        : "แตะมุมถัดไป · แตะจุดแรกเมื่อครบเพื่อปิดรูป";

  return (
    <div className="flex h-full min-h-0 flex-col bg-brand-dark">
      <header className="relative z-20 flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/plots"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white/12 text-white backdrop-blur-sm"
          aria-label="กลับ"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-bold text-white">ลงทะเบียนแปลง</h1>
          <p className="truncate text-[12px] text-white/65">{hint}</p>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px]">
        <div className="relative min-h-0 flex-1">
          <PlotDrawMap
            className="h-full"
            draft={draft}
            onMapClick={placePoint}
            focus={focus}
            gps={gps}
            followGps={walking}
            allowClick={!walking && !closed}
          />

          {!closed && points.length === 0 && !walking && (
            <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-dark/80 px-3.5 py-2 text-[12px] font-semibold text-white shadow-lg backdrop-blur-sm">
                <MapPinned size={14} />
                แตะมุมแปลงทีละจุดบนภาพถ่าย
              </div>
            </div>
          )}

          {walking && (
            <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/90 px-3.5 py-2 text-[12px] font-semibold text-white shadow-lg backdrop-blur-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                กำลังเดินบันทึกขอบเขต
              </div>
            </div>
          )}
        </div>

        <section className="relative z-20 -mt-7 shrink-0 rounded-t-[28px] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_40px_rgba(15,73,59,0.18)]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-brand-dark/10" />

          {!closed ? (
            <div className="space-y-3">
              {walking ? (
                <button
                  type="button"
                  onClick={finishWalking}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-[15px] font-bold text-white"
                >
                  <Footprints size={18} />
                  เสร็จแล้ว
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startWalking}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-dark text-[15px] font-bold text-white"
                >
                  <Footprints size={18} />
                  เดินวัดด้วย GPS
                </button>
              )}

              {(points.length > 0 || walking) && (
                <button
                  type="button"
                  onClick={resetDraft}
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-light text-[14px] font-bold text-brand-dark"
                >
                  <RotateCcw size={15} />
                  เริ่มใหม่
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-accent/80 px-3 py-1.5 text-[12px] font-bold text-brand-dark">
                  {measuring || areaRai == null ? "กำลังวัดพื้นที่…" : formatAreaRai(areaRai)}
                </span>
                <button
                  type="button"
                  onClick={resetDraft}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-light px-3 text-[12px] font-bold text-brand-dark"
                >
                  <RotateCcw size={14} />
                  วาดใหม่
                </button>
              </div>

              <label className="block text-[12px] font-bold text-brand-dark/65">
                ชื่อแปลง <span className="text-danger">*</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="เช่น นาหลังบ้าน"
                  className="mt-1 h-12 w-full rounded-2xl border border-brand/15 bg-brand-light/50 px-3.5 text-[15px] font-normal text-brand-dark outline-none focus:border-brand/40"
                />
              </label>

              <div className="rounded-2xl bg-brand-light/70 px-3.5 py-3 text-[12px] leading-relaxed text-brand-dark/65">
                <span className="font-bold text-brand-dark">ที่ตั้งจากรูปแปลง</span>
                <span className="mt-0.5 block">{placeText === "—" ? "ยังระบุตำบลไม่ได้" : placeText}</span>
              </div>

              <button
                type="button"
                disabled={busy || !canSubmit}
                onClick={() => {
                  if (!session || !canSubmit || areaRai == null) return;
                  void (async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const plot = await createPlot({
                        farmerId: session.farmerId,
                        name: name.trim(),
                        areaRai,
                        provinceId,
                        districtId,
                        subdistrictId,
                        polygon: draft,
                      });
                      router.replace(`/plots/${plot.id}`);
                    } catch (err) {
                      setError(apiMessage(err));
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-[15px] font-bold text-white disabled:bg-brand/35"
              >
                {busy ? "กำลังบันทึก…" : "บันทึกแปลง"}
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-[13px] font-semibold text-danger">{error}</p>}
        </section>
      </div>
    </div>
  );
}
