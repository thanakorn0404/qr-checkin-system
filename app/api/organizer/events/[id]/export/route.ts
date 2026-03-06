import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function safeFileName(name: string) {
  return String(name || "event")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 60) || "event";
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAuth();

    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;

    await connectDB();

    const event: any = await Event.findById(id).lean();
    if (!event) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    if (auth.role === "organizer") {
      const createdBy = event.createdBy ? String(event.createdBy) : null;
      if (createdBy && createdBy !== String(auth.userId)) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    const rows: any[] = await Checkin.find({ eventId: event._id })
      .sort({ createdAt: 1 })
      .lean();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("participants");

    ws.columns = [
      { header: "No", key: "no", width: 6 },
      { header: "Student ID", key: "studentId", width: 18 },
      { header: "Full Name", key: "fullName", width: 26 },
      { header: "Year", key: "year", width: 10 },
      { header: "Class Group", key: "classGroup", width: 14 },
      { header: "Major", key: "major", width: 22 },
      { header: "Faculty", key: "faculty", width: 22 },
      { header: "Email", key: "email", width: 26 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Checked In At", key: "checkedInAt", width: 22 },
      { header: "Distance (m)", key: "distanceMeters", width: 14 },
      { header: "Status", key: "status", width: 12 },
    ];

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    if (rows.length === 0) {
      ws.addRow({ fullName: "ไม่มีผู้เข้าร่วมกิจกรรม" });
    } else {
      rows.forEach((c, idx) => {
        const p = c.participant || {};
        ws.addRow({
          no: idx + 1,
          studentId: p.studentId || "",
          fullName: p.fullName || "",
          year: p.year || "",
          classGroup: p.classGroup || "",
          major: p.major || "",
          faculty: p.faculty || "",
          email: p.email || "",
          phone: p.phone || "",
          checkedInAt: c.createdAt ? new Date(c.createdAt).toLocaleString("th-TH") : "",
          distanceMeters: typeof c.distanceMeters === "number" ? c.distanceMeters : "",
          status: c.status || "",
        });
      });
    }

    const fileName = `participants_${safeFileName(event.title)}.xlsx`;

    const arrayBuffer = await wb.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    const msg = String(e?.message || "");

    if (msg === "unauthorized") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    console.error("[EXPORT_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: msg },
      { status: 500 }
    );
  }
}