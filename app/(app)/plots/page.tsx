"use client";

import Link from "next/link";
import { ChevronRight, MapPinned } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  apiMessage,
  farmerDisplayName,
  formatAreaRai,
  listGroupFarmers,
  listGroupPlots,
  listMyPlots,
  type Farmer,
  type Plot,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PlotThumb } from "@/components/plot-thumb";
import { placeLabel } from "@/lib/thai-place";

type ScopeTab = "mine" | "group";

export default function PlotsPage() {
  const { session } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<ScopeTab>("mine");

  const isLeader = session?.role === "leader";
  const groupId = session?.farmer?.groupId ?? null;
  const leaderExtras = isLeader && !!groupId;

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError("");

    const load =
      leaderExtras && scope === "group" && groupId
        ? Promise.all([listGroupPlots(groupId), listGroupFarmers(groupId)]).then(([nextPlots, nextFarmers]) => {
            setPlots(nextPlots);
            setFarmers(nextFarmers);
          })
        : listMyPlots(session.farmerId).then((nextPlots) => {
            setPlots(nextPlots);
            setFarmers([]);
          });

    void load.catch((err) => setError(apiMessage(err))).finally(() => setLoading(false));
  }, [session, scope, leaderExtras, groupId]);

  useEffect(() => {
    if (!leaderExtras && scope !== "mine") setScope("mine");
  }, [leaderExtras, scope]);

  const farmerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const farmer of farmers) {
      map.set(farmer.id, farmerDisplayName(farmer));
    }
    return map;
  }, [farmers]);

  const showOwner = leaderExtras && scope === "group";

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-8">
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
            {scope === "group" ? "เมื่อสมาชิกมีแปลง จะเห็นที่นี่" : "ให้โรงสีช่วยเพิ่มแปลงให้คุณ"}
          </p>
        </div>
      )}

      <ul className="mt-5 space-y-3">
        {plots.map((plot) => {
          const hasBoundary = (plot.polygon?.length ?? 0) >= 4;
          const owner = farmerNameById.get(plot.farmerId);
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
                    {plot.previewUrl ? "มีรูปแปลง" : hasBoundary ? "มีขอบเขต" : "ยังไม่มีรูปแปลง"}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-brand-dark/40">
                    {showOwner && owner ? `${owner} · ` : ""}
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
