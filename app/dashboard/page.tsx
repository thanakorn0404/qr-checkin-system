"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserTopbar from "./UserTopbar";

type GeoBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type Item = {
  id: string;
  title: string;
  description: string;
  locationName: string;
  notes: string;
  geoBox: GeoBox | null;
  startAt: string;
  endAt: string;
  qrToken: string;
  isActive: boolean;
  alreadyCheckedIn: boolean;
};

// ✅ 2.2 ฟังก์ชันคำนวณ “จุดกึ่งกลาง” + ลิงก์ Google Maps
function getCenter(box: GeoBox | null) {
  if (!box) return null;
  const lat = (box.north + box.south) / 2;
  const lng = (box.east + box.west) / 2;
  return { lat, lng };
}

function gmapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      // เช็ค auth ก่อน
      const me = await fetch("/api/auth/me", { credentials: "include" });
      const meData = await me.json().catch(() => null);
      if (!me.ok || !meData?.ok) {
        router.push("/login?next=/dashboard");
        return;
      }

      // โหลดกิจกรรม
      const res = await fetch("/api/events/available", { credentials: "include" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg("โหลดรายการกิจกรรมไม่สำเร็จ");
        setLoading(false);
        return;
      }

      setItems(data.items || []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-black text-white p-4">กำลังโหลด Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 flex justify-center">
      <div className="w-full max-w-2xl">
        <UserTopbar />

        <div className="mt-4 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">กิจกรรมที่เข้าร่วมได้</h1>
          <button
            onClick={() => router.push("/dashboard/history")}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
          >
            ดูประวัติที่เข้าร่วม
          </button>
        </div>

        {msg ? (
          <div className="mt-4 rounded-xl p-3 text-sm border bg-red-500/10 border-red-500/30 text-red-200">
            {msg}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
              ยังไม่มีกิจกรรมที่เปิดให้เข้าร่วม
            </div>
          ) : (
            items.map((e) => {
              const center = getCenter(e.geoBox);

              return (
                <div key={e.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-lg font-semibold">{e.title}</div>

                  {e.description ? <div className="text-white/70 mt-1">{e.description}</div> : null}

                  <div className="text-white/60 text-sm mt-2">
                    {new Date(e.startAt).toLocaleString()} - {new Date(e.endAt).toLocaleString()}
                  </div>

                  {/* ✅ 2.3 แสดงสถานที่ */}
                  <div className="mt-2 text-sm">
                    {e.locationName ? (
                      <div className="text-white/80">
                        📍 สถานที่: <span className="text-white">{e.locationName}</span>
                      </div>
                    ) : (
                      <div className="text-white/50">📍 สถานที่: (ยังไม่ระบุ)</div>
                    )}
                  </div>

                  {/* ✅ แสดงหมายเหตุ */}
                  {e.notes ? (
                    <div className="mt-2 text-sm text-white/70">
                      📝 หมายเหตุ: <span className="text-white/80">{e.notes}</span>
                    </div>
                  ) : null}

                  {/* ✅ แสดงพิกัด/แผนที่ */}
                  <div className="mt-2 text-sm text-white/70">
                    {center ? (
                      <>
                        🧭 พิกัดกลางพื้นที่:{" "}
                        <span className="text-white">
                          {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
                        </span>

                        <div className="mt-2 flex gap-2 flex-wrap">
                          <a
                            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
                            href={gmapsUrl(center.lat, center.lng)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            เปิดใน Google Maps
                          </a>

                          {e.geoBox ? (
                            <button
                              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
                              onClick={() =>
                                alert(
                                  `ขอบเขตพื้นที่กิจกรรม\nnorth: ${e.geoBox!.north}\nsouth: ${e.geoBox!.south}\neast: ${e.geoBox!.east}\nwest: ${e.geoBox!.west}`
                                )
                              }
                            >
                              ดูขอบเขตพิกัด
                            </button>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="text-white/50">🧭 พิกัดพื้นที่: (ยังไม่กำหนด)</div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      disabled={e.alreadyCheckedIn}
                      onClick={() => router.push(`/checkin/${e.qrToken}`)}
                      className="rounded-xl bg-white text-black font-semibold px-3 py-2 text-sm disabled:opacity-60"
                    >
                      {e.alreadyCheckedIn ? "เช็คชื่อแล้ว" : "เช็คชื่อ"}
                    </button>

                    <button
                      onClick={() => router.push("/dashboard/history")}
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
                    >
                      ดูประวัติ
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
