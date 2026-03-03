import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";

const BoxSchema = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
});

// รับ datetime-local เช่น 2026-03-02T23:00 (หรือมีวินาที)
const DateTimeLocalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "invalid datetime-local");

const BodySchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().default(""),

  locationName: z.string().max(200).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
  isActive: z.boolean().optional().default(true),

  geoBox: BoxSchema,

  startAt: DateTimeLocalSchema,
  endAt: DateTimeLocalSchema,
});

// แปลง datetime-local ให้เป็นเวลาไทย (+07:00) ชัดๆ กัน Vercel(UTC) ทำเวลาเลื่อน
function parseBangkokDatetimeLocal(v: string) {
  const hasSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v);
  const withSeconds = hasSeconds ? v : `${v}:00`;
  return new Date(`${withSeconds}+07:00`);
}

export async function POST(req: Request) {
  let auth;
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
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const { title, description, locationName, notes, isActive, geoBox, startAt, endAt } = parsed.data;

  const s = parseBangkokDatetimeLocal(startAt);
  const e = parseBangkokDatetimeLocal(endAt);

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