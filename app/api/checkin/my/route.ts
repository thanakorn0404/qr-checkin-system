// app/api/checkin/my/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
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

    // ✅ ต้องมี studentId ใน token
    const sid = String(auth.studentId || "").trim();
    if (!sid) {
      return NextResponse.json({ ok: false, error: "missing_studentId" }, { status: 400 });
    }

    await connectDB();

    const rows = await Checkin.aggregate([
      // ✅ ใช้ participant.studentId (เพราะ Checkin ไม่มี userId)
      { $match: { "participant.studentId": sid } },
      { $sort: { createdAt: -1 } },

      {
        $lookup: {
          from: Event.collection.name, // usually "events"
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      // ถ้า event ถูกลบ/ไม่พบ จะไม่พัง
      { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          status: 1,
          distanceMeters: 1,
          createdAt: 1,

          participant: 1,

          event: {
            _id: "$event._id",
            title: "$event.title",
            startAt: "$event.startAt",
            endAt: "$event.endAt",
            locationName: "$event.locationName",
            notes: "$event.notes",
            qrToken: "$event.qrToken",
            isActive: "$event.isActive",
          },
        },
      },
    ]);

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}