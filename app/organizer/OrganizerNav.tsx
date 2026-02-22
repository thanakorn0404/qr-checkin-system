"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Me = { name?: string; role?: "student" | "organizer" | "admin"; username?: string };

export default function OrganizerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) setMe(data.user);
    })();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/organizer/dashboard" && pathname.startsWith(href));

  const itemCls = (href: string) =>
    `px-3 py-2 rounded-xl text-sm border ${
      isActive(href)
        ? "bg-white text-black border-white"
        : "bg-white/10 text-white border-white/15 hover:bg-white/15"
    }`;

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto max-w-5xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Link className={itemCls("/organizer/dashboard")} href="/organizer/dashboard">
            Dashboard
          </Link>

          <Link className={itemCls("/organizer/create-event")} href="/organizer/create-event">
            สร้างกิจกรรม
          </Link>

          {/* admin เท่านั้น */}
          {me?.role === "admin" ? (
            <Link className={itemCls("/organizer/users")} href="/organizer/users">
              จัดการผู้ใช้
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-white/60 hidden sm:block">
            {me ? (
              <>
                {/* {me.name} <span className="text-white/40">(@{me.username} • {me.role})</span> */}
              </>
            ) : (
              "กำลังโหลดผู้ใช้..."
            )}
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
