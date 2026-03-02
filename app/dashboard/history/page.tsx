"use client";

import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();

  return (
    <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">ประวัติกิจกรรมที่เข้าร่วม</h2>
          <p className="text-sm text-slate-500 mt-1">
            รายการกิจกรรมที่คุณเคยเช็คชื่อเข้าร่วม
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="h-10 px-4 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition font-medium"
        >
          กลับไปหน้ากิจกรรม
        </button>
      </div>

      {/* Empty state */}
      <div className="mt-6 rounded-2xl border border-sky-100 bg-white p-6 text-center">
        <div className="text-lg font-semibold">
          ยังไม่มีประวัติการเข้าร่วม
        </div>
        <div className="text-sm text-slate-500 mt-2">
          เมื่อคุณเข้าร่วมกิจกรรม รายการจะแสดงที่นี่
        </div>
      </div>
    </div>
  );
}