"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import {
  apiMessage,
  formatTelInput,
  getFarmer,
  getGroup,
  updateFarmer,
  type Farmer,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  districtOptions,
  placeLabel,
  provinceOptions,
  subdistrictOptions,
} from "@/lib/thai-place";

export default function ProfilePage() {
  const { session, setSession, logout } = useAuth();
  const router = useRouter();
  const [farmer, setFarmer] = useState<Farmer | null>(session?.farmer ?? null);
  const [groupName, setGroupName] = useState("—");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tel, setTel] = useState("");
  const [address, setAddress] = useState("");
  const [provinceId, setProvinceId] = useState(0);
  const [districtId, setDistrictId] = useState(0);
  const [subdistrictId, setSubdistrictId] = useState(0);

  const canEdit = session?.role === "member" || session?.role === "leader";

  useEffect(() => {
    if (!session) return;
    const farmerId = session.farmerId;
    const current = session;
    void (async () => {
      try {
        const next = await getFarmer(farmerId);
        setFarmer(next);
        if (
          current.farmer.avatarUrl !== next.avatarUrl ||
          current.tel !== next.tel ||
          current.displayName !== `${next.firstName} ${next.lastName}`.trim()
        ) {
          setSession({
            ...current,
            displayName: `${next.firstName} ${next.lastName}`.trim(),
            tel: next.tel,
            farmer: next,
          });
        }
        if (next.groupId) {
          const group = await getGroup(next.groupId);
          setGroupName(group.name);
        } else {
          setGroupName("ไม่มีกลุ่ม");
        }
      } catch (err) {
        setError(apiMessage(err));
      }
    })();
    // Intentionally only refetch when the logged-in farmer changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.farmerId]);

  function startEdit() {
    if (!farmer) return;
    setFirstName(farmer.firstName);
    setLastName(farmer.lastName);
    setTel(farmer.tel);
    setAddress(farmer.address);
    setProvinceId(farmer.provinceId);
    setDistrictId(farmer.districtId);
    setSubdistrictId(farmer.subdistrictId);
    setError("");
    setNotice("");
    setEditing(true);
  }

  const districts = useMemo(() => districtOptions(provinceId), [provinceId]);
  const subdistricts = useMemo(
    () => subdistrictOptions(provinceId, districtId),
    [provinceId, districtId],
  );

  return (
    <div className="px-5 pb-8 pt-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-brand-dark">ข้อมูลส่วนตัว</h1>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand shadow-sm"
            aria-label="แก้ไข"
          >
            <Pencil size={18} />
          </button>
        )}
        {editing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-dark/60 shadow-sm"
            aria-label="ยกเลิก"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {!editing ? (
        <>
          <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-card-tint ring-1 ring-brand/10">
                <Image
                  src={farmer?.avatarUrl || "/images/account-icon.png"}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  unoptimized={Boolean(farmer?.avatarUrl)}
                />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[18px] font-bold">{session?.displayName}</div>
                <div className="mt-1 text-[14px] text-brand-dark/65">{farmer?.tel ?? session?.tel}</div>
                <div className="mt-3 inline-flex rounded-full bg-card-tint px-3 py-1 text-[12px] font-semibold text-brand">
                  {session?.role === "leader" ? "หัวหน้ากลุ่ม" : "สมาชิก"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3 rounded-3xl bg-white p-5 shadow-sm text-[14px]">
            <Row label="ชื่อ" value={farmer?.firstName || "—"} />
            <Row label="นามสกุล" value={farmer?.lastName || "—"} />
            <Row label="เบอร์โทร" value={farmer?.tel || "—"} />
            <Row label="ที่อยู่" value={farmer?.address || "—"} />
            <Row label="ตำบล/อำเภอ/จังหวัด" value={farmer ? placeLabel(farmer) : "—"} />
            <Row label="กลุ่ม" value={groupName} />
            <Row label="ส่งเข้าโรงสีแล้ว" value={`${farmer?.deliveredKg ?? 0} กก.`} />
          </div>
          <p className="mt-3 text-[12px] text-brand-dark/45">
            แก้ได้: ชื่อ นามสกุล เบอร์ ที่อยู่ และที่ตั้ง · กลุ่ม/ยอดส่งแก้ไม่ได้จากแอปนี้
          </p>
        </>
      ) : (
        <form
          className="mt-5 space-y-3 rounded-3xl bg-white p-5 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session || !farmer) return;
            void (async () => {
              setBusy(true);
              setError("");
              setNotice("");
              try {
                const next = await updateFarmer(session.farmerId, {
                  firstName,
                  lastName,
                  tel,
                  address,
                  provinceId,
                  districtId,
                  subdistrictId,
                  groupId: farmer.groupId,
                });
                setFarmer(next);
                setSession({
                  ...session,
                  tel: next.tel,
                  displayName: `${next.firstName} ${next.lastName}`.trim(),
                  farmer: next,
                });
                setEditing(false);
                setNotice("บันทึกแล้ว");
              } catch (err) {
                setError(apiMessage(err));
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <Field label="ชื่อ" value={firstName} onChange={setFirstName} required />
          <Field label="นามสกุล" value={lastName} onChange={setLastName} required />
          <Field
            label="เบอร์โทร"
            value={tel}
            onChange={(value) => setTel(formatTelInput(value))}
            inputMode="tel"
            required
          />
          <Field label="ที่อยู่" value={address} onChange={setAddress} required />

          <label className="block text-[13px] font-bold text-brand-dark/70">
            จังหวัด
            <select
              className="mt-1 h-11 w-full rounded-xl border border-brand/15 bg-brand-light/40 px-3 text-[14px] font-normal"
              value={provinceId || ""}
              onChange={(event) => {
                setProvinceId(Number(event.target.value) || 0);
                setDistrictId(0);
                setSubdistrictId(0);
              }}
            >
              <option value="">เลือกจังหวัด</option>
              {provinceOptions().map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-bold text-brand-dark/70">
            อำเภอ
            <select
              className="mt-1 h-11 w-full rounded-xl border border-brand/15 bg-brand-light/40 px-3 text-[14px] font-normal disabled:opacity-50"
              value={districtId || ""}
              disabled={!provinceId}
              onChange={(event) => {
                setDistrictId(Number(event.target.value) || 0);
                setSubdistrictId(0);
              }}
            >
              <option value="">เลือกอำเภอ</option>
              {districts.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-bold text-brand-dark/70">
            ตำบล
            <select
              className="mt-1 h-11 w-full rounded-xl border border-brand/15 bg-brand-light/40 px-3 text-[14px] font-normal disabled:opacity-50"
              value={subdistrictId || ""}
              disabled={!districtId}
              onChange={(event) => setSubdistrictId(Number(event.target.value) || 0)}
            >
              <option value="">เลือกตำบล</option>
              {subdistricts.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl bg-brand-light px-3 py-3 text-[13px] text-brand-dark/60">
            กลุ่ม: <span className="font-semibold text-brand-dark">{groupName}</span> (แก้ไม่ได้)
          </div>

          {error && <p className="text-[13px] font-semibold text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-[15px] font-bold text-white disabled:bg-brand/40"
          >
            {busy ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </form>
      )}

      {notice && !editing && <p className="mt-3 text-center text-[13px] font-semibold text-brand">{notice}</p>}
      {error && !editing && <p className="mt-3 text-center text-[13px] font-semibold text-danger">{error}</p>}

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
      <span className="shrink-0 text-brand-dark/55">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block text-[13px] font-bold text-brand-dark/70">
      {label}
      {required && <span className="text-danger"> *</span>}
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-brand/15 bg-brand-light/40 px-3 text-[14px] font-normal text-brand-dark"
      />
    </label>
  );
}
