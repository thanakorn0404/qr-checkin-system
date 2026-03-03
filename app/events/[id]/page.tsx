"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type EventItem = {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  locationName?: string;
  notes?: string;
  isActive?: boolean;
  checkinCount?: number;
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      // ถ้าหน้านี้ให้เฉพาะ organizer/admin ก็ตรวจสิทธิ์ก่อน
      const me = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      const meData = await me.json().catch(() => null);
      if (!me.ok || !meData?.ok) {
        router.push(`/login?next=${encodeURIComponent(`/events/${id}`)}`);
        return;
      }

      // ✅ ต้องมี API นี้ หรือแก้เป็น API ที่คุณมีอยู่
      const res = await fetch(`/api/events/${id}`, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError("ไม่พบกิจกรรม");
        setEvent(null);
        setLoading(false);
        return;
      }

      setEvent(data.event);
      setLoading(false);
    })();
  }, [id, router]);

  if (loading) return <div className="p-6">กำลังโหลด...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!event) return <div className="p-6">ไม่พบกิจกรรม</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{event.title}</h1>
              <div className="text-sm text-slate-500 mt-1">
                {new Date(event.startAt).toLocaleString()} - {new Date(event.endAt).toLocaleString()}
              </div>
              {event.locationName ? (
                <div className="text-sm text-slate-600 mt-2">สถานที่: {event.locationName}</div>
              ) : null}
              {event.notes ? (
                <div className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{event.notes}</div>
              ) : null}
            </div>

            <button
              onClick={() => router.back()}
              className="h-10 px-4 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition font-medium"
            >
              กลับ
            </button>
          </div>

          {event.description ? <div className="mt-4 text-slate-700">{event.description}</div> : null}

          <div className="mt-5 flex gap-2 flex-wrap">
            <button
              onClick={() => router.push("/organizer/dashboard")}
              className="h-10 px-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-500 shadow-md shadow-sky-200/70 hover:shadow-lg transition"
            >
              ไปหน้า Organizer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}