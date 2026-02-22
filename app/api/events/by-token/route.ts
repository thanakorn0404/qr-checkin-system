import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";

const QuerySchema = z.object({
  token: z.string().min(6),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    token: url.searchParams.get("token"),
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  await connectDB();

  const event = await Event.findOne({ qrToken: parsed.data.token, isActive: true }).lean();

  if (!event) {
    return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    event: {
      id: String(event._id),
      title: event.title,
      description: event.description,
      startAt: event.startAt,
      endAt: event.endAt,
      latitude: event.latitude,
      longitude: event.longitude,
      radiusMeters: event.radiusMeters,
    },
  });
}
