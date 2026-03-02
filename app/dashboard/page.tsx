"use client";

export default function DashboardPage() {
  return (
    <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xl font-semibold">กิจกรรมที่เข้าร่วมได้</div>
          <div className="text-sm text-slate-500 mt-1">รายการกิจกรรมที่เปิดให้เช็คชื่อ</div>
        </div>

        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-sky-100 text-sky-700">
          ยังไม่มีกิจกรรม
        </span>
      </div>

      {/* Empty state */}
      <div className="mt-5 rounded-2xl border border-sky-100 bg-white p-6 text-center">
        <div className="text-lg font-semibold">ยังไม่มีกิจกรรมเปิดให้เข้าร่วม</div>
        <div className="text-sm text-slate-500 mt-2">กรุณาตรวจสอบอีกครั้งในภายหลัง</div>
      </div>
    </div>
  );
}