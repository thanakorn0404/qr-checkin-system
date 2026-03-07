import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(s: string | null, endOfDay = false) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);

  return d;
}

function getStatus(e: any, now: Date) {
  const start = new Date(e.startAt);
  const end = new Date(e.endAt);

  if (e.isActive === false) return "inactive";
  if (end < now) return "completed";
  if (start > now) return "upcoming";
  return "ongoing";
}

function statusLabel(status: string) {
  if (status === "completed") return "จัดแล้ว";
  if (status === "ongoing") return "กำลังจัด";
  if (status === "upcoming") return "ยังไม่จัด";
  if (status === "inactive") return "ปิดใช้งาน";
  return "ไม่ทราบสถานะ";
}

function safeFileName(name: string) {
  return String(name || "report")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"), true);
    const filterStatus = String(searchParams.get("status") || "all");
    const exportMode = searchParams.get("export") === "xlsx";

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: "invalid_date_range" }, { status: 400 });
    }

    const now = new Date();

    const events = await Event.find({
      startAt: { $lte: to },
      endAt: { $gte: from },
    })
      .sort({ startAt: 1 })
      .lean();

    const eventIds = events.map((e: any) => e._id);

    const counts = await Checkin.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: "$eventId", checkinCount: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>(
      counts.map((c: any) => [String(c._id), c.checkinCount])
    );

    let items = events.map((e: any) => {
      const status = getStatus(e, now);
      return {
        id: String(e._id),
        title: e.title || "",
        description: e.description || "",
        locationName: e.locationName || "",
        startAt: e.startAt,
        endAt: e.endAt,
        isActive: !!e.isActive,
        status,
        checkinCount: countMap.get(String(e._id)) ?? 0,
      };
    });

    if (filterStatus !== "all") {
      items = items.filter((x) => x.status === filterStatus);
    }

    const summary = {
      total: items.length,
      completed: items.filter((x) => x.status === "completed").length,
      ongoing: items.filter((x) => x.status === "ongoing").length,
      upcoming: items.filter((x) => x.status === "upcoming").length,
      inactive: items.filter((x) => x.status === "inactive").length,
      totalCheckins: items.reduce((sum, x) => sum + x.checkinCount, 0),
    };

    // ✅ สรุปรายเดือนสำหรับกราฟ
    const monthMap = new Map<
      string,
      {
        month: string;
        totalEvents: number;
        totalCheckins: number;
      }
    >();

    items.forEach((e) => {
      const d = new Date(e.startAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: key,
          totalEvents: 0,
          totalCheckins: 0,
        });
      }

      const row = monthMap.get(key)!;
      row.totalEvents += 1;
      row.totalCheckins += e.checkinCount;
    });

    const chart = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // ✅ export xlsx
    if (exportMode) {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("report");

      ws.columns = [
        { header: "No", key: "no", width: 6 },
        { header: "ชื่อกิจกรรม", key: "title", width: 30 },
        { header: "สถานที่", key: "locationName", width: 24 },
        { header: "วันเริ่ม", key: "startAt", width: 24 },
        { header: "วันสิ้นสุด", key: "endAt", width: 24 },
        { header: "สถานะ", key: "status", width: 16 },
        { header: "จำนวนผู้เช็คชื่อ", key: "checkinCount", width: 18 },
      ];

      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: "frozen", ySplit: 1 }];

      items.forEach((e, idx) => {
        ws.addRow({
          no: idx + 1,
          title: e.title,
          locationName: e.locationName || "-",
          startAt: new Date(e.startAt).toLocaleString("th-TH"),
          endAt: new Date(e.endAt).toLocaleString("th-TH"),
          status: statusLabel(e.status),
          checkinCount: e.checkinCount,
        });
      });

      const filename = safeFileName(
        `event_report_${searchParams.get("from") || ""}_${searchParams.get("to") || ""}.xlsx`
      );

      const buffer = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      range: { from, to },
      summary,
      chart,
      items,
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "server_error", message: msg },
      { status: 500 }
    );
  }
}