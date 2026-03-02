"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [nextPath, setNextPath] = useState("/dashboard"); // default
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const inputCls =
    "w-full rounded-2xl border border-sky-200 bg-white px-4 py-2.5 pl-11 pr-12 outline-none transition " +
    "placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200";

  const iconBtnCls =
    "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 " +
    "rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-sky-200";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* background glow (เข้าธีม panel) */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-180px] h-[520px] w-[520px] rounded-full bg-blue-200/30 blur-3xl" />
      </div>

      <form
        onSubmit={onLogin}
        className="relative w-full max-w-sm rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 shadow-md shadow-sky-200/70" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
            <p className="text-sm text-slate-500">Demo users: admin / organizer / student</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Username</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className={inputCls.replace("pr-12", "pr-4")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กิ้วๆ"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กิ้วๆ"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={iconBtnCls}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl p-3 text-sm border bg-red-50 border-red-200 text-red-700">
              {error}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="w-full h-11 rounded-2xl font-semibold transition
                       bg-gradient-to-r from-sky-500 to-blue-500 text-white
                       shadow-md shadow-sky-200/70 hover:shadow-lg
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>

          <div className="text-xs text-slate-500">
            จะพาไปต่อที่: <span className="text-slate-700">{nextPath}</span>
          </div>
        </div>
      </form>
    </div>
  );
}