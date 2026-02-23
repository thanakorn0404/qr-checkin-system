"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  const router = useRouter();
  const token = String(params?.token || "");

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [msg, setMsg] = useState("");
  const [checking, setChecking] = useState(false);

  // ✅ ฟอร์มนักศึกษา
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [year, setYear] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [major, setMajor] = useState("");
  const [faculty, setFaculty] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  function goLogin() {
    router.push(`/login?next=${encodeURIComponent(`/checkin/${token}`)}`);
  }

  // ✅ โหลดข้อมูล event จาก token (และบังคับ login ตามที่คุณทำไว้)
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!token) {
        if (!alive) return;
        setMsg("ลิงก์เช็คชื่อไม่ถูกต้อง (ไม่มี token)");
        setLoading(false);
        return;
      }

      const me = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      const meData = await me.json().catch(() => null);
      if (!me.ok || !meData?.ok) {
        goLogin();
        return;
      }

      const res = await fetch(`/api/events/by-token?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);

      if (!alive) return;

      if (!res.ok || !data?.ok) {
        setMsg("ไม่พบกิจกรรม");
        setEvent(null);
        setLoading(false);
        return;
      }

      setEvent(data.event);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

 function niceError(r: Result): string {
  if ((r as any).ok) return (r as any).message;

  const err = (r as any).error as string | undefined;
  const msg = (r as any).message as string | undefined;

  if (err === "already_checked_in") return "คุณเช็คชื่อกิจกรรมนี้ไปแล้ว";
  if (err === "out_of_time") return msg || "ยังไม่ถึงเวลาเช็คชื่อ หรือหมดเวลาแล้ว";
  if (err === "outside_box") return msg || "อยู่นอกพื้นที่กิจกรรม";
  if (err === "outside_radius") return msg || "อยู่นอกพื้นที่กิจกรรม";
  if (err === "event_not_found") return "ไม่พบกิจกรรม";
  if (err === "invalid_payload") return "กรอกข้อมูลไม่ครบ หรือพิกัดไม่ถูกต้อง";
  if (err === "unauthorized") return "กรุณา login ก่อน";

  return `เช็คชื่อไม่สำเร็จ: ${err || "unknown_error"}`;
}

  // ✅ validate ก่อนกดเช็คชื่อ
  const canSubmit = useMemo(() => {
    const ok =
      token &&
      studentId.trim().length >= 5 &&
      fullName.trim().length >= 2 &&
      year.trim().length >= 1 &&
      classGroup.trim().length >= 1 &&
      major.trim().length >= 1 &&
      faculty.trim().length >= 1 &&
      email.trim().includes("@") &&
      phone.trim().length >= 8;
    return !!ok;
  }, [token, studentId, fullName, year, classGroup, major, faculty, email, phone]);

  async function doCheckin() {
    if (checking) return;
    if (!event) return;

    setMsg("");

    // ✅ กันกดถ้าข้อมูลไม่ครบ
    if (!canSubmit) {
      setMsg("กรุณากรอกข้อมูลให้ครบก่อนกดเช็คชื่อ");
      return;
    }

    setChecking(true);

    // session หลุด -> login
    const me = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    const meData = await me.json().catch(() => null);
    if (!me.ok || !meData?.ok) {
      setChecking(false);
      goLogin();
      return;
    }

    if (!navigator.geolocation) {
      setMsg("อุปกรณ์ไม่รองรับ GPS");
      setChecking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const payload = {
            token,
            studentId: studentId.trim(),
            fullName: fullName.trim(),
            year: year.trim(),
            classGroup: classGroup.trim(),
            major: major.trim(),
            faculty: faculty.trim(),
            email: email.trim(),
            phone: phone.trim(),
            lat,
            lng,
          };

          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });

          if (res.status === 401) {
            setChecking(false);
            goLogin();
            return;
          }

          const data = (await res.json().catch(() => null)) as Result | null;

          if (!res.ok || !data) {
            setMsg("เช็คชื่อไม่สำเร็จ");
            setChecking(false);
            return;
          }

          if (!(data as any).ok) {
            setMsg(niceError(data as any));
            setChecking(false);
            return;
          }

          setMsg("เช็คชื่อสำเร็จ ✅");
          setChecking(false);
        } catch {
          setMsg("เช็คชื่อไม่สำเร็จ");
          setChecking(false);
        }
      },
      () => {
        setMsg("ดึงพิกัดไม่สำเร็จ กรุณาอนุญาต Location");
        setChecking(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  if (loading) {
    return <div className="p-6 text-white bg-black min-h-screen">กำลังโหลด...</div>;
  }

  if (!event) {
    return <div className="p-6 text-red-400 bg-black min-h-screen">{msg || "ไม่พบกิจกรรม"}</div>;
  }

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

        {/* ✅ ฟอร์ม */}
        <div className="mt-5 grid gap-3">
          <div>
            <label className="text-sm text-white/70">รหัสนักศึกษา</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="6504305001318"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">ชื่อ-นามสกุล</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="เช่น ธนกร โตอำมาตย์"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/70">ชั้นปี</label>
              <input
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-sm text-white/70">กลุ่มเรียน</label>
              <input
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={classGroup}
                onChange={(e) => setClassGroup(e.target.value)}
                placeholder="65059.042"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/70">สาขา</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="เช่น วิทยาการคอมพิวเตอร์"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">คณะ</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              placeholder="เช่น คณะวิทยาศาสตร์ฯ"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">อีเมล</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="65059@student.sru.ac.th"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">เบอร์โทร</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0836461572"
            />
          </div>
        </div>

        {msg ? (
          <div
            className={`mt-4 rounded-xl p-3 text-sm border ${
              msg.includes("✅")
                ? "bg-green-500/10 border-green-500/30 text-green-200"
                : "bg-red-500/10 border-red-500/30 text-red-200"
            }`}
          >
            {msg}
          </div>
        ) : null}

        <button
          onClick={doCheckin}
          disabled={checking || !canSubmit}
          className="mt-5 w-full rounded-xl bg-white text-black font-semibold py-3 disabled:opacity-60"
        >
          {checking ? "กำลังเช็คชื่อ..." : "เช็คชื่อเข้าร่วมกิจกรรม"}
        </button>

        {!canSubmit ? (
          <div className="mt-2 text-xs text-white/50 text-center">
            * ต้องกรอกข้อมูลให้ครบทุกช่องก่อน
          </div>
        ) : null}
      </div>
    </div>
  );
}