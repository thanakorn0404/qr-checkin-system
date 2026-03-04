// app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

/* ------------------ schema ------------------ */

const BoxSchema = z
  .object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number(),
  })
  .partial();

const PatchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  locationName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  startAt: z.string().optional(), // ISO หรือ datetime-local
  endAt: z.string().optional(), // ISO หรือ datetime-local
  geoBox: BoxSchema.optional(),
});

type Ctx = { params: { id: string } };

/* ------------------ helpers ------------------ */

// ถ้ามี Z หรือ +07:00 -> ถือว่าเป็น ISO มี timezone
function hasTimezone(s: string) {
  return /[zZ]$|[+\-]\d{2}:\d{2}$/.test(s);
}

// รองรับ:
// - ISO (มี timezone): new Date(iso) ได้เลย
// - datetime-local (ไม่มี timezone): ถือว่าเป็นเวลาไทย +07:00
function parseClientDateTime(input: string) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("invalid_time");

  // ISO มี timezone
  if (hasTimezone(raw)) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error("invalid_time");
    return d;
  }

  // datetime-local: "2026-03-03T19:19"
  // ให้ถือว่าเป็นเวลาไทย (+07:00)
  const d = new Date(raw + ":00.000+07:00");
  if (Number.isNaN(d.getTime())) throw new Error("invalid_time");
  return d;
}

/* ================== PATCH ================== */

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = params;

    /* --- auth --- */
    const auth = await requireAuth();
    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    /* --- validate id --- */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }

    /* --- body --- */
    const json = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    await connectDB();

    // ✅ ดึงของเดิมมาก่อน เพื่อ validate เวลาแบบ "แก้บางช่อง"
    const existed = await Event.findById(id).select("startAt endAt").lean();
    if (!existed) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    const d = parsed.data;
    const patch: any = {};

    if (d.title !== undefined) patch.title = d.title.trim();
    if (d.description !== undefined) patch.description = d.description.trim();
    if (d.locationName !== undefined) patch.locationName = d.locationName.trim();
    if (d.notes !== undefined) patch.notes = d.notes.trim();
    if (d.isActive !== undefined) patch.isActive = d.isActive;

    // ✅ parse time แบบกัน timezone เพี้ยน
    let nextStart: Date | null = null;
    let nextEnd: Date | null = null;

    if (d.startAt !== undefined) {
      try {
        nextStart = parseClientDateTime(d.startAt);
        patch.startAt = nextStart;
      } catch {
        return NextResponse.json({ ok: false, error: "invalid_time" }, { status: 400 });
      }
    }

    if (d.endAt !== undefined) {
      try {
        nextEnd = parseClientDateTime(d.endAt);
        patch.endAt = nextEnd;
      } catch {
        return NextResponse.json({ ok: false, error: "invalid_time" }, { status: 400 });
      }
    }

    // ✅ Validate ช่วงเวลาโดยใช้ค่าที่ "จะเป็นจริงหลัง update"
    const finalStart = nextStart ?? new Date((existed as any).startAt);
    const finalEnd = nextEnd ?? new Date((existed as any).endAt);

    if (finalStart >= finalEnd) {
      return NextResponse.json({ ok: false, error: "invalid_time_range" }, { status: 400 });
    }

    if (d.geoBox !== undefined) patch.geoBox = d.geoBox;

    /* --- update --- */
    const updated = await Event.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();

    if (!updated) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      event: { id: String((updated as any)._id) },
    });
  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/* ================== DELETE ================== */

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = params;

    const auth = await requireAuth();
    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }

    await connectDB();

    const existed = await Event.findById(id).select("_id").lean();
    if (!existed) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    await Event.deleteOne({ _id: (existed as any)._id });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}