import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

function normKey(s: string) {
  return String(s || "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());

    // อ่าน workbook
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ ok: false, error: "empty_file" }, { status: 400 });
    }

    const ws = wb.Sheets[sheetName];

    // แปลงเป็น JSON โดยให้ row แรกเป็น header
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "empty_rows" }, { status: 400 });
    }

    // หา key ให้รองรับ studentId/studentid และ name
    const sample = rows[0] || {};
    const keys = Object.keys(sample);
    const studentKey = keys.find((k) => normKey(k) === "studentid");
    const nameKey = keys.find((k) => normKey(k) === "name");

    if (!studentKey || !nameKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_columns",
          message: "ไฟล์ต้องมีคอลัมน์ studentId และ name",
          columns: keys,
        },
        { status: 400 }
      );
    }

    // เตรียม bulk upsert
    const ops: any[] = [];
    const badRows: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const studentId = String(r[studentKey] || "").trim();
      const name = String(r[nameKey] || "").trim();

      if (!studentId || !name) {
        badRows.push({ row: i + 2, studentId, name }); // +2 เพราะ header = row 1
        continue;
      }

      // แนวทาง: ให้ username = studentId เพื่อ login ง่าย
      // passwordHash: คุณทำไว้แบบ seed แล้ว (admin1234/staff1234/ฯลฯ)
      // สำหรับนักศึกษา demo: ตั้ง password เริ่มต้น = studentId (แล้วค่อยให้เปลี่ยนภายหลัง)
      // ⚠️ ต้องให้ schema User รองรับ passwordHash จริง (hash เองใน seed / หรือมี helper hash)
      // ตรงนี้จะ "ไม่ hash" เพื่อไม่ชนของเดิมในโปรเจกต์คุณ
      // แนะนำ: ทำฟังก์ชัน hashPassword แล้วใส่แทน

      ops.push({
        updateOne: {
          filter: { studentId, role: "student" },
          update: {
            $set: {
              name,
              isActive: true,
              username: studentId,
            },
            $setOnInsert: {
              role: "student",
              // ใส่ passwordHash ตามระบบคุณ (ถ้าคุณใช้ bcryptjs ให้ hash ก่อน)
              passwordHash: studentId, // DEMO: เปลี่ยนเป็น hash ในโปรด
            },
          },
          upsert: true,
        },
      });
    }

    await connectDB();

    let result = { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    if (ops.length) {
      const r = await User.bulkWrite(ops, { ordered: false });
      result = {
        matchedCount: r.matchedCount || 0,
        modifiedCount: r.modifiedCount || 0,
        upsertedCount: r.upsertedCount || 0,
      };
    }

    return NextResponse.json({
      ok: true,
      imported: ops.length,
      skipped: badRows.length,
      badRows,
      result,
    });
  } catch (e: any) {
    console.error("IMPORT_STUDENTS_ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: String(e?.message || "") },
      { status: 500 }
    );
  }
}
