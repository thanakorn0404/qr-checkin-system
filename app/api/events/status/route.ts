// app/api/events/status/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";

export async function GET() {
  await connectDB();

  const now = new Date();

  const [ongoingRaw, upcomingRaw] = await Promise.all([
    Event.find({
      isActive: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    })
      .sort({ startAt: 1 })
      .select("title description startAt endAt qrToken geoBox latitude longitude radiusMeters locationName notes")
      .lean(),

    Event.find({
      isActive: true,
      startAt: { $gt: now },
    })
      .sort({ startAt: 1 })
      .limit(20)
      .select("title description startAt endAt qrToken geoBox latitude longitude radiusMeters locationName notes")
      .lean(),
  ]);

  const allIds = [...ongoingRaw, ...upcomingRaw].map((e: any) => e._id);

  const counts = await Checkin.aggregate([
  { $match: { eventId: { $in: allIds } } }, // ✅ นับทั้งหมด
  { $group: { _id: "$eventId", count: { $sum: 1 } } },
]);

  const countMap = new Map<string, number>(counts.map((c: any) => [String(c._id), c.count]));

  const mapEvent = (e: any) => ({
    id: String(e._id),
    title: e.title,
    description: e.description || "",
    startAt: e.startAt,
    endAt: e.endAt,
    qrToken: e.qrToken,
    locationName: e.locationName || "",
    notes: e.notes || "",
    geoBox: e.geoBox || null,
    latitude: typeof e.latitude === "number" ? e.latitude : null,
    longitude: typeof e.longitude === "number" ? e.longitude : null,
    checkinCount: countMap.get(String(e._id)) ?? 0,
    isActive: !!e.isActive,
  });

  return NextResponse.json({
    ok: true,
    now,
    ongoing: ongoingRaw.map(mapEvent),
    upcoming: upcomingRaw.map(mapEvent),
  });
}