"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  _id: string;
  status: string;
  distanceMeters?: number;
  createdAt: string;
  event: {
    _id: string;
    title: string;
    startAt: string;
    endAt: string;
    qrToken: string;
  };
};

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "include" });
      const meData = await me.json().catch(() => null);

      if (!me.ok || !meData?.ok) {
        router.replace(`/login?next=${encodeURIComponent("/history")}`);
        return;
      }
      if (meData.user?.role !== "student") {
        router.replace("/organizer/dashboard");
        return;
      }

      const res = await fetch("/api/checkins/my", { credentials: "include" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErr("โหลดประวัติไม่สำเร็จ");
        setLoading(false);
        return;
      }

      setRows(data.rows || []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="min-h-screen bg-black text-white p-4">กำลังโหลดประวัติ...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">ประวัติการเข้าร่วม</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
          >
            กลับ Dashboard
          </button>
        </div>

        <p className="text-white/60 mt-1">กิจกรรมที่คุณเคยเช็คชื่อเข้าร่วมแล้ว</p>

        {err ? (
          <div className="mt-4 rounded-xl p-3 text-sm border bg-red-500/10 border-red-500/30 text-red-200">
            {err}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
              ยังไม่มีประวัติการเข้าร่วมกิจกรรม
            </div>
          ) : (
            rows.map((r) => (
              <div key={r._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-lg font-semibold">{r.event.title}</div>

                <div className="text-xs text-white/50 mt-2">
                  เช็คชื่อเมื่อ: {new Date(r.createdAt).toLocaleString()}
                </div>

                <div className="text-xs text-white/50 mt-1">
                  เวลา: {new Date(r.event.startAt).toLocaleString()} - {new Date(r.event.endAt).toLocaleString()}
                </div>

                <div className="mt-2 text-sm">
                  สถานะ:{" "}
                  <span className={r.status === "passed" ? "text-green-300" : "text-yellow-300"}>
                    {r.status}
                  </span>
                  {typeof r.distanceMeters === "number" ? (
                    <span className="text-white/60"> • ระยะ {r.distanceMeters} m</span>
                  ) : null}
                </div>

                <div className="mt-3">
                  <button
                    onClick={() => router.push(`/checkin/${r.event.qrToken}`)}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
                  >
                    เปิดหน้าเช็คชื่อกิจกรรมนี้
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
