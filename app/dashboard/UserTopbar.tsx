"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function UserTopbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; username: string } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) setUser(data.user);
    })();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center justify-between">
      <div>
        <div className="text-sm text-white/70">User Dashboard</div>
        {user ? (
          <div className="text-sm">
            {user.name} <span className="text-white/50">(@{user.username} • {user.role})</span>
          </div>
        ) : (
          <div className="text-sm text-white/50">กำลังโหลดผู้ใช้...</div>
        )}
      </div>
      {/* <button
        onClick={() => router.push("/change-password")}
        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm">
        เปลี่ยนรหัสผ่าน
      </button> */}

      <button
        onClick={logout}
        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm">
        ออกจากระบบ
      </button>
    </div>
  );
}
