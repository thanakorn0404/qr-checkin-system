import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";

const BodySchema = z.object({
  username: z.string().min(3).max(30).optional(),
  studentId: z.string().min(3).max(30).optional(),
  name: z.string().min(2).max(120),
  password: z.string().min(6).max(100),
  role: z.enum(["student", "organizer", "admin"]),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const { username, studentId, name, password, role } = parsed.data;

    // ✅ ต้องมีอย่างน้อย 1 อย่าง: username หรือ studentId
    if (!username && !studentId) {
      return NextResponse.json({ ok: false, error: "missing_identity" }, { status: 400 });
    }

    await connectDB();

    // กันซ้ำ
    if (username) {
      const exists = await User.findOne({ username }).lean();
      if (exists) return NextResponse.json({ ok: false, error: "username_taken" }, { status: 409 });
    }
    if (studentId) {
      const exists2 = await User.findOne({ studentId, role: "student" }).lean();
      if (exists2) return NextResponse.json({ ok: false, error: "studentId_taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await User.create({
      username: username || undefined,
      studentId: studentId || undefined,
      name,
      passwordHash,
      role,
      isActive: true,
    });

    return NextResponse.json({ ok: true, id: String(created._id) });
  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
