import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Checkin } from "@/models/Checkin";
import { Event } from "@/models/Event";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await requireAuth();
    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }

    await connectDB();

    // กันเปิดดูมั่ว: organizer ควรดูได้เฉพาะ event ของตัวเอง (ถ้าต้องการ)
    // ตอนนี้ allow admin/organizer ดูได้ทั้งหมด
    const ev = await Event.findById(id).select("_id title").lean();
    if (!ev) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    const rows = await Checkin.find({ eventId: ev._id })
      .populate("userId", "studentId username name role")
      .sort({ createdAt: 1 })
      .lean();

    const items = rows.map((c: any) => ({
      id: String(c._id),
      checkedInAt: c.createdAt,
      status: c.status,
      distanceMeters: c.distanceMeters ?? null,
      studentLat: c.studentLat ?? null,
      studentLng: c.studentLng ?? null,
      user: {
        id: String(c.userId?._id || ""),
        studentId: c.userId?.studentId || "",
        username: c.userId?.username || "",
        name: c.userId?.name || "",
        role: c.userId?.role || "",
      },
    }));

    return NextResponse.json({ ok: true, event: { id, title: (ev as any).title }, items });
  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
