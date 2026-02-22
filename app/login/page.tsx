"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

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

    // login สำเร็จ → ไปหน้าสร้างกิจกรรม
    const role = data.user?.role;

    if (role === "admin" || role === "organizer") router.push("/organizer/dashboard");
    else router.push("/dashboard");

  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
        <p className="text-white/60 mt-1">สำหรับผู้จัดกิจกรรม / ผู้ดูแล</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-white/70">ชื่อผู้ใช้งาน</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="เช่น admin"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">รหัสผ่าน</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={onLogin}
            disabled={status === "loading"}
            className="w-full rounded-xl bg-white text-black font-semibold py-2 disabled:opacity-60"
          >
            {status === "loading" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
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
