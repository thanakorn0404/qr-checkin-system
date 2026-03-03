// app/api/events/available/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAuth();
    await connectDB();

    if (auth.role !== "student") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (!auth.studentId) {
      return NextResponse.json({ ok: false, error: "missing_studentId" }, { status: 400 });
    }

    const now = new Date();

    const events = await Event.find({
      isActive: true,
      endAt: { $gte: now },
    })
      .sort({ startAt: 1 })
      .select("title description locationName notes startAt endAt qrToken geoBox isActive")
      .lean();

    const eventIds = events.map((e: any) => e._id);

    // ✅ ใช้ participant.studentId
    const myCheckins = await Checkin.find({
      "participant.studentId": String(auth.studentId),
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
    return NextResponse.json({ ok: false, error: "server_error", message: msg }, { status: 500 });
  }
}