"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ChangePasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "/dashboard";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        router.push(`/login?next=${encodeURIComponent("/change-password")}`);
        return;
      }

      // ถ้าไม่ต้องบังคับแล้ว ก็กลับได้
      if (data?.user?.mustChangePassword === false) router.push(nextUrl);
    })();
  }, [router, nextUrl]);

  async function onSubmit() {
    setMsg("");

    if (newPassword.length < 6) return setMsg("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร");
    if (newPassword !== confirm) return setMsg("รหัสผ่านไม่ตรงกัน");

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !data?.ok) return setMsg("เปลี่ยนรหัสผ่านไม่สำเร็จ");

    router.push(nextUrl);
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-2xl font-semibold">เปลี่ยนรหัสผ่านครั้งแรก</h1>
        <p className="text-white/60 mt-1">เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านใหม่</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-white/70">รหัสผ่านใหม่</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-white/70">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-white text-black font-semibold py-2 disabled:opacity-60"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>

          {msg ? (
            <div className="rounded-xl p-3 text-sm border bg-red-500/10 border-red-500/30 text-red-200">
              {msg}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          กำลังโหลด...
        </div>
      }
    >
      <ChangePasswordInner />
    </Suspense>
  );
}