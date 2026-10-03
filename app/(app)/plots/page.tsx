"use client";

import { useEffect, useState } from "react";
import { MapPinned } from "lucide-react";
import { apiMessage, listMyPlots, type Plot } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function PlotsPage() {
  const { session } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    void listMyPlots(session.farmerId)
      .then(setPlots)
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <div className="px-5 pb-8 pt-8">
      <h1 className="text-[22px] font-bold text-brand-dark">แปลงนา</h1>
      <p className="mt-1 text-[14px] text-brand-dark/60">แปลงของคุณที่ลงทะเบียนกับโรงสี</p>

      {loading && <p className="mt-8 text-brand-dark/50">กำลังโหลด…</p>}
      {error && <p className="mt-8 text-danger">{error}</p>}

      {!loading && !error && plots.length === 0 && (
        <div className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm">
          <MapPinned className="mx-auto text-brand" size={36} />
          <p className="mt-3 font-bold">ยังไม่มีแปลง</p>
          <p className="mt-1 text-[13px] text-brand-dark/60">ให้โรงสีช่วยเพิ่มแปลงให้คุณ</p>
        </div>
      )}

      <ul className="mt-5 space-y-3">
        {plots.map((plot) => (
          <li key={plot.id} className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="font-bold">{plot.name}</div>
            <div className="mt-1 text-[14px] text-brand-dark/65">{plot.areaRai} ไร่</div>
            <div className="mt-2 text-[12px] text-brand-dark/45">
              {plot.polygon?.length >= 4 ? "มีขอบเขตบนแผนที่แล้ว" : "ยังไม่มีรูปแปลง"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
