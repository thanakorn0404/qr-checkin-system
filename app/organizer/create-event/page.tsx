"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { GeoBox } from "./_components/EventMapPicker";

const EventMapPicker = dynamic(() => import("./_components/EventMapPicker"), { ssr: false });

export default function CreateEventPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [geoBox, setGeoBox] = useState<GeoBox | null>(null);

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [status, setStatus] = useState<"idle" | "creating" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  const checkinUrl = useMemo(() => {
    if (!token) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/checkin/${token}`;
  }, [token]);

  async function onCreate() {
    if (!title.trim()) {
      setStatus("error");
      setMessage("กรุณาใส่ชื่อกิจกรรม");
      return;
    }
    if (!startAt || !endAt) {
      setStatus("error");
      setMessage("กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุด");
      return;
    }
    if (!geoBox) {
      setStatus("error");
      setMessage("กรุณาลากกรอบสี่เหลี่ยมบนแผนที่ก่อน");
      return;
    }

    setStatus("creating");
    setMessage("กำลังสร้างกิจกรรม...");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      locationName: locationName.trim(),
      notes: notes.trim(),
      isActive,
      geoBox,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
    };

    const res = await fetch("/api/events/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setStatus("error");
      setMessage(
        data?.error === "invalid_time"
          ? "เวลาไม่ถูกต้อง"
          : data?.error === "invalid_payload"
          ? "ข้อมูลไม่ครบ/รูปแบบไม่ถูกต้อง"
          : data?.error === "unauthorized"
          ? "ยังไม่ได้ล็อกอิน"
          : data?.error === "forbidden"
          ? "สิทธิ์ไม่ถูกต้อง"
          : "สร้างกิจกรรมไม่สำเร็จ"
      );
      return;
    }

    setToken(data.event.qrToken);
    setStatus("done");
    setMessage("สร้างกิจกรรมสำเร็จ ✅");
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("idle");
      setMessage("คัดลอกลิงก์แล้ว ✅");
    } catch {
      setStatus("error");
      setMessage("คัดลอกไม่สำเร็จ (ลองคัดลอกเอง)");
    }
  }

  const inputCls =
    "mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-2.5 outline-none transition " +
    "placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200";

  const textareaCls =
    "mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-2.5 outline-none transition min-h-[90px] " +
    "placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200";

  return (
    <div className="w-full max-w-5xl">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">สร้างกิจกรรม + QR</h1>
        <p className="text-sm text-slate-500 mt-1">หน้าสำหรับผู้จัดกิจกรรม</p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
        {/* Form Card */}
        <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
          <div className="grid gap-5">
            <div>
              <label className="text-sm font-medium text-slate-700">ชื่อกิจกรรม</label>
              <input
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ปฐมนิเทศนักศึกษาใหม่"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">รายละเอียด</label>
              <textarea
                className={textareaCls}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ใส่รายละเอียดกิจกรรม (ไม่บังคับ)"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">สถานที่/ห้อง/อาคาร</label>
                <input
                  className={inputCls}
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="เช่น ตึกวิทย์ ชั้น 2 ห้อง 204"
                />
              </div>

              <div className="flex items-end">
                <label className="w-full flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-slate-700">เปิดให้เช็คชื่อ</div>
                    <div className="text-xs text-slate-500">สถานะ isActive</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-5 w-5 accent-sky-600"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">หมายเหตุ/เงื่อนไข</label>
              <textarea
                className={textareaCls.replace("min-h-[90px]", "min-h-[80px]")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น ต้องอยู่ในพื้นที่กิจกรรม / เช็คชื่อได้ครั้งเดียว"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">เวลาเริ่ม</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">เวลาสิ้นสุด</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            </div>

            {/* Map */}
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2">
                เลือกพื้นที่กิจกรรม <span className="text-slate-500 font-normal">(วาดสี่เหลี่ยม Rectangle)</span>
              </div>

              <div className="rounded-2xl border border-sky-200 overflow-hidden bg-white">
                <div className="bg-sky-50 px-4 py-2 text-sm text-slate-700 flex items-center justify-between">
                  <span>แผนที่</span>
                  <span className="text-xs text-slate-500">ลากกรอบเพื่อกำหนดพื้นที่</span>
                </div>

                <div className="p-3">
                  <EventMapPicker value={geoBox} onChange={setGeoBox} />
                  {geoBox ? (
                    <div className="mt-2 text-xs text-slate-500">
                      north: {geoBox.north.toFixed(6)} • south: {geoBox.south.toFixed(6)} • east:{" "}
                      {geoBox.east.toFixed(6)} • west: {geoBox.west.toFixed(6)}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-amber-700">
                      * กรุณาวาดกรอบสี่เหลี่ยมเพื่อกำหนดพื้นที่ก่อนสร้างกิจกรรม
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <div className="text-xs text-slate-500">
                ระบบจะสร้างลิงก์สำหรับเช็คชื่อและ QR อัตโนมัติ
              </div>

              <button
                onClick={onCreate}
                disabled={status === "creating"}
                className="h-11 px-6 rounded-2xl font-semibold transition
                           bg-gradient-to-r from-sky-500 to-blue-500 text-white
                           shadow-md shadow-sky-200/70 hover:shadow-lg
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "creating" ? "กำลังสร้าง..." : "สร้างกิจกรรม"}
              </button>
            </div>

            {message ? (
              <div
                className={[
                  "rounded-2xl p-3 text-sm border",
                  status === "done"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : status === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-sky-50 border-sky-200 text-slate-700",
                ].join(" ")}
              >
                {message}
              </div>
            ) : null}
          </div>
        </div>

        {/* QR / Side Panel */}
        <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-lg font-semibold">QR สำหรับเช็คชื่อ</div>
              <div className="text-sm text-slate-500 mt-1">จะแสดงหลังสร้างกิจกรรมสำเร็จ</div>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-sky-100 text-sky-700">
              Check-in
            </span>
          </div>

          {!token ? (
            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-slate-600">
              ยังไม่มี QR — กด “สร้างกิจกรรม” เพื่อสร้างลิงก์และ QR
            </div>
          ) : (
            <>
              <div className="mt-4 text-sm text-slate-700 break-all">{checkinUrl}</div>

              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={() => copy(checkinUrl)}
                  className="h-10 px-3 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition text-sm font-medium"
                >
                  คัดลอกลิงก์
                </button>

                <a
                  className="h-10 px-3 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition text-sm font-medium inline-flex items-center"
                  href={`/api/qr?data=${encodeURIComponent(checkinUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  เปิดรูป QR
                </a>
              </div>

              <div className="mt-4 rounded-2xl border border-sky-100 bg-white p-3 flex justify-center">
                <img
                  className="rounded-xl bg-white"
                  alt="QR Code"
                  src={`/api/qr?data=${encodeURIComponent(checkinUrl)}`}
                />
              </div>

              <div className="mt-3 text-xs text-slate-500">
                แนะนำ: เปิดลิงก์บนมือถือเพื่อทดสอบการเช็คชื่อ
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}