"use client";

import { ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  apiMessage,
  getMyPlantingPlan,
  type PlantingPlanItem,
  type PlantingPlanStatus,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] as const;

function dateParts(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { weekday: "—", day: "—", month: "" };
  }
  return {
    weekday: THAI_WEEKDAYS[date.getDay()] ?? "—",
    day: String(date.getDate()),
    month: date.toLocaleDateString("th-TH", { month: "short" }),
  };
}

export default function PlanPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<PlantingPlanItem[]>([]);
  const [statuses, setStatuses] = useState<PlantingPlanStatus[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError("");
    void getMyPlantingPlan()
      .then((plan) => {
        setItems(plan.items ?? []);
        setStatuses(plan.statuses ?? []);
        setPendingCount(plan.pendingCount ?? 0);
      })
      .catch((err) => {
        setError(apiMessage(err));
        setItems([]);
        setStatuses([]);
        setPendingCount(0);
      })
      .finally(() => setLoading(false));
  }, [session]);

  const statusById = useMemo(() => {
    const map = new Map<number, PlantingPlanStatus>();
    for (const status of statuses) map.set(status.id, status);
    return map;
  }, [statuses]);

  const doneStatusId = useMemo(
    () => statuses.find((status) => status.code === "done")?.id,
    [statuses],
  );

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-8">
      <div>
        <h1 className="text-[22px] font-bold text-brand-dark">แผนการเพาะปลูก</h1>
        <p className="mt-1 text-[14px] text-brand-dark/55">
          {loading
            ? "กำลังโหลด…"
            : items.length
              ? pendingCount
                ? `${pendingCount} งานที่ยังต้องทำ`
                : "งานในแผนทำครบแล้ว"
              : "งานในแผนเรียงตามเวลา"}
        </p>
      </div>

      {error && <p className="mt-6 text-danger">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="mt-8 rounded-[24px] bg-white px-5 py-8 text-center ring-1 ring-brand-dark/[0.05]">
          <ClipboardList className="mx-auto text-brand/45" size={32} />
          <p className="mt-3 text-[15px] font-bold text-brand-dark">ยังไม่มีแผนปลูก</p>
          <p className="mt-1 text-[13px] text-brand-dark/60">
            เมื่อโรงสีเปิดรอบปลูก งานในแผนจะแสดงที่นี่
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const status = statusById.get(item.statusId);
            const done = doneStatusId != null && item.statusId === doneStatusId;
            const { weekday, day, month } = dateParts(item.date);
            return (
              <li
                key={item.key}
                className={`flex items-stretch gap-3 rounded-[22px] bg-white p-3.5 ring-1 ${
                  done ? "ring-brand-dark/[0.04] opacity-80" : "ring-brand-dark/[0.06]"
                }`}
              >
                <div
                  className={`flex w-[56px] shrink-0 flex-col items-center justify-center rounded-[16px] px-1 py-2 ${
                    done ? "bg-brand-dark/[0.04]" : "bg-card-tint"
                  }`}
                >
                  <span
                    className={`text-[12px] font-bold ${
                      done ? "text-brand-dark/40" : "text-brand"
                    }`}
                  >
                    {weekday}
                  </span>
                  <span
                    className={`text-[22px] font-bold leading-none tracking-tight ${
                      done ? "text-brand-dark/35" : "text-brand-dark"
                    }`}
                  >
                    {day}
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium text-brand-dark/40">
                    {month}
                  </span>
                </div>

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-[16px] font-bold leading-snug ${
                        done ? "text-brand-dark/45" : "text-brand-dark"
                      }`}
                    >
                      {item.title}
                    </p>
                    {status?.name ? (
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          done
                            ? "bg-brand/10 text-brand"
                            : "bg-accent/70 text-brand-dark"
                        }`}
                      >
                        {status.name}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-[13px] text-brand-dark/55">
                    {item.plotName}
                    {item.varietyName ? ` · ${item.varietyName}` : ""}
                  </p>
                  {item.dateKind === "planned" ? (
                    <p className="mt-1 text-[12px] text-brand-dark/40">วันประมาณการ</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
