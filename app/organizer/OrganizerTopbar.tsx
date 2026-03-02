"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Plus, UploadCloud } from "lucide-react";

type MeUser = { name?: string; role?: string; username?: string };

function pageTitle(pathname: string) {
  if (pathname.startsWith("/organizer/create-event")) return "สร้างกิจกรรม";
  if (pathname.startsWith("/organizer/users")) return "จัดการผู้ใช้";
  if (pathname.startsWith("/organizer/events")) return "กิจกรรม";
  if (pathname.startsWith("/organizer/realtime")) return "Realtime";
  return "Dashboard";
}

export default function OrganizerTopbar() {
  const router = useRouter();
  const pathname = usePathname();

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
        {/* Left */}
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight truncate">
            {pageTitle(pathname)}
          </div>
          <div className="text-xs text-slate-500 truncate">
            Organizer Admin Template • โทนขาว/น้ำเงิน
          </div>
        </div>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Quick create */}
          <button
            onClick={() => router.push("/organizer/create-event")}
            className="h-10 px-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 text-white
                       shadow-md shadow-sky-200/70 hover:shadow-lg transition flex items-center gap-2"
          >
            <Plus size={16} />
            สร้างกิจกรรม
          </button>

          {/* Admin only */}
          {user?.role === "admin" ? (
            <button
              onClick={() => router.push("/admin/import-students")}
              className="h-10 px-3 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition
                         flex items-center gap-2 text-slate-700"
            >
              <UploadCloud size={16} className="text-slate-500" />
              Import นักศึกษา
            </button>
          ) : null}

          {/* User badge */}
          <div className="h-10 px-3 rounded-2xl border border-sky-200 bg-white flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-sky-100 grid place-items-center text-sky-700 font-bold">
              {(user?.name || user?.username || "U").toString().slice(0, 1).toUpperCase()}
            </div>
            <div className="leading-tight">
              {user ? (
                <>
                  <div className="text-xs font-semibold max-w-[140px] truncate">
                    {user.name || user.username}
                  </div>
                  <div className="text-[11px] text-slate-500 max-w-[140px] truncate">
                    @{user.username || "-"} • {user.role || "-"}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500">กำลังโหลดผู้ใช้...</div>
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="h-10 px-3 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 transition
                       text-red-600 flex items-center gap-2"
          >
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}