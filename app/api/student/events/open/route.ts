export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";

export async function GET() {
  try {
    const me = await requireAuth();
    if (me.role !== "student") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // ต้องมี studentId ใน token
    const myStudentId = (me.studentId || "").trim();
    if (!myStudentId) {
      return NextResponse.json({ ok: false, error: "missing_studentId" }, { status: 400 });
    }

    await connectDB();

    // ปรับ query ตามระบบคุณ (ตัวอย่าง: เอาเฉพาะ isActive)
    const events = await Event.find({ isActive: true }).sort({ startAt: -1 }).lean();

    const eventIds = events.map((e: any) => e._id);

    // หา checkins ของ studentId นี้ใน event เหล่านี้
    const checked = await Checkin.find({
      eventId: { $in: eventIds },
      "participant.studentId": myStudentId,
    })
      .select("eventId")
      .lean();

    const checkedSet = new Set(checked.map((x: any) => String(x.eventId)));

    return NextResponse.json({
      ok: true,
      items: events.map((e: any) => ({
        id: String(e._id),
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
        locationName: e.locationName || "",
        notes: e.notes || "",
        isActive: !!e.isActive,
        hasCheckedIn: checkedSet.has(String(e._id)), // ✅ สำคัญ
      })),
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized" || msg === "idle_timeout") {
      return NextResponse.json({ ok: false, error: msg }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}