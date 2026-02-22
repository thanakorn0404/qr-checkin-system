import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";

type Row = { studentId: string; name: string };

function normalizeStudentId(v: any) {
  return String(v ?? "").trim();
}
function normalizeName(v: any) {
  return String(v ?? "").trim();
}

function parseRowsFromBuffer(buffer: Buffer, filename: string): Row[] {
  const lower = filename.toLowerCase();

  // ---- CSV ----
  if (lower.endsWith(".csv")) {
    const text = buffer.toString("utf8");
    const wb = XLSX.read(text, { type: "string" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

    return json
      .map((r) => ({
        studentId: normalizeStudentId(r.studentId ?? r.StudentId ?? r.STUDENTID),
        name: normalizeName(r.name ?? r.Name ?? r.NAME),
      }))
      .filter((r) => r.studentId);
  }

  // ---- XLSX/XLS ----
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

  return json
    .map((r) => ({
      studentId: normalizeStudentId(r.studentId ?? r.StudentId ?? r.STUDENTID),
      name: normalizeName(r.name ?? r.Name ?? r.NAME),
    }))
    .filter((r) => r.studentId);
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await connectDB();

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });

    const file = form.get("file") as File | null;
    const resetPassword = String(form.get("resetPassword") ?? "0") === "1"; // ตัวเลือก

    if (!file) return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });

    const filename = file.name || "upload.xlsx";
    const arr = await file.arrayBuffer();
    const buffer = Buffer.from(arr);

    const rows = parseRowsFromBuffer(buffer, filename);
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "no_rows" }, { status: 400 });
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const r of rows) {
      const studentId = normalizeStudentId(r.studentId);
      const name = normalizeName(r.name);

      if (!studentId || !name) {
        skipped++;
        continue;
      }

      const username = studentId;
      const initialPassword = studentId;

      const existed = await User.findOne({ username }).select("_id").lean();

      // ถ้า "resetPassword=1" → ตั้งรหัสใหม่ด้วย studentId
      const setPassword: any = {};
      if (!existed || resetPassword) {
        const passwordHash = await bcrypt.hash(initialPassword, 10);
        setPassword.passwordHash = passwordHash;
        setPassword.mustChangePassword = true;
      }

      await User.updateOne(
        { username },
        {
          $set: {
            username,
            studentId,
            name,
            role: "student",
            isActive: true,
            ...setPassword,
          },
          $setOnInsert: {
            // ถ้า insert ใหม่แน่ ๆ แต่เราจัดการแล้วด้านบน
          },
        },
        { upsert: true }
      );

      if (existed) updated++;
      else inserted++;
    }

    return NextResponse.json({ ok: true, inserted, updated, skipped });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}