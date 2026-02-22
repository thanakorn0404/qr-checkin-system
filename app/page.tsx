"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [nextPath, setNextPath] = useState("/dashboard"); // default
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ อ่าน ?next=... แบบไม่ใช้ useSearchParams กัน error
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const n = url.searchParams.get("next");
      if (n && n.startsWith("/")) setNextPath(n);
    } catch {}
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    // ✅ redirect ตาม role
    const role = data.user?.role;
    if (role === "admin" || role === "organizer") {
      router.replace("/organizer/dashboard");
    } else {
      router.replace(nextPath);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <form
        onSubmit={onLogin}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center">เข้าสู่ระบบ</h1>

        <div>
          <label className="text-sm text-white/70">Username</label>
          <input
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="กิ้วๆ"
            autoComplete="username"
          />
        </div>

        <div>
          <label className="text-sm text-white/70">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="กิ้วๆ"
            autoComplete="current-password"
          />
        </div>

        {error ? (
          <div className="rounded-xl p-3 text-sm border bg-red-500/10 border-red-500/30 text-red-200">
            {error}
          </div>
        ) : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-white text-black font-semibold py-2 disabled:opacity-60"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>

        <div className="text-xs text-white/50">
          Demo users: admin / organizer / student
        </div>
      </form>
    </div>
  );
}
