"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList, MapPinned } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  apiMessage,
  farmerDisplayName,
  formatAreaRai,
  formatThaiDate,
  getFarmer,
  getMyPlantingPlan,
  getPlot,
  type Farmer,
  type PlantingPlanItem,
  type PlantingPlanStatus,
  type Plot,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { placeCenter, placeParts } from "@/lib/thai-place";

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
  const [planItems, setPlanItems] = useState<PlantingPlanItem[]>([]);
  const [planStatuses, setPlanStatuses] = useState<PlantingPlanStatus[]>([]);
  const [planPending, setPlanPending] = useState(0);
  const [planError, setPlanError] = useState("");
  const [planLoading, setPlanLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    setOwner(null);
    setPlanLoading(true);
    setPlanError("");
    setPlanItems([]);
    setPlanStatuses([]);
    setPlanPending(0);

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

        try {
          const plan = await getMyPlantingPlan({
            plotId: next.id,
            farmerId:
              next.farmerId !== session?.farmerId ? next.farmerId : undefined,
          });
          // Only this plot — never mix in other plots' stages.
          const items = (plan.items ?? []).filter((item) => item.plotId === next.id);
          setPlanItems(items);
          setPlanStatuses(plan.statuses ?? []);
          const doneId = (plan.statuses ?? []).find((s) => s.code === "done")?.id;
          setPlanPending(
            doneId == null
              ? items.length
              : items.filter((item) => item.statusId !== doneId).length,
          );
        } catch (err) {
          setPlanError(apiMessage(err));
        } finally {
          setPlanLoading(false);
        }
      })
      .catch((err) => {
        setError(apiMessage(err));
        setPlanLoading(false);
      })
      .finally(() => setLoading(false));
  }, [id, session?.farmerId]);

  const hasBoundary = (plot?.polygon?.length ?? 0) >= 4;
  const places = placeParts(plot ?? undefined);
  const focus = placeCenter(plot ?? undefined);
  const isMine = !!plot && plot.farmerId === session?.farmerId;

  const statusById = useMemo(() => {
    const map = new Map<number, PlantingPlanStatus>();
    for (const status of planStatuses) map.set(status.id, status);
    return map;
  }, [planStatuses]);

  const doneStatusId = useMemo(
    () => planStatuses.find((status) => status.code === "done")?.id,
    [planStatuses],
  );

  // Keep cultivation stage order on the plot timeline (not calendar interleave).
  const timelineItems = useMemo(() => {
    const order = [
      "seed_receive",
      "plant_actual",
      "fertilizer_receive",
      "fertilizer_apply",
      "chemical",
      "harvest",
    ];
    return [...planItems].sort(
      (a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.date.localeCompare(b.date),
    );
  }, [planItems]);

  const varietyName = timelineItems[0]?.varietyName ?? "";
  const currentKey = useMemo(() => {
    if (doneStatusId == null) return null;
    return timelineItems.find((item) => item.statusId !== doneStatusId)?.key ?? null;
  }, [timelineItems, doneStatusId]);

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
          <header className="mt-4 home-fade">
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
            {!isMine && owner ? (
              <p className="mt-1 text-[15px] text-brand-dark/55">{farmerDisplayName(owner)}</p>
            ) : null}
          </header>

          {/* Daily: planting timeline first */}
          <section className="mt-5 home-rise">
            <div>
              <h2 className="text-[18px] font-bold text-brand-dark">แผนการเพาะปลูกของแปลงนี้</h2>
              <p className="mt-0.5 text-[13px] text-brand-dark/55">
                {planLoading
                  ? "กำลังโหลด…"
                  : timelineItems.length
                    ? [
                        varietyName || null,
                        planPending ? `${planPending} งานที่ยังต้องทำ` : "งานในแผนทำครบแล้ว",
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "เฉพาะรอบปลูกของแปลงนี้"}
              </p>
            </div>

            {planError && <p className="mt-4 text-[14px] text-danger">{planError}</p>}

            {!planLoading && !planError && timelineItems.length === 0 && (
              <div className="mt-3 rounded-[24px] bg-white px-5 py-7 text-center ring-1 ring-brand-dark/[0.05]">
                <ClipboardList className="mx-auto text-brand/45" size={28} />
                <p className="mt-2 text-[15px] font-bold text-brand-dark">ยังไม่มีแผนปลูกในแปลงนี้</p>
                <p className="mt-1 text-[13px] text-brand-dark/60">
                  เมื่อโรงสีเปิดรอบปลูก ไทม์ไลน์จะแสดงที่นี่
                </p>
              </div>
            )}

            {!planLoading && !planError && timelineItems.length > 0 && (
              <ol className="relative mt-4 rounded-[24px] bg-white px-4 py-5 ring-1 ring-brand-dark/[0.05]">
                {timelineItems.map((item, index) => {
                  const done = doneStatusId != null && item.statusId === doneStatusId;
                  const current = item.key === currentKey;
                  const isLast = index === timelineItems.length - 1;
                  const status = statusById.get(item.statusId);
                  return (
                    <li key={item.key} className="relative flex gap-3.5 pb-5 last:pb-0">
                      {!isLast && (
                        <span
                          aria-hidden
                          className={`absolute top-3.5 left-[11px] h-[calc(100%-2px)] w-px ${
                            done ? "bg-brand/35" : "bg-brand-dark/10"
                          }`}
                        />
                      )}
                      <span
                        aria-hidden
                        className={`relative z-[1] mt-1 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full ring-4 ring-white ${
                          done
                            ? "bg-brand"
                            : current
                              ? "bg-accent shadow-[0_0_0_1px_rgba(244,195,93,0.55)]"
                              : "bg-white shadow-[inset_0_0_0_2px_rgba(15,73,59,0.18)]"
                        }`}
                      >
                        {done ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        ) : current ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-dark" />
                        ) : null}
                      </span>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-[15px] font-bold leading-snug ${
                              done
                                ? "text-brand-dark/45"
                                : current
                                  ? "text-brand-dark"
                                  : "text-brand-dark/70"
                            }`}
                          >
                            {item.title}
                          </p>
                          {status?.name ? (
                            <span
                              className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                done
                                  ? "bg-brand/10 text-brand"
                                  : current
                                    ? "bg-accent/80 text-brand-dark"
                                    : "bg-brand-dark/[0.05] text-brand-dark/55"
                              }`}
                            >
                              {status.name}
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`mt-1 text-[13px] ${
                            done ? "text-brand-dark/35" : "text-brand-dark/55"
                          }`}
                        >
                          {formatThaiDate(item.date)}
                          <span className="text-brand-dark/30"> · </span>
                          {item.dateKind === "actual" ? "วันที่ทำจริง" : "วันที่ตามแผน"}
                        </p>
                        {item.note ? (
                          <p className="mt-1 text-[12px] text-brand-dark/45">{item.note}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="mt-5 overflow-hidden rounded-[24px] bg-white ring-1 ring-brand-dark/[0.05]">
            <div className="border-b border-brand-dark/[0.05] bg-card-tint/50 px-4 py-3 text-[13px] font-semibold text-brand-dark/70">
              ที่ตั้ง
            </div>
            <Row label="พื้นที่" value={formatAreaRai(plot.areaRai)} />
            <Row label="ตำบล" value={places.subdistrict || "—"} />
            <Row label="อำเภอ" value={places.district || "—"} />
            <Row label="จังหวัด" value={places.province || "—"} last />
          </section>

          {/* Occasional: map + boundary */}
          <section className="mt-4 overflow-hidden rounded-[24px] bg-white ring-1 ring-brand-dark/[0.05] home-rise" style={{ animationDelay: "80ms" }}>
            <div className="flex items-center justify-between gap-3 border-b border-brand-dark/[0.05] bg-card-tint/50 px-4 py-3">
              <p className="text-[13px] font-semibold text-brand-dark/70">แผนที่แปลง</p>
              <p className="text-[12px] font-medium text-brand-dark/45">
                {hasBoundary ? `ขอบเขต ${plot.polygon.length} จุด` : "ยังไม่ได้วาดแนวเขต"}
              </p>
            </div>
            <div className="h-[240px]">
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
