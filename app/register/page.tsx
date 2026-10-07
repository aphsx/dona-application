"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiMessage, formatTelInput, registerFarmer } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  districtOptions,
  provinceOptions,
  subdistrictOptions,
} from "@/lib/thai-place";

export default function RegisterPage() {
  const { session, ready, setSession } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tel, setTel] = useState("");
  const [address, setAddress] = useState("");
  const [provinceId, setProvinceId] = useState(0);
  const [districtId, setDistrictId] = useState(0);
  const [subdistrictId, setSubdistrictId] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace("/home");
  }, [ready, session, router]);

  const districts = useMemo(() => districtOptions(provinceId), [provinceId]);
  const subdistricts = useMemo(
    () => subdistrictOptions(provinceId, districtId),
    [provinceId, districtId],
  );

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    tel.replace(/\D/g, "").length >= 10 &&
    address.trim() &&
    provinceId > 0 &&
    districtId > 0 &&
    subdistrictId > 0;

  return (
    <div className="mx-auto min-h-full w-full max-w-lg bg-brand-light px-6 py-10">
      <div className="flex flex-col items-center">
        <Image
          src="/dona-logo.png"
          alt="dona"
          width={160}
          height={54}
          className="h-12 w-auto object-contain"
          priority
        />
        <h1 className="mt-5 text-center text-[26px] font-bold text-brand-dark">
          ลงทะเบียนเกษตรกร
        </h1>
        <p className="mt-2 text-center text-[15px] text-brand-dark/70">
          กรอกข้อมูลเพื่อเริ่มใช้งานด้วยตัวเอง
        </p>
      </div>

      <form
        className="mt-8 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit || busy) return;
          void (async () => {
            setBusy(true);
            setError("");
            try {
              const next = await registerFarmer({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                tel,
                address: address.trim(),
                provinceId,
                districtId,
                subdistrictId,
              });
              setSession(next);
              router.replace("/home");
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
          placeholder="0XX-XXX-XXXX"
          autoComplete="tel"
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
          required
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
          required
        />
        <SelectField
          label="ตำบล"
          value={subdistrictId || ""}
          disabled={!districtId}
          onChange={(value) => setSubdistrictId(Number(value) || 0)}
          options={subdistricts}
          placeholder="เลือกตำบล"
          required
        />

        <p className="rounded-2xl bg-white/70 px-3.5 py-3 text-[13px] leading-relaxed text-brand-dark/55">
          หลังลงทะเบียนจะเข้าใช้งานได้ทันที · โรงสีสามารถจัดกลุ่มให้ทีหลัง
        </p>

        {error && <p className="text-center text-[14px] font-semibold text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy || !canSubmit}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-[16px] font-bold text-white shadow disabled:bg-brand/35"
        >
          {busy ? "กำลังลงทะเบียน…" : "ลงทะเบียน"}
        </button>
      </form>

      <p className="mt-8 text-center text-[14px] text-brand-dark/60">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="font-bold text-brand underline-offset-2 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  inputMode,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-[13px] font-bold text-brand-dark/70">
      {label}
      {required && <span className="text-danger"> *</span>}
      <input
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-12 w-full rounded-2xl border border-brand/15 bg-white px-4 text-[15px] font-normal text-brand-dark outline-none focus:border-brand/35"
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
  required,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block text-[13px] font-bold text-brand-dark/70">
      {label}
      {required && <span className="text-danger"> *</span>}
      <select
        className="mt-1 h-12 w-full rounded-2xl border border-brand/15 bg-white px-4 text-[15px] font-normal outline-none focus:border-brand/35 disabled:opacity-50"
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
