"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeUser = { name: string; role: string; username: string };

export default function OrganizerTopbar() {
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
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  }

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm text-white/70">Import Student</div>
        {user ? (
          <div className="text-sm">
            บทบาท : {user.name} 
          </div>
        ) : (
          <div className="text-sm text-white/50">กำลังโหลดผู้ใช้...</div>
        )}
      </div>

      {/* ✅ ปุ่มด้านขวา */}
      <div className="flex items-center gap-2">
        {/* ✅ แสดงเฉพาะ admin */}
        {user?.role === "admin" ? (
          <button
            onClick={() => router.push("/admin/import-students")}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
          >
            Import นักศึกษา
          </button>
        ) : null}
      </div>
    </div>
  );
}
