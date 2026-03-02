"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

type MeUser = { name?: string; role?: string; username?: string };

export default function StudentTopbar() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) setUser(data.user);
    })();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    router.push("/login");
  }

  return (
    <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-lg shadow-sky-100/50 px-4 py-3">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight truncate">User Dashboard</div>
          <div className="text-xs text-slate-500 truncate">
            {user ? `${user.name || "นักศึกษา"} (@${user.username || "-"} • ${user.role || "-"})` : "กำลังโหลดผู้ใช้..."}
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div className="h-10 px-3 rounded-2xl border border-sky-200 bg-white flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-sky-100 grid place-items-center text-sky-700 font-bold">
              {(user?.name || user?.username || "U").toString().slice(0, 1).toUpperCase()}
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold max-w-[160px] truncate">
                {user?.name || user?.username || "นักศึกษา"}
              </div>
              <div className="text-[11px] text-slate-500 max-w-[160px] truncate">
                @{user?.username || "-"}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="h-10 px-3 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 transition
                       text-red-600 flex items-center gap-2 font-medium"
          >
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}