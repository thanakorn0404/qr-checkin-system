// app/api/checkin/route.ts
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

  // ✅ บน prod บางที client ส่งมาเป็น string ได้ ให้ coerce เป็น number
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

function normalizeKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  // ✅ Decimal128 ของ MongoDB
  if (typeof v === "object" && typeof v?.toString === "function") {
    const n = Number(v.toString());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isPointInBox(
  lat: number,
  lng: number,
  box: { north: number; south: number; east: number; west: number }
) {
  return lat <= box.north && lat >= box.south && lng <= box.east && lng >= box.west;
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

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

    // ✅ เวลา
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

    // ✅ Geofence
    let distanceMeters = 0;

    const bn = toNum(event?.geoBox?.north);
    const bs = toNum(event?.geoBox?.south);
    const be = toNum(event?.geoBox?.east);
    const bw = toNum(event?.geoBox?.west);

    const hasBox =
      bn !== null && bs !== null && be !== null && bw !== null &&
      Number.isFinite(bn) && Number.isFinite(bs) && Number.isFinite(be) && Number.isFinite(bw);

    if (hasBox) {
      const box = { north: bn!, south: bs!, east: be!, west: bw! };

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
      // ✅ fallback radius
      const latitude = toNum(event?.latitude);
      const longitude = toNum(event?.longitude);
      const radiusMeters = toNum(event?.radiusMeters);

      if (latitude === null || longitude === null || radiusMeters === null) {
        return NextResponse.json(
          {
            ok: false,
            error: "event_geofence_not_configured",
            message: "กิจกรรมยังไม่ได้ตั้งค่าพื้นที่ (ไม่มี geoBox หรือ radius)",
          },
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

    // ✅ กันซ้ำ
    const uniqueKey = `${String(event._id)}::${normalizeKey(studentId)}`;

    // กันซ้ำเร็ว ๆ
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
    // ✅ บน prod ให้ส่งข้อความพอใช้ debug
    return NextResponse.json({ ok: false, error: "server_error", message: msg }, { status: 500 });
  }
}