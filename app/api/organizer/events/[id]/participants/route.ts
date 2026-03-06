import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAuth();

    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;

    await connectDB();

    const event = await Event.findById(id).lean();
    if (!event) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    // organizer เห็นเฉพาะงานตัวเอง
    if (auth.role === "organizer") {
      const createdBy = (event as any).createdBy ? String((event as any).createdBy) : null;
      if (createdBy && createdBy !== String(auth.userId)) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    const rows = await Checkin.find({ eventId: (event as any)._id })
      .sort({ createdAt: 1 })
      .lean();

    const items = rows.map((c: any) => {
      const p = c.participant || {};
      return {
        id: String(c._id),
        checkedInAt: c.createdAt || null,
        createdAt: c.createdAt || null,
        status: c.status || "",
        distanceMeters: typeof c.distanceMeters === "number" ? c.distanceMeters : null,
        participant: {
          studentId: p.studentId || "",
          fullName: p.fullName || "",
          year: p.year || "",
          classGroup: p.classGroup || "",
          major: p.major || "",
          faculty: p.faculty || "",
          email: p.email || "",
          phone: p.phone || "",
        },
      };
    });

    return NextResponse.json({
      ok: true,
      event: {
        id: String((event as any)._id),
        title: (event as any).title || "",
      },
      items,
      count: items.length,
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    console.error("[PARTICIPANTS_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: msg },
      { status: 500 }
    );
  }
}