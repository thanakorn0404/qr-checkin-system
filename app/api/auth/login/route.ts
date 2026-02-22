import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { signAuthToken } from "@/lib/auth";

const BodySchema = z.object({
  username: z.string().min(2).max(60),
  password: z.string().min(4).max(200),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const { username, password } = parsed.data;

  await connectDB();
  const user = await User.findOne({ username, isActive: true }).lean();

  if (!user) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const token = signAuthToken({
    userId: String(user._id),
    role: user.role,
    username: user.username || "",
    studentId: user.studentId || "",
  });

  // ✅ set cookie
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
});

  return NextResponse.json({
  ok: true,
  user: {
    id: String(user._id),
    username: user.username,
    role: user.role,
    name: user.name,
    mustChangePassword: !!user.mustChangePassword,
  },
});
}
