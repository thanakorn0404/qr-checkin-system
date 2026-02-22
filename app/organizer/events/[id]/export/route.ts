import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";
import { User } from "@/models/User";
import ExcelJS from "exceljs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "admin" && auth.role !== "organizer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await connectDB();

    const event = await Event.findById(params.id).lean();
    if (!event) return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });

    // ดึง checkin ทั้งหมดของ event นี้
    const checkins = await Checkin.find({ eventId: event._id })
      .select("userId createdAt studentLat studentLng distanceMeters status reason")
      .sort({ createdAt: 1 })
      .lean();

    const userIds = checkins.map((c: any) => c.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select("studentId username name role")
      .lean();

    const userMap = new Map<string, any>(users.map((u: any) => [String(u._id), u]));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("participants");

    ws.columns = [
      { header: "ลำดับ", key: "no", width: 8 },
      { header: "รหัสนักศึกษา", key: "studentId", width: 16 },
      { header: "ชื่อ", key: "name", width: 26 },
      { header: "Username", key: "username", width: 18 },
      { header: "Role", key: "role", width: 12 },
      { header: "เวลาเช็คชื่อ", key: "checkedAt", width: 22 },
      { header: "ระยะทาง(เมตร)", key: "distance", width: 14 },
      { header: "สถานะ", key: "status", width: 12 },
      { header: "เหตุผล", key: "reason", width: 24 },
    ];

    checkins.forEach((c: any, idx: number) => {
      const u = userMap.get(String(c.userId));
      ws.addRow({
        no: idx + 1,
        studentId: u?.studentId || "",
        name: u?.name || "",
        username: u?.username || "",
        role: u?.role || "",
        checkedAt: new Date(c.createdAt).toLocaleString(),
        distance: c.distanceMeters ?? "",
        status: c.status || "",
        reason: c.reason || "",
      });
    });

    ws.getRow(1).font = { bold: true };

    const buf = await wb.xlsx.writeBuffer();

    const filename = `event_${String(event._id)}_participants.xlsx`;

    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized") return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
