"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserTopbar from "../UserTopbar";

type HistoryItem = {
  checkinAt: string;
  distanceMeters: number;
  eventTitle: string;
  eventId: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      const meData = await me.json().catch(() => null);
      if (!me.ok || !meData?.ok) {
        router.push("/login?next=/dashboard/history");
        return;
      }

      const res = await fetch("/api/events/history");
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg("โหลดประวัติไม่สำเร็จ");
        setLoading(false);
        return;
      }

      setItems(data.items || []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-black text-white p-4">กำลังโหลดประวัติ...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 flex justify-center">
      <div className="w-full max-w-2xl">
        <UserTopbar />

        <div className="mt-4 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">ประวัติกิจกรรมที่เข้าร่วม</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
          >
            กลับไปหน้ากิจกรรม
          </button>
        </div>

        {msg ? (
          <div className="mt-4 rounded-xl p-3 text-sm border bg-red-500/10 border-red-500/30 text-red-200">
            {msg}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
              ยังไม่มีประวัติการเข้าร่วม
            </div>
          ) : (
            items.map((x, idx) => (
              <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-lg font-semibold">{x.eventTitle}</div>
                <div className="text-white/60 text-sm mt-2">
                  เช็คชื่อเมื่อ: {new Date(x.checkinAt).toLocaleString()}
                </div>
                <div className="text-white/60 text-sm mt-1">ระยะ: {x.distanceMeters} เมตร</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
