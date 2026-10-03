"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const { session, logout } = useAuth();
  const router = useRouter();
  const farmer = session?.farmer;

  return (
    <div className="px-5 pb-8 pt-8">
      <h1 className="text-[22px] font-bold text-brand-dark">ข้อมูลส่วนตัว</h1>

      <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
        <div className="text-[18px] font-bold">{session?.displayName}</div>
        <div className="mt-1 text-[14px] text-brand-dark/65">{session?.tel}</div>
        <div className="mt-3 inline-flex rounded-full bg-card-tint px-3 py-1 text-[12px] font-semibold text-brand">
          {session?.role === "leader" ? "หัวหน้ากลุ่ม" : "สมาชิก"}
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-3xl bg-white p-5 shadow-sm text-[14px]">
        <Row label="ที่อยู่" value={farmer?.address || "—"} />
        <Row label="ส่งเข้าโรงสีแล้ว" value={`${farmer?.deliveredKg ?? 0} กก.`} />
      </div>

      <button
        type="button"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
        className="mt-8 flex h-12 w-full items-center justify-center rounded-2xl border border-danger/30 bg-white font-bold text-danger"
      >
        ออกจากระบบ
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand-light pb-3 last:border-b-0 last:pb-0">
      <span className="text-brand-dark/55">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
