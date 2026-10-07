"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { apiMessage, formatTelInput, loginByPhone } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const { session, ready, setSession } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [tel, setTel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace(search.get("next") || "/home");
  }, [ready, session, router, search]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg items-center justify-center bg-brand-light px-6 py-10">
      <div className="w-full">
        <div className="flex flex-col items-center">
          <Image
            src="/dona-logo.png"
            alt="dona"
            width={180}
            height={60}
            className="h-14 w-auto object-contain"
            priority
          />
          <h1 className="mt-6 text-center text-[28px] font-bold text-brand-dark">ยินดีต้อนรับ</h1>
          <p className="mt-2 text-center text-[16px] text-brand-dark/70">ใส่เบอร์โทรเพื่อเข้าใช้งาน</p>
        </div>

        <form
          className="mt-10"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              setBusy(true);
              setError("");
              try {
                const next = await loginByPhone(tel);
                setSession(next);
                router.replace(search.get("next") || "/home");
              } catch (err) {
                setError(apiMessage(err));
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <label className="block">
            <span className="sr-only">เบอร์โทรศัพท์</span>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-brand/15 bg-white px-4 shadow-sm">
              <Phone size={20} className="text-brand/70" />
              <input
                autoFocus
                inputMode="tel"
                autoComplete="tel"
                placeholder="0XX-XXX-XXXX"
                value={tel}
                onChange={(event) => setTel(formatTelInput(event.target.value))}
                className="h-full w-full bg-transparent text-[16px] text-brand-dark placeholder:text-brand-dark/35"
              />
            </div>
          </label>

          {error && <p className="mt-4 text-center text-[14px] font-semibold text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy || tel.replace(/\D/g, "").length < 10}
            className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-[16px] font-bold text-white shadow disabled:bg-brand/35"
          >
            {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-8 text-center text-[14px] text-brand-dark/60">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-bold text-brand underline-offset-2 hover:underline">
            ลงทะเบียน
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-full items-center justify-center bg-brand-light">กำลังโหลด…</div>}>
      <LoginForm />
    </Suspense>
  );
}
