import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Checkin } from "@/models/Checkin";
import { Event } from "@/models/Event";

export async function GET() {
  try {
    const auth = await requireAuth();

    // ✅ เฉพาะ student
    if (auth.role !== "student") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await connectDB();

    // ✅ join events ด้วย eventId (ใช้ aggregate)
    const rows = await Checkin.aggregate([
      { $match: { userId: new (await import("mongoose")).default.Types.ObjectId(auth.userId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: Event.collection.name, // "events"
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $project: {
          _id: 1,
          status: 1,
          distanceMeters: 1,
          createdAt: 1,
          "event._id": 1,
          "event.title": 1,
          "event.startAt": 1,
          "event.endAt": 1,
          "event.qrToken": 1,
        },
      },
    ]);

    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
}
