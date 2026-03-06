import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();

    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { id } = params;

    await connectDB();

    const event: any = await Event.findById(id).lean();

    if (!event) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
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
        checkedInAt: c.createdAt
          ? new Date(c.createdAt).toLocaleString("th-TH")
          : "",
        distanceMeters: c.distanceMeters ?? "",
        status: c.status || "",
      });
    });

    const fileName = `participants_${safeFileName(event.title)}.xlsx`;

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    console.error("EXPORT_ERROR:", e);

    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}