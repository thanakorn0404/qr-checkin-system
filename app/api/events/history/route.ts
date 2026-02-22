import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Checkin } from "@/models/Checkin";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const auth = requireAuth();
    await connectDB();

    const checkins = await Checkin.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .lean();

    const eventIds = checkins.map((c: any) => c.eventId);

    const events = await Event.find({ _id: { $in: eventIds } }).lean();
    const map = new Map(events.map((e: any) => [String(e._id), e]));

    const items = checkins.map((c: any) => {
      const e = map.get(String(c.eventId));
      return {
        checkinAt: c.createdAt,
        distanceMeters: c.distanceMeters,
        eventTitle: e?.title || "(กิจกรรมถูกลบ/ไม่พบ)",
        eventId: String(c.eventId),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized") return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
