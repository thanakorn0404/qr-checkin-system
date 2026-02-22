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

const BodySchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().default(""),

  // ✅ เพิ่ม
  locationName: z.string().max(200).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
  isActive: z.boolean().optional().default(true),

  geoBox: BoxSchema, // ✅ ใช้ geoBox เป็นหลัก

  startAt: z.string(),
  endAt: z.string(),
});

export async function POST(req: Request) {
  // ✅ ต้อง login และเป็น admin/organizer เท่านั้น
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

  const s = new Date(startAt);
  const e = new Date(endAt);
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
    createdBy: auth.userId, // ✅ เซ็ตอัตโนมัติจากคนล็อกอิน
  });

  return NextResponse.json({
    ok: true,
    event: {
      id: String(created._id),
      qrToken,
    },
  });
}
