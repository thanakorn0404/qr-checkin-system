"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onLogin() {
    setStatus("loading");
    setMsg("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setStatus("error");
      setMsg("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    const role = data.user?.role;
    if (role === "admin" || role === "organizer") router.push("/organizer/dashboard");
    else router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-sky-100 text-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
        {/* header */}
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 shadow-md shadow-sky-200/60" />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">เข้าสู่ระบบ</h1>
            <p className="text-slate-500 mt-1">สำหรับผู้จัดกิจกรรม / ผู้ดูแล</p>
          </div>
        </div>

        {/* form */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600">ชื่อผู้ใช้งาน</label>
            <input
              className="mt-1 w-full rounded-2xl bg-white border border-sky-200 px-4 py-2.5 outline-none transition
                         placeholder:text-slate-400
                         focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="เช่น admin"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">รหัสผ่าน</label>

            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-2xl bg-white border border-sky-200 px-4 py-2.5 pr-11 outline-none transition
                           placeholder:text-slate-400
                           focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            onClick={onLogin}
            disabled={status === "loading"}
            className="w-full rounded-2xl font-semibold py-2.5 transition
                       bg-gradient-to-r from-sky-500 to-blue-500 text-white
                       hover:from-sky-600 hover:to-blue-600
                       shadow-md shadow-sky-200/70 hover:shadow-lg
                       active:scale-[0.99]
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>

          {msg ? (
            <div className="rounded-2xl p-3 text-sm border bg-red-50 border-red-200 text-red-700">
              {msg}
            </div>
          ) : null}

          <div className="pt-2 text-xs text-slate-500">
            เคล็ดลับ: ถ้าเข้าระบบไม่ได้ ให้ลองตรวจสอบชื่อผู้ใช้/รหัสผ่านอีกครั้ง
          </div>
        </div>
      </div>
    </div>
  );
}