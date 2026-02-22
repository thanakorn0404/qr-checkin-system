"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import OrganizerTopbar from "../OrganizerTopbar";

type Box = { north: number; south: number; east: number; west: number };

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

export default function CreateEventPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // ✅ เพิ่มเติมเพื่อใช้งานจริง
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  // ✅ พื้นที่แบบกรอบสี่เหลี่ยม
  const [geoBox, setGeoBox] = useState<Box | null>(null);

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [status, setStatus] = useState<"idle" | "creating" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const [token, setToken] = useState<string>("");

  const checkinUrl = useMemo(() => {
    if (!token) return "";
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

    // ✅ ส่ง field เพิ่มไป API
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
          ? "สิทธิ์ไม่ถูกต้อง (ต้องเป็น organizer/admin)"
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
      setMessage("คัดลอกลิงก์แล้ว ✅");
      setStatus("idle");
    } catch {
      setMessage("คัดลอกไม่สำเร็จ (ลองคัดลอกเอง)");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 flex justify-center">
      <div className="w-full max-w-2xl">
        <OrganizerTopbar />

        <h1 className="text-2xl font-semibold mt-4">สร้างกิจกรรม + QR</h1>
        <p className="text-white/60 mt-1">หน้าสำหรับผู้จัด</p>

        <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div>
            <label className="text-sm text-white/70">ชื่อกิจกรรม</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ปฐมนิเทศนักศึกษาใหม่"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">รายละเอียด</label>
            <textarea
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none min-h-[90px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ใส่รายละเอียดกิจกรรม (ไม่บังคับ)"
            />
          </div>

          {/* ✅ สถานที่ + เปิด/ปิด */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/70">สถานที่/ห้อง/อาคาร</label>
              <input
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="เช่น หอประชุม 1 / อาคารเรียนรวม ชั้น 3"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                เปิดให้เช็คชื่อ (isActive)
              </label>
            </div>
          </div>

          {/* ✅ หมายเหตุ/เงื่อนไข */}
          <div>
            <label className="text-sm text-white/70">หมายเหตุ/เงื่อนไข</label>
            <textarea
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น เช็คชื่อได้ครั้งเดียว / ต้องอยู่ในพื้นที่กิจกรรม"
            />
          </div>

          {/* ✅ Map + ลากกรอบ */}
          <div className="mt-2">
            <div className="text-sm text-white/70 mb-2">
              เลือกพื้นที่กิจกรรม: ลาก “กรอบสี่เหลี่ยม” บนแผนที่ (Rectangle)
            </div>

            <MapPicker box={geoBox} onChange={setGeoBox} />

            {geoBox ? (
              <div className="mt-2 text-xs text-white/60">
                north: {geoBox.north.toFixed(6)} | south: {geoBox.south.toFixed(6)} | east:{" "}
                {geoBox.east.toFixed(6)} | west: {geoBox.west.toFixed(6)}
              </div>
            ) : (
              <div className="mt-2 text-xs text-red-200">
                * กรุณาลากกรอบสี่เหลี่ยมเพื่อกำหนดพื้นที่ก่อนสร้างกิจกรรม
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/70">เวลาเริ่ม</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-white/70">เวลาสิ้นสุด</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={onCreate}
            disabled={status === "creating"}
            className="rounded-xl bg-white text-black font-semibold py-2 disabled:opacity-60"
          >
            {status === "creating" ? "กำลังสร้าง..." : "สร้างกิจกรรม"}
          </button>

          {message ? (
            <div
              className={`rounded-xl p-3 text-sm border ${
                status === "done"
                  ? "bg-green-500/10 border-green-500/30 text-green-200"
                  : status === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-200"
                  : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              {message}
            </div>
          ) : null}
        </div>

        {token ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">QR สำหรับเช็คชื่อ</h2>
            <div className="mt-2 text-sm text-white/70 break-all">{checkinUrl}</div>

            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                onClick={() => copy(checkinUrl)}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
              >
                คัดลอกลิงก์
              </button>
              <a
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
                href={`/api/qr?data=${encodeURIComponent(checkinUrl)}`}
                target="_blank"
                rel="noreferrer"
              >
                เปิดรูป QR
              </a>
            </div>

            <div className="mt-4 flex justify-center">
              <img
                className="rounded-xl bg-white p-3"
                alt="QR Code"
                src={`/api/qr?data=${encodeURIComponent(checkinUrl)}`}
              />
            </div>

            <div className="mt-3 text-xs text-white/50">* สามารถแคปหน้าจอ QR นี้เป็นหลักฐานได้</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
