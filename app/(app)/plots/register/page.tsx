"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { apiMessage, createPlot } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  districtOptions,
  provinceOptions,
  subdistrictOptions,
} from "@/lib/thai-place";

export default function RegisterPlotPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [areaRai, setAreaRai] = useState("");
  const [provinceId, setProvinceId] = useState(0);
  const [districtId, setDistrictId] = useState(0);
  const [subdistrictId, setSubdistrictId] = useState(0);
  const [placeReady, setPlaceReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (placeReady || !session?.farmer) return;
    setProvinceId(session.farmer.provinceId || 0);
    setDistrictId(session.farmer.districtId || 0);
    setSubdistrictId(session.farmer.subdistrictId || 0);
    setPlaceReady(true);
  }, [session, placeReady]);

  const districts = useMemo(() => districtOptions(provinceId), [provinceId]);
  const subdistricts = useMemo(
    () => subdistrictOptions(provinceId, districtId),
    [provinceId, districtId],
  );

  const area = Number(areaRai);
  const canSubmit =
    Boolean(session?.farmerId) &&
    name.trim() &&
    Number.isFinite(area) &&
    area > 0 &&
    provinceId > 0 &&
    districtId > 0 &&
    subdistrictId > 0;

  return (
    <div className="flex min-h-full flex-col px-5 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <Link
          href="/plots"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-brand-dark ring-1 ring-brand-dark/[0.06]"
          aria-label="กลับ"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold text-brand-dark">ลงทะเบียนแปลง</h1>
          <p className="mt-0.5 text-[13px] text-brand-dark/55">กรอกข้อมูลแปลงนาของคุณ</p>
        </div>
      </div>

      <form
        className="mt-6 space-y-3 rounded-[24px] bg-white p-5 ring-1 ring-brand-dark/[0.05]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!session || !canSubmit || busy) return;
          void (async () => {
            setBusy(true);
            setError("");
            try {
              const plot = await createPlot({
                farmerId: session.farmerId,
                name: name.trim(),
                areaRai: area,
                provinceId,
                districtId,
                subdistrictId,
              });
              router.replace(`/plots/${plot.id}`);
            } catch (err) {
              setError(apiMessage(err));
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <Field label="ชื่อแปลง" value={name} onChange={setName} required placeholder="เช่น นาหลังบ้าน" />
        <Field
          label="พื้นที่ (ไร่)"
          value={areaRai}
          onChange={setAreaRai}
          inputMode="decimal"
          required
          placeholder="เช่น 5.5"
        />

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

        <p className="rounded-2xl bg-brand-light px-3.5 py-3 text-[13px] leading-relaxed text-brand-dark/55">
          วาดขอบเขตแปลงได้ทีหลังจากหน้ารายละเอียดแปลง
        </p>

        {error && <p className="text-[13px] font-semibold text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy || !canSubmit}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-[15px] font-bold text-white disabled:bg-brand/40"
        >
          {busy ? "กำลังบันทึก…" : "ลงทะเบียนแปลง"}
        </button>
      </form>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) {
  return (
    <label className="block text-[13px] font-bold text-brand-dark/70">
      {label}
      {required && <span className="text-danger"> *</span>}
      <input
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
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
