"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";

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

type Toast = { type: "success" | "error"; text: string } | null;

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

export default function CheckinPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token || "");

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [msg, setMsg] = useState("");
  const [checking, setChecking] = useState(false);

  const [toast, setToast] = useState<Toast>(null);
  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
  }

  // ✅ ฟอร์มนักศึกษา
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [year, setYear] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [major, setMajor] = useState("");
  const [faculty, setFaculty] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // ---------- helpers ----------
  const onlyDigits = (s: string) => s.replace(/\D+/g, "");
  const onlyDigitsAndDot = (s: string) => {
    let x = s.replace(/[^0-9.]+/g, "");
    x = x.replace(/\.{2,}/g, ".");
    x = x.replace(/^\./g, "");
    return x;
  };
  const onlyThaiEngSpace = (s: string) =>
    s
      .replace(/[^a-zA-Zก-๙\s]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trimStart();

  const normalizeEmail = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9@._+\-]+/g, "");

  function goLogin() {
    router.push(`/login?next=${encodeURIComponent(`/checkin/${token}`)}`);
  }

  function niceError(r: any): string {
    if (r?.ok) return r.message;
    const err = r?.error as string | undefined;
    const m = r?.message as string | undefined;

    if (err === "already_checked_in") return "คุณเช็คชื่อกิจกรรมนี้ไปแล้ว";
    if (err === "out_of_time") return m || "ยังไม่ถึงเวลาเช็คชื่อ หรือหมดเวลาแล้ว";
    if (err === "outside_box") return m || "อยู่นอกพื้นที่กิจกรรม";
    if (err === "outside_radius") return m || "อยู่นอกพื้นที่กิจกรรม";
    if (err === "event_not_found") return "ไม่พบกิจกรรม";
    if (err === "invalid_payload") return "กรอกข้อมูลไม่ถูกต้อง";
    if (err === "unauthorized") return "กรุณา login ก่อน";
    return `เช็คชื่อไม่สำเร็จ: ${err || "unknown_error"}`;
  }

  // ✅ โหลดข้อมูล event + บังคับ login
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!token) {
        if (!alive) return;
        setMsg("ลิงก์เช็คชื่อไม่ถูกต้อง (ไม่มี token)");
        showToast("error", "ลิงก์เช็คชื่อไม่ถูกต้อง");
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
        showToast("error", "ไม่พบกิจกรรม");
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
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = useMemo(() => {
    return (
      token &&
      studentId.trim().length >= 5 &&
      fullName.trim().length >= 2 &&
      year.trim().length >= 1 &&
      classGroup.trim().length >= 1 &&
      major.trim().length >= 1 &&
      faculty.trim().length >= 1 &&
      /\S+@\S+\.\S+/.test(email.trim()) &&
      phone.trim().length >= 8
    );
  }, [token, studentId, fullName, year, classGroup, major, faculty, email, phone]);

  async function doCheckin() {
    if (checking || !event) return;
    setMsg("");

    if (!canSubmit) {
      setMsg("กรุณากรอกข้อมูลให้ถูกต้องและครบก่อนกดเช็คชื่อ");
      showToast("error", "กรุณากรอกข้อมูลให้ครบ/ถูกต้อง");
      return;
    }

    setChecking(true);

    const me = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    const meData = await me.json().catch(() => null);
    if (!me.ok || !meData?.ok) {
      setChecking(false);
      goLogin();
      return;
    }

    if (!navigator.geolocation) {
      setMsg("อุปกรณ์ไม่รองรับ GPS");
      showToast("error", "อุปกรณ์ไม่รองรับ GPS");
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
            showToast("error", "เช็คชื่อไม่สำเร็จ");
            setChecking(false);
            return;
          }

          if (!(data as any).ok) {
            const m = niceError(data);
            setMsg(m);
            showToast("error", m);
            setChecking(false);
            return;
          }

          const okMsg = "เช็คชื่อสำเร็จ ✅";
          setMsg(okMsg);
          showToast("success", okMsg);
          setChecking(false);
        } catch {
          setMsg("เช็คชื่อไม่สำเร็จ");
          showToast("error", "เช็คชื่อไม่สำเร็จ");
          setChecking(false);
        }
      },
      () => {
        setMsg("ดึงพิกัดไม่สำเร็จ กรุณาอนุญาต Location");
        showToast("error", "กรุณาอนุญาต Location");
        setChecking(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  const rangeText = useMemo(() => {
    if (!event) return "";
    try {
      return `${new Date(event.startAt).toLocaleString()} - ${new Date(event.endAt).toLocaleString()}`;
    } catch {
      return "";
    }
  }, [event]);

  // ===== White + Sky theme =====
  const card =
    "rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60";

  const labelCls = "text-xs font-semibold text-slate-600";

  const inputBase =
    "w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 outline-none transition " +
    "text-slate-900 placeholder:text-slate-400 " +
    "focus:border-sky-400 focus:ring-2 focus:ring-sky-200";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 text-slate-900">
        <div className="mx-auto max-w-xl px-4 py-12">
          <div className={cx(card, "p-6")}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-sky-100 animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-44 rounded-xl bg-sky-100 animate-pulse" />
                <div className="mt-2 h-4 w-72 rounded-xl bg-sky-100 animate-pulse" />
              </div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-sky-100 overflow-hidden">
              <div className="h-full w-1/2 bg-sky-400 animate-pulse" />
            </div>
            <div className="mt-3 text-sm text-slate-500">กำลังโหลดข้อมูลกิจกรรม...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 text-slate-900 flex items-center justify-center p-4">
        <div className={cx(card, "max-w-md w-full p-6")}>
          <div className="text-lg font-semibold">ไม่พบกิจกรรม</div>
          <div className="mt-2 text-sm text-slate-500">{msg || "ลิงก์กิจกรรมอาจไม่ถูกต้องหรือหมดอายุ"}</div>
          <button
            onClick={() => router.back()}
            className="mt-5 h-11 w-full rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition font-semibold"
          >
            กลับ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 text-slate-900">
      {/* Toast */}
      {toast ? (
        <div className="fixed top-4 left-1/2 z-[60] -translate-x-1/2">
          <div
            className={cx(
              "rounded-2xl px-4 py-2 text-sm border shadow-lg backdrop-blur",
              toast.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-700",
              toast.type === "error" && "bg-red-50 border-red-200 text-red-700"
            )}
          >
            {toast.text}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className={cx(card, "p-6")}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 shadow-md shadow-sky-200/70 text-white">
                  <ShieldCheck size={20} />
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold tracking-tight">{event.title}</h1>
                  <div className="mt-1 text-sm text-slate-500">{rangeText}</div>
                </div>
              </div>

              {event.locationName ? (
                <div className="mt-3 text-sm text-slate-600">สถานที่: {event.locationName}</div>
              ) : null}

              {event.notes ? (
                <div className="mt-2 text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">
                  {event.notes}
                </div>
              ) : null}
            </div>

            <button
              onClick={() => router.back()}
              className="h-10 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition font-medium px-4 inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              กลับ
            </button>
          </div>
        </div>

        {/* Form */}
        <div className={cx(card, "mt-5 p-6")}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">ข้อมูลผู้เข้าร่วม</div>
              <div className="text-xs text-slate-500 mt-1">กรอกให้ครบก่อนกด “เช็คชื่อ”</div>
            </div>
            <div className="text-[11px] text-slate-400">token: {token.slice(0, 10)}…</div>
          </div>

          <div className="mt-5 grid gap-4">
            <div>
              <div className={labelCls}>รหัสนักศึกษา</div>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={13}
                className={inputBase}
                value={studentId}
                onChange={(e) => setStudentId(onlyDigits(e.target.value))}
                placeholder="6504305001318"
              />
            </div>

            <div>
              <div className={labelCls}>ชื่อ-นามสกุล</div>
              <input
                className={inputBase}
                value={fullName}
                onChange={(e) => setFullName(onlyThaiEngSpace(e.target.value))}
                placeholder="เช่น ธนกร โตอำมาตย์"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className={labelCls}>ชั้นปี</div>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className={inputBase}
                  value={year}
                  onChange={(e) => setYear(onlyDigits(e.target.value))}
                  placeholder="1"
                />
              </div>

              <div>
                <div className={labelCls}>กลุ่มเรียน</div>
                <input
                  inputMode="decimal"
                  className={inputBase}
                  value={classGroup}
                  onChange={(e) => setClassGroup(onlyDigitsAndDot(e.target.value))}
                  placeholder="65059.042"
                />
              </div>
            </div>

            <div>
              <div className={labelCls}>สาขา</div>
              <input
                className={inputBase}
                value={major}
                onChange={(e) => setMajor(onlyThaiEngSpace(e.target.value))}
                placeholder="เช่น วิทยาการคอมพิวเตอร์"
              />
            </div>

            <div>
              <div className={labelCls}>คณะ</div>
              <input
                className={inputBase}
                value={faculty}
                onChange={(e) => setFaculty(onlyThaiEngSpace(e.target.value))}
                placeholder="เช่น คณะวิทยาศาสตร์ฯ"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className={labelCls}>อีเมล</div>
                <input
                  inputMode="email"
                  className={inputBase}
                  value={email}
                  onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                  placeholder="65059@student.sru.ac.th"
                />
              </div>

              <div>
                <div className={labelCls}>เบอร์โทร</div>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  className={inputBase}
                  value={phone}
                  onChange={(e) => setPhone(onlyDigits(e.target.value))}
                  placeholder="0836461572"
                />
              </div>
            </div>

            {msg ? (
              <div
                className={cx(
                  "rounded-2xl p-3 text-sm border",
                  msg.includes("✅")
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-red-50 border-red-200 text-red-700"
                )}
              >
                {msg}
              </div>
            ) : null}

            <button
              onClick={doCheckin}
              disabled={checking || !canSubmit}
              className={cx(
                "h-12 w-full rounded-2xl font-semibold transition flex items-center justify-center gap-2",
                "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md shadow-sky-200/70 hover:shadow-lg",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {checking ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {checking ? "กำลังเช็คชื่อ..." : "เช็คชื่อเข้าร่วมกิจกรรม"}
            </button>

            {!canSubmit ? (
              <div className="text-[11px] text-slate-500 text-center">
                * ต้องกรอกข้อมูลให้ครบ/ถูกต้องก่อน
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}