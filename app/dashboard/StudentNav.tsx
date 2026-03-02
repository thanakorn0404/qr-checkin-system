"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, History, KeyRound } from "lucide-react";

const menu = [
  { href: "/dashboard", label: "กิจกรรมที่เข้าร่วมได้", icon: CalendarCheck },
  { href: "/dashboard/history", label: "ประวัติการเข้าร่วม", icon: History },
  { href: "/dashboard/change-password", label: "เปลี่ยนรหัสผ่าน", icon: KeyRound },
];

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

export default function StudentNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <aside className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 overflow-hidden">
      <div className="p-5 border-b border-sky-100">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 shadow-md shadow-sky-200/70" />
          <div className="min-w-0">
            <div className="font-semibold leading-tight truncate">Student Panel</div>
            <div className="text-xs text-slate-500 truncate">สำหรับนักศึกษา</div>
          </div>
        </div>
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
          <div className="text-sm font-semibold">คำแนะนำ</div>
          <div className="text-xs text-slate-600 mt-1">
            หากไม่พบกิจกรรม ให้ลองตรวจสอบภายหลัง หรือสอบถามผู้จัดกิจกรรม
          </div>
        </div>
      </div>
    </aside>
  );
}