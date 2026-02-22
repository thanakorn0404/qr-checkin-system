import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { User } from "@/models/User";

const BodySchema = z.object({
  newPassword: z.string().min(6).max(200),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    await connectDB();

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

    await User.updateOne(
      { _id: auth.userId },
      { $set: { passwordHash, mustChangePassword: false } }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized") return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}