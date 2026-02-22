import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

/* ------------------ schema ------------------ */

const BoxSchema = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
}).partial();

const PatchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  locationName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  geoBox: BoxSchema.optional(),
});

/* ================== PATCH ================== */

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const d = parsed.data;
    const patch: any = {};

    if (d.title !== undefined) patch.title = d.title.trim();
    if (d.description !== undefined) patch.description = d.description.trim();
    if (d.locationName !== undefined) patch.locationName = d.locationName.trim();
    if (d.notes !== undefined) patch.notes = d.notes.trim();
    if (d.isActive !== undefined) patch.isActive = d.isActive;

    if (d.startAt) {
      const s = new Date(d.startAt);
      if (Number.isNaN(s.getTime())) {
        return NextResponse.json({ ok: false, error: "invalid_time" }, { status: 400 });
      }
      patch.startAt = s;
    }

    if (d.endAt) {
      const e = new Date(d.endAt);
      if (Number.isNaN(e.getTime())) {
        return NextResponse.json({ ok: false, error: "invalid_time" }, { status: 400 });
      }
      patch.endAt = e;
    }

    if (patch.startAt && patch.endAt && patch.startAt >= patch.endAt) {
      return NextResponse.json({ ok: false, error: "invalid_time" }, { status: 400 });
    }

    if (d.geoBox) patch.geoBox = d.geoBox;

    /* --- update --- */
    const updated = await Event.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, event: { id: String(updated._id) } });

  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/* ================== DELETE ================== */

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    await Event.deleteOne({ _id: existed._id });

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
