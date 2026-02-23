import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await connectDB();

    const now = new Date();

    const ongoing = await Event.find({
      isActive: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    })
      .sort({ startAt: 1 })
      .select("title description startAt endAt qrToken createdAt")
      .lean();

    const upcoming = await Event.find({
      isActive: true,
      startAt: { $gt: now },
    })
      .sort({ startAt: 1 })
      .limit(10)
      .select("title startAt endAt qrToken")
      .lean();

    return NextResponse.json({
      ok: true,
      now,
      ongoing: ongoing.map((e: any) => ({
        id: String(e._id),
        title: e.title,
        description: e.description || "",
        startAt: e.startAt,
        endAt: e.endAt,
        qrToken: e.qrToken,
      })),
      upcoming: upcoming.map((e: any) => ({
        id: String(e._id),
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
        qrToken: e.qrToken,
      })),
    });
  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
