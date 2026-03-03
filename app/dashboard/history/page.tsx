"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  _id: string;
  status?: string;
  distanceMeters?: number;
  createdAt: string;
  event: {
    _id: string;
    title: string;
    startAt: string;
    endAt: string;
    locationName?: string;
    notes?: string;
    qrToken?: string;
  };
};

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      const res = await fetch("/api/checkin/my", { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);

      if (!alive) return;

      if (res.status === 401) {
        router.push("/login?next=/dashboard/history");
        return;
      }

      if (!res.ok || !data?.ok) {
        setError("โหลดประวัติไม่สำเร็จ");
        setRows([]);
        setLoading(false);
        return;
      }

      setRows(data.rows || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">ประวัติกิจกรรมที่เข้าร่วม</h2>
          <p className="text-sm text-slate-500 mt-1">รายการกิจกรรมที่คุณเคยเช็คชื่อเข้าร่วม</p>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="h-10 px-4 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition font-medium"
        >
          กลับไปหน้ากิจกรรม
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl p-3 text-sm border bg-red-50 border-red-200 text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="mt-6 text-slate-500">กำลังโหลด...</div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-sky-100 bg-white p-6 text-center">
          <div className="text-lg font-semibold">ยังไม่มีประวัติการเข้าร่วม</div>
          <div className="text-sm text-slate-500 mt-2">เมื่อคุณเข้าร่วมกิจกรรม รายการจะแสดงที่นี่</div>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {rows.map((r) => (
            <div key={r._id} className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{r.event.title}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    เวลาเช็คชื่อ: {new Date(r.createdAt).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500">
                    ช่วงกิจกรรม: {new Date(r.event.startAt).toLocaleString()} - {new Date(r.event.endAt).toLocaleString()}
                  </div>

                  {r.event.locationName ? (
                    <div className="text-sm text-slate-600 mt-1">สถานที่: {r.event.locationName}</div>
                  ) : null}
                </div>

                <div className="text-right">
                  <div
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                      (r.status || "") === "passed"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    {r.status || "-"}
                  </div>
                  <div className="text-sm text-slate-500 mt-2">ระยะ: {r.distanceMeters ?? "-"} m</div>
                </div>
              </div>

              {r.event.notes ? (
                <div className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{r.event.notes}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}