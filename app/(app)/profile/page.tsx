"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  LogOut,
  MapPinned,
  Pencil,
  Phone,
  Users,
  Weight,
  X,
} from "lucide-react";
import {
  apiMessage,
  formatTelInput,
  getFarmer,
  getGroup,
  updateFarmer,
  uploadFarmerAvatar,
  type Farmer,
} from "@/lib/api";
import { compressAvatar } from "@/lib/avatar";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [farmer, setFarmer] = useState<Farmer | null>(session?.farmer ?? null);
  const [groupName, setGroupName] = useState("—");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tel, setTel] = useState("");
  const [address, setAddress] = useState("");
  const [provinceId, setProvinceId] = useState(0);
  const [districtId, setDistrictId] = useState(0);
  const [subdistrictId, setSubdistrictId] = useState(0);

  const canEdit = session?.role === "member" || session?.role === "leader";
  const roleLabel = session?.role === "leader" ? "หัวหน้ากลุ่ม" : "สมาชิก";
  const displayName = session?.displayName?.trim() || "ผู้ใช้งาน";
  const avatarSrc = farmer?.avatarUrl || "/images/account-icon.png";

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

  async function onPickAvatar(file: File | undefined) {
    if (!session || !file) return;
    setAvatarBusy(true);
    setError("");
    setNotice("");
    try {
      const blob = await compressAvatar(file);
      const next = await uploadFarmerAvatar(session.farmerId, blob);
      setFarmer(next);
      setSession({
        ...session,
        farmer: next,
        displayName: `${next.firstName} ${next.lastName}`.trim(),
        tel: next.tel,
      });
      setNotice("อัปเดตรูปโปรไฟล์แล้ว");
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const districts = useMemo(() => districtOptions(provinceId), [provinceId]);
  const subdistricts = useMemo(
    () => subdistrictOptions(provinceId, districtId),
    [provinceId, districtId],
  );

  return (
    <div className="relative min-h-full pb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-[radial-gradient(120%_80%_at_10%_-10%,#1d8a6a_0%,#0f493b_50%,transparent_75%)]"
      />

      <header className="relative px-5 pt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.18em] text-white/70 uppercase">
              dona
            </p>
            <h1 className="mt-1 text-[24px] font-bold leading-tight text-white">
              ข้อมูลส่วนตัว
            </h1>
          </div>
          {canEdit && !editing && (
            <button
              type="button"
              onClick={startEdit}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              aria-label="แก้ไข"
            >
              <Pencil size={18} />
            </button>
          )}
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              aria-label="ยกเลิก"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      <section className="relative mt-5 px-5">
        <div className="rounded-[28px] border border-brand/[0.08] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(15,73,59,0.12)]">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="h-[84px] w-[84px] overflow-hidden rounded-full bg-card-tint ring-4 ring-card-tint">
                <Image
                  src={avatarSrc}
                  alt=""
                  width={84}
                  height={84}
                  className="h-full w-full object-cover"
                  unoptimized={Boolean(farmer?.avatarUrl)}
                />
              </div>
              {canEdit && (
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-0.5 -right-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-brand text-white shadow-md disabled:bg-brand/40"
                  aria-label="เปลี่ยนรูปโปรไฟล์"
                >
                  <Camera size={15} />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-brand">บัญชีของคุณ</p>
              <p className="mt-0.5 truncate text-[22px] font-bold leading-tight text-brand-dark">
                {displayName}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-xl bg-card-tint px-2.5 py-1 text-[12px] font-semibold text-brand">
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-dark/55">
                  <Phone size={13} />
                  {farmer?.tel ?? session?.tel ?? "—"}
                </span>
              </div>
              {canEdit && !editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="mt-3 inline-flex h-9 items-center rounded-xl bg-brand px-3.5 text-[13px] font-bold text-white"
                >
                  แก้ไขข้อมูล
                </button>
              )}
            </div>
          </div>
          {avatarBusy && (
            <p className="mt-3 text-[12px] font-semibold text-brand">กำลังอัปโหลดรูป…</p>
          )}
        </div>
      </section>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(event) => void onPickAvatar(event.target.files?.[0])}
      />

      {!editing ? (
        <>
          <section className="relative mt-4 px-5">
            <div className="overflow-hidden rounded-[24px] border border-brand/[0.08] bg-white shadow-[0_10px_24px_rgba(15,73,59,0.06)]">
              <InfoRow icon={Users} label="กลุ่ม" value={groupName} />
              <InfoRow
                icon={MapPinned}
                label="ที่อยู่"
                value={farmer?.address || "—"}
              />
              <InfoRow
                icon={MapPinned}
                label="ตำบล / อำเภอ / จังหวัด"
                value={farmer ? placeLabel(farmer) : "—"}
              />
              <InfoRow
                icon={Weight}
                label="ส่งเข้าโรงสีแล้ว"
                value={`${farmer?.deliveredKg ?? 0} กก.`}
                last
              />
            </div>
          </section>

          <section className="relative mt-4 px-5">
            <div className="overflow-hidden rounded-[24px] border border-brand/[0.08] bg-white shadow-[0_10px_24px_rgba(15,73,59,0.06)]">
              <DetailLine label="ชื่อ" value={farmer?.firstName || "—"} />
              <DetailLine label="นามสกุล" value={farmer?.lastName || "—"} />
              <DetailLine label="เบอร์โทร" value={farmer?.tel || "—"} last />
            </div>
            <p className="mt-3 px-1 text-[12px] leading-relaxed text-brand-dark/45">
              แก้ได้: รูปโปรไฟล์ ชื่อ นามสกุล เบอร์ ที่อยู่ และที่ตั้ง · กลุ่ม/ยอดส่งแก้ไม่ได้จากแอปนี้
            </p>
          </section>
        </>
      ) : (
        <section className="relative mt-4 px-5">
          <form
            className="space-y-3 rounded-[24px] border border-brand/[0.08] bg-white p-5 shadow-[0_10px_24px_rgba(15,73,59,0.06)]"
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
            <p className="text-[15px] font-bold text-brand-dark">แก้ไขข้อมูล</p>
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

            <SelectField
              label="จังหวัด"
              value={provinceId || ""}
              onChange={(value) => {
                setProvinceId(Number(value) || 0);
                setDistrictId(0);
                setSubdistrictId(0);
              }}
              options={provinceOptions()}
              placeholder="เลือกจังหวัด"
            />
            <SelectField
              label="อำเภอ"
              value={districtId || ""}
              disabled={!provinceId}
              onChange={(value) => {
                setDistrictId(Number(value) || 0);
                setSubdistrictId(0);
              }}
              options={districts}
              placeholder="เลือกอำเภอ"
            />
            <SelectField
              label="ตำบล"
              value={subdistrictId || ""}
              disabled={!districtId}
              onChange={(value) => setSubdistrictId(Number(value) || 0)}
              options={subdistricts}
              placeholder="เลือกตำบล"
            />

            <div className="rounded-2xl bg-brand-light px-3.5 py-3 text-[13px] text-brand-dark/60">
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
        </section>
      )}

      {(notice || (error && !editing)) && (
        <p
          className={`relative mt-3 px-5 text-center text-[13px] font-semibold ${
            notice ? "text-brand" : "text-danger"
          }`}
        >
          {notice || error}
        </p>
      )}

      <section className="relative mt-6 px-5">
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E0B0B0] bg-[#FFF6F6] text-[15px] font-bold text-[#C34E4E] transition active:scale-[0.99]"
        >
          <LogOut size={18} />
          ออกจากระบบ
        </button>
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${
        last ? "" : "border-b border-brand-dark/[0.06]"
      }`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card-tint text-brand">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium text-brand-dark/50">{label}</span>
        <span className="mt-0.5 block text-[14px] font-semibold leading-snug text-brand-dark">
          {value}
        </span>
      </span>
    </div>
  );
}

function DetailLine({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 px-4 py-3.5 ${
        last ? "" : "border-b border-brand-dark/[0.06]"
      }`}
    >
      <span className="shrink-0 text-[13px] text-brand-dark/55">{label}</span>
      <span className="text-right text-[14px] font-semibold text-brand-dark">{value}</span>
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
        className="mt-1 h-11 w-full rounded-xl border border-brand/15 bg-brand-light/40 px-3 text-[14px] font-normal text-brand-dark outline-none focus:border-brand/35"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-[13px] font-bold text-brand-dark/70">
      {label}
      <select
        className="mt-1 h-11 w-full rounded-xl border border-brand/15 bg-brand-light/40 px-3 text-[14px] font-normal outline-none focus:border-brand/35 disabled:opacity-50"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
