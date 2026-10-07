"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eraser, MapPinned, Redo2, Undo2 } from "lucide-react";
import {
  apiMessage,
  createPlot,
  formatAreaRai,
  measurePlotArea,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  closeRing,
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

  function placePoint(lng: number, lat: number) {
    if (closed) return;
    const ring = openRing(draft);
    const next: LngLat = [lng, lat];
    if (ring.length >= 3 && nearPoint(ring[0], next)) {
      const shape = closeRing(ring);
      if (shape) setDraft(shape);
      return;
    }
    setDraft([...ring, next]);
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
          <p className="truncate text-[12px] text-white/65">
            {closed
              ? "ตรวจพื้นที่แล้วตั้งชื่อแปลง"
              : points.length === 0
                ? "แตะแผนที่เพื่อวางมุมแปลง"
                : `วางจุดแล้ว ${points.length} จุด · แตะจุดแรกเพื่อปิดรูป`}
          </p>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px]">
        <div className="relative min-h-0 flex-1">
          <PlotDrawMap
            className="h-full"
            draft={draft}
            onMapClick={placePoint}
            focus={focus}
          />

          {!closed && points.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-dark/80 px-3.5 py-2 text-[12px] font-semibold text-white shadow-lg backdrop-blur-sm">
                <MapPinned size={14} />
                แตะมุมแปลงทีละจุดบนภาพถ่าย
              </div>
            </div>
          )}
        </div>

        {/* Pull up over the map so the curve sits on imagery, not brand-dark. */}
        <section className="relative z-20 -mt-7 shrink-0 rounded-t-[28px] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_40px_rgba(15,73,59,0.18)]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-brand-dark/10" />

        <div className="flex flex-wrap items-center gap-2">
          {!closed ? (
            <>
              <span className="rounded-full bg-brand-light px-3 py-1.5 text-[12px] font-bold text-brand-dark">
                {points.length} จุด
              </span>
              <button
                type="button"
                disabled={points.length === 0}
                onClick={() => setDraft(openRing(draft).slice(0, -1))}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-light px-3 text-[12px] font-bold text-brand-dark disabled:opacity-40"
              >
                <Undo2 size={14} />
                ลบจุด
              </button>
              <button
                type="button"
                disabled={points.length < 3}
                onClick={() => {
                  const shape = closeRing(openRing(draft));
                  if (shape) setDraft(shape);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-[12px] font-bold text-white disabled:bg-brand/35"
              >
                <Redo2 size={14} />
                ปิดรูป
              </button>
            </>
          ) : (
            <>
              <span className="rounded-full bg-accent/80 px-3 py-1.5 text-[12px] font-bold text-brand-dark">
                {measuring || areaRai == null ? "กำลังวัดพื้นที่…" : formatAreaRai(areaRai)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDraft([]);
                  setAreaRai(null);
                  setError("");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-light px-3 text-[12px] font-bold text-brand-dark"
              >
                <Eraser size={14} />
                วาดใหม่
              </button>
            </>
          )}
        </div>

        {closed && (
          <div className="mt-3 space-y-3">
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
          </div>
        )}

        {error && <p className="mt-3 text-[13px] font-semibold text-danger">{error}</p>}

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
          className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-[15px] font-bold text-white disabled:bg-brand/35"
        >
          {busy ? "กำลังบันทึก…" : closed ? "บันทึกแปลง" : "วาดขอบเขตให้ครบก่อน"}
        </button>
        </section>
      </div>
    </div>
  );
}
