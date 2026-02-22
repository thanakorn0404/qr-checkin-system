import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await connectDB();

    const now = new Date();

    // ดึงกิจกรรมที่กำลังจัด + จะเริ่ม (ยังไม่หมดเวลา)
    const events = await Event.find({
      isActive: true,
      endAt: { $gte: now },
    })
      .sort({ startAt: 1 })
      .select("title locationName startAt endAt isActive qrToken")
      .lean();

    const eventIds = events.map((e: any) => e._id);

    // นับจำนวนเช็คชื่อแต่ละกิจกรรม
    const counts = await Checkin.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: "$eventId", total: { $sum: 1 } } },
    ]);

    const map = new Map<string, number>(counts.map((c: any) => [String(c._id), c.total]));

    const items = events.map((e: any) => ({
      id: String(e._id),
      title: e.title,
      locationName: e.locationName || "",
      startAt: e.startAt,
      endAt: e.endAt,
      isActive: Boolean(e.isActive),
      qrToken: e.qrToken,
      checkinCount: map.get(String(e._id)) || 0,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized") return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
