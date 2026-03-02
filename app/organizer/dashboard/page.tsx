"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type EventItem = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  qrToken: string;
  checkinCount: number;
  isActive?: boolean;

  geoBox?: { north?: number; south?: number; east?: number; west?: number } | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string;
  notes?: string;
};

type ParticipantItem = {
  id: string;
  checkedInAt?: string;
  createdAt?: string;
  status?: string;
  distanceMeters?: number | null;
  participant: {
    studentId: string;
    fullName: string;
    year: string;
    classGroup: string;
    major: string;
    faculty: string;
    email: string;
    phone: string;
  };
};

type Toast = { type: "success" | "error"; text: string } | null;

const UI = {
  btn: "h-9 px-4 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 transition text-sm font-medium text-slate-700",
  btnPrimary:
    "h-10 px-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-500 shadow-md shadow-sky-200/70 hover:shadow-lg transition",
  btnDanger:
    "h-9 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition text-sm font-medium text-red-600",
  card: "rounded-3xl border border-sky-100 bg-white p-5 shadow-sm hover:shadow-md transition",
  section: "mt-4 rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6",
  input:
    "mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200",
  textarea:
    "mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-2.5 outline-none min-h-[80px] focus:border-sky-400 focus:ring-2 focus:ring-sky-200",
};

export default function OrganizerDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ongoing, setOngoing] = useState<EventItem[]>([]);
  const [upcoming, setUpcoming] = useState<EventItem[]>([]);
  const [error, setError] = useState("");

  // toast
  const [toast, setToast] = useState<Toast>(null);
  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 2500);
  }

  // modal state (แก้ไข)
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStartAt, setEditStartAt] = useState(""); // datetime-local
  const [editEndAt, setEditEndAt] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // modal รายละเอียด (Map + รายชื่อ)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  async function load() {
    setError("");

    const res = await fetch("/api/events/status", { cache: "no-store", credentials: "include" });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setError("โหลดกิจกรรมไม่สำเร็จ");
      setLoading(false);
      return;
    }

    setOngoing(data.ongoing || []);
    setUpcoming(data.upcoming || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  function checkinUrl(token: string) {
    return `${window.location.origin}/checkin/${token}`;
  }

  // center + map links
  function getCenterFromEvent(e: EventItem) {
    const box = e.geoBox || null;
    const hasBox =
      box &&
      typeof box.north === "number" &&
      typeof box.south === "number" &&
      typeof box.east === "number" &&
      typeof box.west === "number";

    if (hasBox) {
      const lat = ((box!.north as number) + (box!.south as number)) / 2;
      const lng = ((box!.east as number) + (box!.west as number)) / 2;
      return { lat, lng };
    }

    if (typeof e.latitude === "number" && typeof e.longitude === "number") {
      return { lat: e.latitude, lng: e.longitude };
    }

    return { lat: 9.14, lng: 99.33 };
  }

  function googleMapsLink(e: EventItem) {
    const c = getCenterFromEvent(e);
    return `https://www.google.com/maps?q=${c.lat},${c.lng}`;
  }

  function openStreetMapEmbed(e: EventItem) {
    const c = getCenterFromEvent(e);

    const box = e.geoBox || null;
    const hasBox =
      box &&
      typeof box.north === "number" &&
      typeof box.south === "number" &&
      typeof box.east === "number" &&
      typeof box.west === "number";

    if (hasBox) {
      const { north, south, east, west } = box as any;
      return `https://www.openstreetmap.org/export/embed.html?bbox=${west},${south},${east},${north}&layer=mapnik&marker=${c.lat},${c.lng}`;
    }

    const d = 0.003; // ~300m
    const west = c.lng - d,
      east = c.lng + d,
      south = c.lat - d,
      north = c.lat + d;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${west},${south},${east},${north}&layer=mapnik&marker=${c.lat},${c.lng}`;
  }

  // เปิด modal แก้ไข
  function openEdit(e: EventItem) {
    setEditing(e);
    setEditTitle(e.title || "");
    setEditDesc(e.description || "");

    const s = new Date(e.startAt);
    const en = new Date(e.endAt);
    setEditStartAt(new Date(s.getTime() - s.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setEditEndAt(new Date(en.getTime() - en.getTimezoneOffset() * 60000).toISOString().slice(0, 16));

    setEditActive(typeof e.isActive === "boolean" ? e.isActive : true);
    setEditOpen(true);
  }

  // save PATCH
  async function saveEdit() {
    if (!editing) return;

    if (!editTitle.trim()) return showToast({ type: "error", text: "กรุณาใส่ชื่อกิจกรรม" });
    if (!editStartAt || !editEndAt) return showToast({ type: "error", text: "กรุณาเลือกเวลาเริ่ม/สิ้นสุด" });

    setSaving(true);

    const payload = {
      title: editTitle.trim(),
      description: editDesc.trim(),
      isActive: editActive,
      startAt: new Date(editStartAt).toISOString(),
      endAt: new Date(editEndAt).toISOString(),
    };

    const res = await fetch(`/api/events/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !data?.ok) {
      return showToast({ type: "error", text: `แก้ไขไม่สำเร็จ: ${data?.error || "unknown"}` });
    }

    setEditOpen(false);
    setEditing(null);
    await load();
    showToast({ type: "success", text: "บันทึกการแก้ไขแล้ว ✅" });
  }

  // DELETE
  async function deleteEvent(e: EventItem) {
    if (!confirm(`ยืนยันลบกิจกรรม:\n${e.title}\n\n* ลบแล้วกู้คืนไม่ได้`)) return;

    const res = await fetch(`/api/events/${e.id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      return showToast({
        type: "error",
        text: data?.error === "forbidden" ? "สิทธิ์ไม่ถูกต้อง" : `ลบไม่สำเร็จ: ${data?.error || "unknown"}`,
      });
    }

    await load();
    showToast({ type: "success", text: "ลบกิจกรรมแล้ว ✅" });
  }

  // export excel
  function exportExcel(eventId: string) {
    window.open(`/api/organizer/events/${eventId}/export`, "_blank");
  }

  // เปิดรายชื่อ (Map + รายชื่อ)
  async function openDetail(e: EventItem) {
    setDetailEvent(e);
    setDetailOpen(true);

    setLoadingParticipants(true);
    setParticipants([]);

    const res = await fetch(`/api/organizer/events/${e.id}/participants`, {
      cache: "no-store",
      credentials: "include",
    });

    const data = await res.json().catch(() => null);
    setLoadingParticipants(false);

    if (!res.ok || !data?.ok) {
      showToast({ type: "error", text: "โหลดรายชื่อไม่สำเร็จ" });
      return;
    }

    setParticipants(data.items || []);
  }

  return (
    <div>
      {/* Toast */}
      {toast ? (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60]">
          <div
            className={`rounded-2xl px-4 py-2 text-sm border shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {toast.text}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Organizer Dashboard</h1>
          <p className="text-slate-500 mt-1">รายการกิจกรรม (อัปเดตทุก 5 วินาที)</p>
        </div>

        <button onClick={() => router.push("/organizer/create-event")} className={UI.btnPrimary}>
          + สร้างกิจกรรม
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl p-3 text-sm border bg-red-50 border-red-200 text-red-700">{error}</div>
      ) : null}

      {/* กำลังจัด */}
      <div className={UI.section}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">กำลังจัดอยู่ตอนนี้</h2>
          <div className="text-sm text-slate-500">{ongoing.length} กิจกรรม</div>
        </div>

        {loading ? (
          <div className="text-slate-500 mt-3">กำลังโหลด...</div>
        ) : ongoing.length === 0 ? (
          <div className="text-slate-600 mt-3">ตอนนี้ยังไม่มีกิจกรรมที่กำลังจัด</div>
        ) : (
          <div className="mt-3 grid gap-3">
            {ongoing.map((e) => (
              <div key={e.id} className={UI.card}>
                <div className="font-semibold text-slate-900">{e.title}</div>

                {e.description ? <div className="text-slate-600 mt-1">{e.description}</div> : null}

                <div className="text-slate-500 text-sm mt-2">
                  {new Date(e.startAt).toLocaleString()} - {new Date(e.endAt).toLocaleString()}
                </div>

                <div className="text-slate-600 text-sm mt-2">
                  เช็คชื่อแล้ว: <span className="font-semibold text-slate-900">{e.checkinCount}</span> คน
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  <button onClick={() => openDetail(e)} className={UI.btn}>
                    รายชื่อผู้เข้าร่วมกิจกรรม
                  </button>

                  <a
                    className={UI.btn}
                    href={`/api/qr?data=${encodeURIComponent(checkinUrl(e.qrToken))}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    เปิด QR
                  </a>

                  <button onClick={() => exportExcel(e.id)} className={UI.btn}>
                    Export Excel
                  </button>

                  <button onClick={() => openEdit(e)} className={UI.btn}>
                    แก้ไข
                  </button>

                  <button onClick={() => deleteEvent(e)} className={UI.btnDanger}>
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* กำลังจะเริ่ม */}
      <div className={UI.section}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">กำลังจะเริ่ม</h2>
          <div className="text-sm text-slate-500">{upcoming.length} รายการ</div>
        </div>

        {loading ? (
          <div className="text-slate-500 mt-3">กำลังโหลด...</div>
        ) : upcoming.length === 0 ? (
          <div className="text-slate-600 mt-3">ยังไม่มีกิจกรรมที่กำลังจะเริ่ม</div>
        ) : (
          <div className="mt-3 grid gap-3">
            {upcoming.map((e) => (
              <div key={e.id} className={UI.card}>
                <div className="font-semibold text-slate-900">{e.title}</div>

                <div className="text-slate-500 text-sm mt-2">
                  {new Date(e.startAt).toLocaleString()} - {new Date(e.endAt).toLocaleString()}
                </div>

                <div className="text-slate-600 text-sm mt-2">
                  เช็คชื่อแล้ว: <span className="font-semibold text-slate-900">{e.checkinCount}</span> คน
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  <button onClick={() => openDetail(e)} className={UI.btn}>
                    รายชื่อ ({e.checkinCount})
                  </button>

                  <a
                    className={UI.btn}
                    href={`/api/qr?data=${encodeURIComponent(checkinUrl(e.qrToken))}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    เปิด QR
                  </a>

                  <button onClick={() => exportExcel(e.id)} className={UI.btn}>
                    Export Excel
                  </button>

                  <button onClick={() => openEdit(e)} className={UI.btn}>
                    แก้ไข
                  </button>

                  <button onClick={() => deleteEvent(e)} className={UI.btnDanger}>
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal แก้ไข */}
      {editOpen && editing ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-3xl border border-sky-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">แก้ไขกิจกรรม</h3>
              <button onClick={() => setEditOpen(false)} className={UI.btn}>
                ปิด
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-sm text-slate-600">ชื่อกิจกรรม</label>
                <input className={UI.input} value={editTitle} onChange={(ev) => setEditTitle(ev.target.value)} />
              </div>

              <div>
                <label className="text-sm text-slate-600">รายละเอียด</label>
                <textarea className={UI.textarea} value={editDesc} onChange={(ev) => setEditDesc(ev.target.value)} />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">เวลาเริ่ม</label>
                  <input
                    type="datetime-local"
                    className={UI.input}
                    value={editStartAt}
                    onChange={(ev) => setEditStartAt(ev.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">เวลาสิ้นสุด</label>
                  <input
                    type="datetime-local"
                    className={UI.input}
                    value={editEndAt}
                    onChange={(ev) => setEditEndAt(ev.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={editActive} onChange={(ev) => setEditActive(ev.target.checked)} />
                เปิดให้เช็คชื่อ (isActive)
              </label>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditOpen(false)} className={UI.btn}>
                  ยกเลิก
                </button>
                <button onClick={saveEdit} disabled={saving} className={`${UI.btnPrimary} disabled:opacity-60`}>
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal รายชื่อ + Map */}
      {detailOpen && detailEvent ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl rounded-3xl border border-sky-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-lg font-semibold text-slate-900">{detailEvent.title}</div>
                <div className="text-slate-500 text-sm">
                  {new Date(detailEvent.startAt).toLocaleString()} - {new Date(detailEvent.endAt).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-2">
                <a href={googleMapsLink(detailEvent)} target="_blank" rel="noreferrer" className={UI.btn}>
                  เปิด Google Maps
                </a>
                <button onClick={() => setDetailOpen(false)} className={UI.btn}>
                  ปิด
                </button>
              </div>
            </div>

            {detailEvent.locationName ? (
              <div className="mt-2 text-slate-700 text-sm">สถานที่: {detailEvent.locationName}</div>
            ) : null}
            {detailEvent.notes ? <div className="mt-1 text-slate-600 text-sm">หมายเหตุ: {detailEvent.notes}</div> : null}

            {/* Map */}
            <div className="mt-3 rounded-3xl overflow-hidden border border-sky-100">
              <iframe title="map" src={openStreetMapEmbed(detailEvent)} className="w-full h-[320px]" />
            </div>

            {/* Participants */}
            <div className="mt-4 rounded-3xl border border-sky-100 bg-sky-50 p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">รายชื่อผู้เช็คชื่อ</div>
                <div className="text-slate-500 text-sm">{participants.length} คน</div>
              </div>

              {loadingParticipants ? (
                <div className="text-slate-500 mt-3">กำลังโหลดรายชื่อ...</div>
              ) : participants.length === 0 ? (
                <div className="text-slate-600 mt-3">ยังไม่มีคนเช็คชื่อ</div>
              ) : (
                <div className="mt-3 max-h-[320px] overflow-auto rounded-2xl border border-sky-100 bg-white">
                  <table className="w-full text-sm">
                    <thead className="text-slate-600 bg-sky-50 sticky top-0">
                      <tr className="border-b border-sky-100">
                        <th className="text-left p-2">รหัส</th>
                        <th className="text-left p-2">ชื่อ-สกุล</th>
                        <th className="text-left p-2">ปี</th>
                        <th className="text-left p-2">กลุ่ม</th>
                        <th className="text-left p-2">สาขา</th>
                        <th className="text-left p-2">คณะ</th>
                        <th className="text-left p-2">เวลา</th>
                        <th className="text-left p-2">ระยะ(ม.)</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {participants.map((p) => {
                        const t = p.checkedInAt || p.createdAt;
                        return (
                          <tr key={p.id} className="border-b border-sky-100">
                            <td className="p-2">{p.participant?.studentId || "-"}</td>
                            <td className="p-2 font-medium">{p.participant?.fullName || "-"}</td>
                            <td className="p-2 text-slate-600">{p.participant?.year || "-"}</td>
                            <td className="p-2 text-slate-600">{p.participant?.classGroup || "-"}</td>
                            <td className="p-2 text-slate-600">{p.participant?.major || "-"}</td>
                            <td className="p-2 text-slate-600">{p.participant?.faculty || "-"}</td>
                            <td className="p-2 text-slate-600">{t ? new Date(t).toLocaleString() : "-"}</td>
                            <td className="p-2 text-slate-600">{p.distanceMeters ?? "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}