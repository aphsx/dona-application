"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPinned } from "lucide-react";
import { useEffect, useState } from "react";
import {
  apiMessage,
  farmerDisplayName,
  formatAreaRai,
  getFarmer,
  getPlot,
  type Farmer,
  type Plot,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { placeCenter, placeLabel, placeParts } from "@/lib/thai-place";

const PlotMap = dynamic(() => import("@/components/plot-map").then((m) => m.PlotMap), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-[13px] text-brand-dark/50">กำลังโหลดแผนที่…</div>,
});

export default function PlotDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { session } = useAuth();
  const [plot, setPlot] = useState<Plot | null>(null);
  const [owner, setOwner] = useState<Farmer | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    setOwner(null);
    void getPlot(id)
      .then(async (next) => {
        setPlot(next);
        if (next.farmerId !== session?.farmerId) {
          try {
            setOwner(await getFarmer(next.farmerId));
          } catch {
            setOwner(null);
          }
        }
      })
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoading(false));
  }, [id, session?.farmerId]);

  const hasBoundary = (plot?.polygon?.length ?? 0) >= 4;
  const places = placeParts(plot ?? undefined);
  const focus = placeCenter(plot ?? undefined);
  const isMine = !!plot && plot.farmerId === session?.farmerId;

  return (
    <div className="px-5 pb-10 pt-6">
      <Link
        href="/plots"
        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand"
      >
        <ArrowLeft size={18} />
        แปลงนา
      </Link>

      {loading && <p className="mt-8 text-brand-dark/50">กำลังโหลด…</p>}
      {error && <p className="mt-8 text-danger">{error}</p>}

      {!loading && !error && plot && (
        <>
          <header className="mt-4">
            <p className="text-[12px] font-semibold tracking-[0.14em] text-brand/70 uppercase">
              รายละเอียดแปลง
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-bold leading-tight text-brand-dark">{plot.name}</h1>
              {!isMine && (
                <span className="rounded-md bg-accent/80 px-2 py-0.5 text-[11px] font-bold text-brand-dark">
                  ดูอย่างเดียว
                </span>
              )}
            </div>
            <p className="mt-1 text-[15px] text-brand-dark/55">
              {formatAreaRai(plot.areaRai)}
              {!isMine && owner ? ` · ${farmerDisplayName(owner)}` : ""}
            </p>
          </header>

          <section className="mt-5 overflow-hidden rounded-[24px] bg-white ring-1 ring-brand-dark/[0.05]">
            <div className="border-b border-brand-dark/[0.05] bg-card-tint/50 px-4 py-3 text-[13px] font-semibold text-brand-dark/70">
              แผนที่
            </div>
            <div className="h-[280px]">
              {hasBoundary || focus ? (
                <PlotMap
                  plots={hasBoundary ? [{ id: plot.id, name: plot.name, polygon: plot.polygon }] : []}
                  selectedId={plot.id}
                  focus={focus}
                  className="h-full"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MapPinned className="text-brand/50" size={32} />
                  <p className="mt-2 text-[14px] font-medium text-brand-dark/60">ยังไม่มีขอบเขตบนแผนที่</p>
                  <p className="mt-1 text-[12px] text-brand-dark/40">ให้โรงสีวาดรูปแปลงให้คุณ</p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-[24px] bg-white ring-1 ring-brand-dark/[0.05]">
            <Row label="พื้นที่" value={formatAreaRai(plot.areaRai)} />
            <Row label="ตำบล" value={places.subdistrict || "—"} />
            <Row label="อำเภอ" value={places.district || "—"} />
            <Row label="จังหวัด" value={places.province || "—"} />
            <Row label="ที่ตั้ง" value={placeLabel(plot)} last />
          </section>

          <section className="mt-4 rounded-[24px] bg-[linear-gradient(135deg,#e7f5ee,#f3fbf7)] px-5 py-4">
            <p className="text-[13px] font-semibold text-brand-dark/70">สถานะขอบเขต</p>
            <p className="mt-1 text-[15px] font-bold text-brand-dark">
              {hasBoundary ? `มีจุดขอบเขต ${plot.polygon.length} จุด` : "ยังไม่ได้วาดแนวเขต"}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 px-4 py-3.5 ${
        last ? "" : "border-b border-brand-dark/[0.05]"
      }`}
    >
      <span className="shrink-0 text-[13px] text-brand-dark/50">{label}</span>
      <span className="text-right text-[14px] font-semibold text-brand-dark">{value}</span>
    </div>
  );
}
