"use client";

import Link from "next/link";
import { ChevronRight, MapPinned, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  apiMessage,
  formatAreaRai,
  getMyPlots,
  type PlotCard,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PlotThumb } from "@/components/plot-thumb";
import { placeLabel } from "@/lib/thai-place";

type ScopeTab = "mine" | "group";

export default function PlotsPage() {
  const { session } = useAuth();
  const [plots, setPlots] = useState<PlotCard[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<ScopeTab>("mine");

  const isLeader = session?.role === "leader";
  const groupId = session?.farmer?.groupId ?? null;
  const leaderExtras = isLeader && !!groupId;
  const canRegisterPlot = scope === "mine";

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError("");

    const nextScope: ScopeTab = leaderExtras && scope === "group" ? "group" : "mine";
    void getMyPlots(nextScope)
      .then(setPlots)
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoading(false));
  }, [session, scope, leaderExtras]);

  useEffect(() => {
    if (!leaderExtras && scope !== "mine") setScope("mine");
  }, [leaderExtras, scope]);

  const showOwner = leaderExtras && scope === "group";

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-brand-dark">แปลงนา</h1>
          <p className="mt-1 text-[14px] text-brand-dark/55">
            {loading
              ? "กำลังโหลด…"
              : leaderExtras
                ? scope === "group"
                  ? `${plots.length} แปลงในกลุ่ม · ดูอย่างเดียว`
                  : `${plots.length} แปลงของฉัน`
                : "แปลงของคุณที่ลงทะเบียนกับโรงสี"}
          </p>
        </div>
        {canRegisterPlot && (
          <Link
            href="/plots/register"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-brand px-3.5 text-[13px] font-bold text-white shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            ลงทะเบียน
          </Link>
        )}
      </div>

      {leaderExtras && (
        <div className="mt-4 flex rounded-2xl bg-white p-1 ring-1 ring-brand-dark/[0.06]">
          <button
            type="button"
            onClick={() => setScope("mine")}
            className={`flex-1 rounded-xl py-2 text-[13px] font-semibold ${
              scope === "mine" ? "bg-brand-dark text-white" : "text-brand-dark/60"
            }`}
          >
            ของฉัน
          </button>
          <button
            type="button"
            onClick={() => setScope("group")}
            className={`flex-1 rounded-xl py-2 text-[13px] font-semibold ${
              scope === "group" ? "bg-brand-dark text-white" : "text-brand-dark/60"
            }`}
          >
            ในกลุ่ม
          </button>
        </div>
      )}

      {error && <p className="mt-8 text-danger">{error}</p>}

      {!loading && !error && plots.length === 0 && (
        <div className="mt-10 rounded-[24px] bg-white px-6 py-10 text-center ring-1 ring-brand-dark/[0.05]">
          <MapPinned className="mx-auto text-brand" size={36} />
          <p className="mt-3 font-bold">{scope === "group" ? "ยังไม่มีแปลงในกลุ่ม" : "ยังไม่มีแปลง"}</p>
          <p className="mt-1 text-[13px] text-brand-dark/55">
            {scope === "group"
              ? "เมื่อสมาชิกมีแปลง จะเห็นที่นี่"
              : "ลงทะเบียนแปลงนาของคุณเพื่อเริ่มใช้งาน"}
          </p>
          {canRegisterPlot && (
            <Link
              href="/plots/register"
              className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-2xl bg-brand px-5 text-[14px] font-bold text-white"
            >
              <Plus size={16} strokeWidth={2.5} />
              ลงทะเบียนแปลง
            </Link>
          )}
        </div>
      )}

      <ul className="mt-5 space-y-3">
        {plots.map((plot) => {
          const mine = plot.farmerId === session?.farmerId;
          return (
            <li key={plot.id}>
              <Link
                href={`/plots/${plot.id}`}
                className="flex items-center gap-3 rounded-[22px] bg-white px-4 py-4 ring-1 ring-brand-dark/[0.05] transition hover:bg-card-tint/40 active:scale-[0.99]"
              >
                <PlotThumb plot={plot} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[16px] font-bold text-brand-dark">{plot.name}</span>
                    {showOwner && !mine && (
                      <span className="shrink-0 rounded-md bg-accent/80 px-1.5 py-0.5 text-[10px] font-bold text-brand-dark">
                        ลูกทีม
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-brand-dark/60">
                    {formatAreaRai(plot.areaRai)} ·{" "}
                    {plot.previewUrl ? "มีรูปแปลง" : plot.hasBoundary ? "มีขอบเขต" : "ยังไม่มีรูปแปลง"}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-brand-dark/40">
                    {showOwner && plot.ownerName ? `${plot.ownerName} · ` : ""}
                    {placeLabel(plot)}
                  </span>
                </span>
                <ChevronRight size={20} className="shrink-0 text-brand/40" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
