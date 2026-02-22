import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";
import { haversineMeters } from "@/lib/geo";

const BodySchema = z.object({
  token: z.string().min(6),

  studentId: z.string().min(5),
  fullName: z.string().min(2),
  year: z.string().min(1),
  classGroup: z.string().min(1),

  major: z.string().min(1),
  faculty: z.string().min(1),

  email: z.string().email(),
  phone: z.string().min(8),

  lat: z.number(),
  lng: z.number(),
});

function isPointInBox(
  lat: number,
  lng: number,
  box: { north: number; south: number; east: number; west: number }
) {
  return lat <= box.north && lat >= box.south && lng <= box.east && lng >= box.west;
}

function normalizeKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    // ✅ destructure รอบเดียว (ห้ามซ้ำชื่อ)
    const {
      token,
      studentId,
      fullName,
      year,
      classGroup,
      major,
      faculty,
      email,
      phone,
      lat,
      lng,
    } = parsed.data;

    await connectDB();

    const event: any = await Event.findOne({ qrToken: token, isActive: true }).lean();
    if (!event) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    const now = new Date();
    const startAt = new Date(event.startAt);
    const endAt = new Date(event.endAt);
    if (now < startAt || now > endAt) {
      return NextResponse.json(
        {
          ok: false,
          error: "out_of_time",
          message: "ยังไม่ถึงเวลาเช็คชื่อ หรือหมดเวลาแล้ว",
          window: { startAt: event.startAt, endAt: event.endAt },
        },
        { status: 400 }
      );
    }

    // --------- ✅ Geofence + distance ----------
    let distanceMeters = 0;

    const hasBox =
      event.geoBox &&
      typeof event.geoBox.north === "number" &&
      typeof event.geoBox.south === "number" &&
      typeof event.geoBox.east === "number" &&
      typeof event.geoBox.west === "number";

    if (hasBox) {
      const box = event.geoBox as { north: number; south: number; east: number; west: number };

      const centerLat = (box.north + box.south) / 2;
      const centerLng = (box.east + box.west) / 2;
      distanceMeters = Math.round(haversineMeters(lat, lng, centerLat, centerLng));

      if (!isPointInBox(lat, lng, box)) {
        return NextResponse.json(
          { ok: false, error: "outside_box", message: "อยู่นอกพื้นที่กิจกรรม", distanceMeters, geoBox: box },
          { status: 400 }
        );
      }
    } else {
      const { latitude, longitude, radiusMeters } = event;
      if (typeof latitude !== "number" || typeof longitude !== "number" || typeof radiusMeters !== "number") {
        return NextResponse.json(
          { ok: false, error: "event_geofence_not_configured", message: "กิจกรรมยังไม่ได้ตั้งค่าพื้นที่" },
          { status: 500 }
        );
      }

      const d = haversineMeters(lat, lng, latitude, longitude);
      distanceMeters = Math.round(d);

      if (d > radiusMeters) {
        return NextResponse.json(
          { ok: false, error: "outside_radius", message: "อยู่นอกพื้นที่กิจกรรม", distanceMeters, radiusMeters },
          { status: 400 }
        );
      }
    }

    // --------- ✅ กันซ้ำ ----------
    // แนะนำให้กันซ้ำด้วย eventId + studentId (ชัดสุด)
    const uniqueKey = `${String(event._id)}::${normalizeKey(studentId)}`;

    const existed = await Checkin.findOne({ "participant.uniqueKey": uniqueKey }).select("_id").lean();
    if (existed) {
      return NextResponse.json({ ok: false, error: "already_checked_in", message: "เช็คชื่อซ้ำ" }, { status: 409 });
    }

    await Checkin.create({
      eventId: event._id,
      participant: {
        uniqueKey,
        studentId: studentId.trim(),
        fullName: fullName.trim(),
        year: year.trim(),
        classGroup: classGroup.trim(),
        major: major.trim(),
        faculty: faculty.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
      studentLat: lat,
      studentLng: lng,
      distanceMeters,
      status: "passed",
      reason: "",
    });

    return NextResponse.json({
      ok: true,
      message: "เช็คชื่อสำเร็จ ✅",
      distanceMeters,
      eventTitle: event.title,
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.includes("E11000")) {
      return NextResponse.json({ ok: false, error: "already_checked_in", message: "เช็คชื่อซ้ำ" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}