"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  Users,
  Shield,
  FileBarChart2,
} from "lucide-react";

type Me = { name?: string; role?: "student" | "organizer" | "admin"; username?: string };

const baseMenu = [
  { href: "/organizer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizer/create-event", label: "สร้างกิจกรรม", icon: CalendarPlus },
];

const adminMenu = [
  { href: "/organizer/users", label: "จัดการผู้ใช้", icon: Users },
  { href: "/admin/reports", label: "รายงานผลกิจกรรม", icon: FileBarChart2 },
];

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

export default function OrganizerNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) setMe(data.user);
    })();
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== "/organizer/dashboard" && pathname.startsWith(href));

  const menu = me?.role === "admin" ? [...baseMenu, ...adminMenu] : baseMenu;

  return (
    <aside className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 overflow-hidden">
      <div className="p-5 border-b border-sky-100">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 shadow-md shadow-sky-200/70" />
          <div className="min-w-0">
            <div className="font-semibold leading-tight truncate">Organizer Panel</div>
            <div className="text-xs text-slate-500 truncate">
              {me?.role === "admin" ? "Admin Access" : "Organizer Access"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-sky-100">
        {me ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {me.name || me.username || "ผู้ใช้งาน"}
              </div>
              <div className="text-xs text-slate-500 truncate">
                @{me.username || "-"} • {me.role || "-"}
              </div>
            </div>
            {me.role === "admin" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-sky-100 text-sky-700">
                <Shield size={14} />
                ADMIN
              </span>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-slate-500">กำลังโหลดผู้ใช้...</div>
        )}
      </div>

      <div className="p-3">
        <div className="text-xs font-semibold text-slate-500 px-3 pb-2">เมนู</div>
        <nav className="space-y-1">
          {menu.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                  active
                    ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md shadow-sky-200/70"
                    : "text-slate-700 hover:bg-sky-50"
                )}
              >
                <Icon size={18} className={cx(active ? "text-white" : "text-slate-500")} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-3">
          <div className="text-sm font-semibold">Quick Tip</div>
          <div className="text-xs text-slate-600 mt-1">
            เริ่มจาก “สร้างกิจกรรม” แล้วไปดูผลใน Dashboard
          </div>
        </div>
      </div>
    </aside>
  );
}