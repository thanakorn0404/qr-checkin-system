"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type GeoBox = { north: number; south: number; east: number; west: number };

type EventItem = {
  id: string;
  title: string;
  description: string;
  locationName: string;
  notes: string;
  geoBox: GeoBox | null;
  startAt: string; // ISO
  endAt: string; // ISO
  qrToken: string;
  isActive: boolean;
  alreadyCheckedIn: boolean;
};

type ApiResp = { ok: true; items: EventItem[] } | { ok: false; error?: string };

function fmt(dt: Date) {
  // แสดงเวลาไทยแบบอ่านง่าย
  return dt.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(e: EventItem, now: Date) {
  const s = new Date(e.startAt);
  const en = new Date(e.endAt);

  if (!e.isActive) return { label: "ปิดใช้งาน", tone: "bg-slate-100 text-slate-600" };
  if (now < s) return { label: "ยังไม่เริ่ม", tone: "bg-amber-100 text-amber-700" };
  if (now > en) return { label: "หมดเวลา", tone: "bg-slate-100 text-slate-600" };
  return { label: "กำลังจัดอยู่", tone: "bg-emerald-100 text-emerald-700" };
}

export default function DashboardPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // โหลดข้อมูลครั้งแรก + รีเฟรชทุก 5 วิ (เหมือนที่หน้าบอก)
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setErr(null);
        const r = await fetch("/api/events/available", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data: ApiResp = await r.json().catch(() => ({ ok: false, error: "bad_json" } as any));
        if (!alive) return;

        if (!r.ok || !("ok" in data) || data.ok === false) {
          setErr(data && "error" in data ? data.error || "server_error" : "server_error");
          setItems([]);
          return;
        }

        setItems(data.items || []);
      } catch (e: any) {
        if (!alive) return;
        setErr("network_error");
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();
    const t = setInterval(load, 5000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const now = useMemo(() => new Date(), [loading, items.length]); // ใช้ตอน render

  const headerBadge = useMemo(() => {
    if (loading) return { text: "กำลังโหลด...", cls: "bg-slate-100 text-slate-600" };
    if (err) return { text: "โหลดไม่สำเร็จ", cls: "bg-red-100 text-red-700" };
    if (items.length === 0) return { text: "ยังไม่มีกิจกรรม", cls: "bg-sky-100 text-sky-700" };
    return { text: `${items.length} กิจกรรม`, cls: "bg-sky-100 text-sky-700" };
  }, [loading, err, items.length]);

  return (
    <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xl font-semibold">กิจกรรมที่เข้าร่วมได้</div>
          <div className="text-sm text-slate-500 mt-1">รายการกิจกรรมที่เปิดให้เช็คชื่อ (อัปเดตทุก 5 วินาที)</div>
        </div>

        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${headerBadge.cls}`}>
          {headerBadge.text}
        </span>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-sky-100 bg-white p-6">
          <div className="text-sm text-slate-500">กำลังโหลดกิจกรรม…</div>
        </div>
      ) : err ? (
        <div className="mt-5 rounded-2xl border border-red-100 bg-white p-6">
          <div className="text-lg font-semibold text-red-700">โหลดรายการไม่สำเร็จ</div>
          <div className="text-sm text-slate-500 mt-2">error: {err}</div>
          <div className="text-sm text-slate-500 mt-2">
            ถ้ายังไม่ล็อกอินจะโดน 401 ให้ล็อกอินใหม่ แล้วลองรีเฟรชหน้า
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-sky-100 bg-white p-6 text-center">
          <div className="text-lg font-semibold">ยังไม่มีกิจกรรมเปิดให้เข้าร่วม</div>
          <div className="text-sm text-slate-500 mt-2">กรุณาตรวจสอบอีกครั้งในภายหลัง</div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {items.map((e) => {
            const s = new Date(e.startAt);
            const en = new Date(e.endAt);
            const st = getStatus(e, new Date());

            return (
              <div key={e.id} className="rounded-2xl border border-sky-100 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{e.title}</div>
                    <div className="text-sm text-slate-500 mt-1">
                      {fmt(s)} - {fmt(en)}
                    </div>

                    {(e.locationName || e.notes) && (
                      <div className="text-sm text-slate-600 mt-2 space-y-1">
                        {e.locationName ? (
                          <div>
                            <span className="font-medium">สถานที่:</span> {e.locationName}
                          </div>
                        ) : null}
                        {e.notes ? (
                          <div>
                            <span className="font-medium">หมายเหตุ:</span> {e.notes}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {e.description ? <div className="text-sm text-slate-600 mt-2">{e.description}</div> : null}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${st.tone}`}>{st.label}</span>

                    {e.alreadyCheckedIn ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        เช็คชื่อแล้ว
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        ยังไม่เช็คชื่อ
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {/* ปรับ path ให้ตรงกับหน้าสแกนของคุณ */}
                  <Link
                    href={`/checkin/${e.qrToken}`}
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700"
                  >
                    ไปหน้าเช็คชื่อ
                  </Link>

                  {/* <Link
                    href={`/events/${e.id}`}
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-sky-200 text-sky-700 hover:bg-sky-50"
                  >
                    รายละเอียด
                  </Link> */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}