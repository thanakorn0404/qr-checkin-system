import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";

const BodySchema = z.object({
  username: z.string().min(3).max(30),
  name: z.string().min(2).max(120),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  await connectDB();

  const count = await User.countDocuments({});
  if (count > 0) {
    return NextResponse.json(
      { ok: false, error: "already_initialized", message: "ระบบมีผู้ใช้อยู่แล้ว" },
      { status: 403 }
    );
  }

  const { username, name, password } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    username,
    name,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  return NextResponse.json({ ok: true, message: "สร้างแอดมินคนแรกสำเร็จ ✅" });
}
