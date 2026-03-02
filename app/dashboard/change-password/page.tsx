"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

type Toast = { type: "success" | "error"; text: string } | null;

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

export default function ChangePasswordPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  // ✅ show/hide states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      const data = await me.json().catch(() => null);

      if (!me.ok || !data?.ok) {
        router.push("/login?next=/dashboard/change-password");
        return;
      }
      setLoading(false);
    })();
  }, [router]);

  async function onSave() {
    if (!currentPassword || !newPassword) return showToast("error", "กรุณากรอกให้ครบ");
    if (newPassword.length < 4) return showToast("error", "รหัสผ่านใหม่สั้นเกินไป");
    if (newPassword !== confirm) return showToast("error", "รหัสผ่านใหม่ไม่ตรงกัน");

    setSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !data?.ok) {
      const err = data?.error || "unknown";
      if (err === "invalid_current_password") return showToast("error", "รหัสผ่านเดิมไม่ถูกต้อง");
      if (err === "same_password") return showToast("error", "รหัสผ่านใหม่ต้องไม่ซ้ำกับเดิม");
      if (err === "unauthorized") return showToast("error", "กรุณาเข้าสู่ระบบใหม่");
      return showToast("error", "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    }

    showToast("success", "เปลี่ยนรหัสผ่านสำเร็จ ✅");
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");

    setTimeout(() => router.push("/dashboard"), 700);
  }

  // ✅ Shared styles
  const inputCls =
    "w-full rounded-2xl border border-sky-200 bg-white px-4 py-2.5 pr-12 outline-none transition " +
    "placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200";

  const iconBtnCls =
    "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 " +
    "rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-sky-200";

  // ✅ Loading แบบเข้าธีม Panel
  if (loading) {
    return (
      <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6 max-w-lg">
        <div className="text-lg font-semibold">กำลังโหลด...</div>
        <div className="text-sm text-slate-500 mt-1">กำลังตรวจสอบผู้ใช้งาน</div>
        <div className="mt-4 h-2 rounded-full bg-sky-100 overflow-hidden">
          <div className="h-full w-1/2 bg-sky-400 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">เปลี่ยนรหัสผ่าน</h1>
            <p className="text-sm text-slate-500 mt-1">เพื่อความปลอดภัยของบัญชีผู้ใช้งาน</p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="h-10 px-4 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition font-medium"
          >
            กลับ
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          {/* ✅ current password */}
          <div>
            <label className="text-sm font-medium text-slate-700">รหัสผ่านเดิม</label>
            <div className="relative mt-1">
              <input
                type={showCurrent ? "text" : "password"}
                className={inputCls}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className={iconBtnCls}
                aria-label={showCurrent ? "ซ่อนรหัสผ่านเดิม" : "แสดงรหัสผ่านเดิม"}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* ✅ new password */}
          <div>
            <label className="text-sm font-medium text-slate-700">รหัสผ่านใหม่</label>
            <div className="relative mt-1">
              <input
                type={showNew ? "text" : "password"}
                className={inputCls}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 4 ตัว"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className={iconBtnCls}
                aria-label={showNew ? "ซ่อนรหัสผ่านใหม่" : "แสดงรหัสผ่านใหม่"}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* ✅ confirm */}
          <div>
            <label className="text-sm font-medium text-slate-700">ยืนยันรหัสผ่านใหม่</label>
            <div className="relative mt-1">
              <input
                type={showConfirm ? "text" : "password"}
                className={inputCls}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="พิมพ์ซ้ำอีกครั้ง"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className={iconBtnCls}
                aria-label={showConfirm ? "ซ่อนยืนยันรหัสผ่าน" : "แสดงยืนยันรหัสผ่าน"}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* ✅ hint when mismatch */}
            {confirm && newPassword && confirm !== newPassword ? (
              <div className="mt-2 text-xs text-red-600">รหัสผ่านใหม่ไม่ตรงกัน</div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="h-11 px-6 rounded-2xl font-semibold transition
                         bg-gradient-to-r from-sky-500 to-blue-500 text-white
                         shadow-md shadow-sky-200/70 hover:shadow-lg
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>

          {toast ? (
            <div
              className={cx(
                "rounded-2xl p-3 text-sm border",
                toast.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-700",
                toast.type === "error" && "bg-red-50 border-red-200 text-red-700"
              )}
            >
              {toast.text}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}