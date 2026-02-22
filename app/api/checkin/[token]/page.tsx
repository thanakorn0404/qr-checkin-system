"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type EventInfo = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  locationName?: string;
  notes?: string;
};

type Result =
  | { ok: true; message: string; distanceMeters?: number; eventTitle?: string }
  | { ok: false; error: string; message?: string; distanceMeters?: number };

export default function CheckinPage() {
  const params = useParams();
  const token = (params?.token as string) || "";

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventInfo | null>(null);

  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // form fields
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [year, setYear] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [major, setMajor] = useState("");
  const [faculty, setFaculty] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // โหลด event จาก token
  useEffect(() => {
    (async () => {
      if (!token) return;

      const res = await fetch(`/api/events/by-token?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg({ type: "error", text: "ไม่พบกิจกรรม" });
        setLoading(false);
        return;
      }

      setEvent(data.event);
      setLoading(false);
    })();
  }, [token]);

  const canSubmit = useMemo(() => {
    return (
      token &&
      studentId.trim().length >= 5 &&
      fullName.trim().length >= 2 &&
      year.trim().length >= 1 &&
      classGroup.trim().length >= 1 &&
      major.trim().length >= 1 &&
      faculty.trim().length >= 1 &&
      email.trim().length >= 3 &&
      phone.trim().length >= 8
    );
  }, [token, studentId, fullName, year, classGroup, major, faculty, email, phone]);

  function niceError(r: Result): string {
    if (r.ok) return r.message;
    if (r.error === "already_checked_in") return "คุณเช็คชื่อกิจกรรมนี้ไปแล้ว";
    if (r.error === "out_of_time") return r.message || "ยังไม่ถึงเวลาเช็คชื่อ หรือหมดเวลาแล้ว";
    if (r.error === "outside_box") return r.message || "อยู่นอกพื้นที่กิจกรรม";
    if (r.error === "outside_radius") return r.message || "อยู่นอกพื้นที่กิจกรรม";
    if (r.error === "event_not_found") return "ไม่พบกิจกรรม";
    if (r.error === "invalid_payload") return "กรอกข้อมูลไม่ครบ/รูปแบบไม่ถูกต้อง";
    return `เช็คชื่อไม่สำเร็จ: ${r.error}`;
  }

  async function doCheckin() {
    if (checking) return;
    if (!event) return;

    setMsg(null);

    if (!canSubmit) {
      setMsg({ type: "error", text: "กรุณากรอกข้อมูลให้ครบก่อนกดเช็คชื่อ" });
      return;
    }

    if (!navigator.geolocation) {
      setMsg({ type: "error", text: "อุปกรณ์ไม่รองรับ GPS" });
      return;
    }

    setChecking(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              studentId,
              fullName,
              year,
              classGroup,
              major,
              faculty,
              email,
              phone,
              lat,
              lng,
            }),
          });

          const data = (await res.json().catch(() => null)) as Result | null;

          if (!res.ok || !data) {
            setMsg({ type: "error", text: "เช็คชื่อไม่สำเร็จ" });
            setChecking(false);
            return;
          }

          if (!data.ok) {
            setMsg({ type: "error", text: niceError(data) });
            setChecking(false);
            return;
          }

          setMsg({ type: "success", text: "เช็คชื่อเข้าร่วมกิจกรรมสำเร็จ ✅" });
          setChecking(false);
        } catch {
          setMsg({ type: "error", text: "เช็คชื่อไม่สำเร็จ" });
          setChecking(false);
        }
      },
      () => {
        setMsg({ type: "error", text: "ดึงพิกัดไม่สำเร็จ กรุณาอนุญาต Location" });
        setChecking(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  if (loading) return <div className="p-6 text-white bg-black min-h-screen">กำลังโหลด...</div>;
  if (!event) return <div className="p-6 text-red-400 bg-black min-h-screen">{msg?.text || "ไม่พบกิจกรรม"}</div>;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <div className="text-sm text-white/60 mt-2">
            {new Date(event.startAt).toLocaleString()} - {new Date(event.endAt).toLocaleString()}
          </div>

          {event.locationName ? <div className="text-sm text-white/70 mt-2">สถานที่: {event.locationName}</div> : null}
          {event.notes ? <div className="text-xs text-white/60 mt-2 whitespace-pre-wrap">{event.notes}</div> : null}
        </div>

        {msg ? (
          <div
            className={`mt-4 rounded-xl p-3 text-sm border ${
              msg.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-200"
                : "bg-red-500/10 border-red-500/30 text-red-200"
            }`}
          >
            {msg.text}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          <input className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
            placeholder="รหัสนักศึกษา (เช่น 6504305001318)"
            value={studentId} onChange={(e) => setStudentId(e.target.value)} />

          <input className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
            placeholder="ชื่อ - นามสกุล"
            value={fullName} onChange={(e) => setFullName(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <input className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              placeholder="ชั้นปี (เช่น 1)"
              value={year} onChange={(e) => setYear(e.target.value)} />
            <input className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              placeholder="กลุ่มเรียน (เช่น 65059.042)"
              value={classGroup} onChange={(e) => setClassGroup(e.target.value)} />
          </div>

          <input className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
            placeholder="สาขา"
            value={major} onChange={(e) => setMajor(e.target.value)} />

          <input className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
            placeholder="คณะ"
            value={faculty} onChange={(e) => setFaculty(e.target.value)} />

          <input className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
            placeholder="อีเมล (เช่น 65059@student.sru.ac.th)"
            value={email} onChange={(e) => setEmail(e.target.value)} />

          <input className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
            placeholder="เบอร์โทร (เช่น 0836461572)"
            value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <button
          onClick={doCheckin}
          disabled={checking}
          className="mt-5 w-full rounded-xl bg-white text-black font-semibold py-3 disabled:opacity-60"
        >
          {checking ? "กำลังเช็คชื่อ..." : "เช็คชื่อเข้าร่วมกิจกรรม"}
        </button>

        {!canSubmit ? (
          <div className="mt-2 text-xs text-white/50">
            * ต้องกรอกข้อมูลให้ครบก่อน จึงจะเช็คชื่อได้
          </div>
        ) : null}
      </div>
    </div>
  );
}