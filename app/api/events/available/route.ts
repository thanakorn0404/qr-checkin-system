//app/api/events/available/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    // ✅ ต้อง await (กัน auth หลุด/เป็น Promise)
    const auth = await requireAuth();

    await connectDB();

    const now = new Date();

    // ✅ เลือกกิจกรรมที่ยังไม่หมดเวลา + active
    // ✅ select field ที่จำเป็น + เพิ่ม locationName/notes/geoBox
    const events = await Event.find({
      isActive: true,
      endAt: { $gte: now },
    })
      .sort({ startAt: 1 })
      .select("title description locationName notes startAt endAt qrToken geoBox isActive")
      .lean();

    const eventIds = events.map((e: any) => e._id);

    // ✅ หา checkin ของ user ใน events เหล่านี้
    const myCheckins = await Checkin.find({
      userId: auth.userId,
      eventId: { $in: eventIds },
    })
      .select("eventId createdAt")
      .lean();

    const checkedSet = new Set(myCheckins.map((c: any) => String(c.eventId)));

    const items = events.map((e: any) => ({
      id: String(e._id),
      title: e.title,
      description: e.description || "",
      locationName: e.locationName || "",
      notes: e.notes || "",
      geoBox: e.geoBox || null,
      startAt: e.startAt,
      endAt: e.endAt,
      qrToken: e.qrToken,
      isActive: Boolean(e.isActive),
      alreadyCheckedIn: checkedSet.has(String(e._id)),
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized") return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
