import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { connectDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";

const BodySchema = z.object({
  id: z.string().min(10),
  role: z.enum(["student", "organizer", "admin"]).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(6).max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = requireAuth();
    if (auth.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    await connectDB();

    const { id, role, isActive, newPassword } = parsed.data;

    const $set: any = {};
    if (role) $set.role = role;
    if (typeof isActive === "boolean") $set.isActive = isActive;
    if (newPassword) $set.passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await User.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
