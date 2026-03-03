// app/api/events/create/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";

const BoxSchema = z.object({
  north: z.coerce.number(),
  south: z.coerce.number(),
  east: z.coerce.number(),
  west: z.coerce.number(),
});

// datetime-local: 2026-03-02T23:00 หรือ 2026-03-02T23:00:00
const DateTimeLocalRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const DateTimeAnySchema = z
  .string()
  .refine(
    (v) => DateTimeLocalRe.test(v) || !Number.isNaN(new Date(v).getTime()),
    "invalid datetime"
  );

const BodySchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().default(""),

  locationName: z.string().max(200).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
  isActive: z.boolean().optional().default(true),

  geoBox: BoxSchema,

  startAt: DateTimeAnySchema,
  endAt: DateTimeAnySchema,
});

// แปลงเวลา:
// - ถ้า datetime-local => บังคับ +07:00 (Bangkok)
// - ถ้า ISO (มี Z หรือมี timezone) => ใช้ Date ปกติ
function parseEventTime(v: string) {
  if (DateTimeLocalRe.test(v)) {
    const withSeconds = v.length === 16 ? `${v}:00` : v; // เติม :00 ถ้าไม่มีวินาที
    return new Date(`${withSeconds}+07:00`);
  }
  return new Date(v);
}

export async function POST(req: Request) {
  // ต้อง login และเป็น admin/organizer เท่านั้น
  let auth: any;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (auth.role !== "admin" && auth.role !== "organizer") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    // ✅ ช่วย debug: ดูว่า field ไหนผิด (อยากปิดทีหลังค่อยลบ detail)
    return NextResponse.json(
      { ok: false, error: "invalid_payload", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, locationName, notes, isActive, geoBox, startAt, endAt } = parsed.data;

  const s = parseEventTime(startAt);
  const e = parseEventTime(endAt);

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s >= e) {
    return NextResponse.json({ ok: false, error: "invalid_time" }, { status: 400 });
  }

  await connectDB();

  const qrToken = crypto.randomBytes(16).toString("hex");

  const created = await Event.create({
    title,
    description,
    locationName,
    notes,
    isActive,
    geoBox,
    startAt: s,
    endAt: e,
    qrToken,
    createdBy: auth.userId,
  });

  return NextResponse.json({
    ok: true,
    event: {
      id: String(created._id),
      qrToken,
    },
  });
}