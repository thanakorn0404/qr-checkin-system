import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";

export const runtime = "nodejs";          // ✅ สำคัญ: กัน ExcelJS พังบน Edge
export const dynamic = "force-dynamic";   // ✅ กัน cache ตอน export

type Ctx = { params: { id: string } } | { params: Promise<{ id: string }> };

function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "event";
}

export async function GET(_req: Request, context: Ctx) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // ✅ รองรับทั้ง params เป็น object และ Promise
    const { id } =
      "then" in (context as any).params ? await (context as any).params : (context as any).params;

    await connectDB();

    const event = await Event.findById(id).lean();
    if (!event) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    // (optional) organizer เห็นเฉพาะงานตัวเอง
    if (auth.role === "organizer") {
      const createdBy = (event as any).createdBy ? String((event as any).createdBy) : null;
      if (createdBy && createdBy !== auth.userId) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    const rows = await Checkin.find({ eventId: (event as any)._id })
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
      // ✅ ไฟล์ยังต้องดาวน์โหลดได้ (ไม่คืน server_error)
      ws.addRow({ fullName: "ไม่มีผู้เข้าร่วมกิจกรรม" });
    } else {
      rows.forEach((c: any, idx: number) => {
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
          checkedInAt: c.createdAt ? new Date(c.createdAt).toLocaleString() : "",
          distanceMeters: typeof c.distanceMeters === "number" ? c.distanceMeters : "",
          status: c.status || "",
        });
      });
    }

    const fileName = `participants_${safeFileName(String((event as any).title || "event"))}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
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
    if (msg === "unauthorized") return NextResponse.json({ ok: false }, { status: 401 });

    // ✅ ช่วย debug ให้เห็นใน terminal
    console.error("[EXPORT_ERROR]", e);

    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}