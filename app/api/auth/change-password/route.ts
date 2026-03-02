import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { User } from "@/models/User";

const BodySchema = z.object({
  currentPassword: z.string().min(4).max(200),
  newPassword: z.string().min(4).max(200),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(); // ต้อง login ก่อน
    const json = await req.json().catch(() => null);

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    if (currentPassword === newPassword) {
      return NextResponse.json({ ok: false, error: "same_password" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(auth.userId).select("_id passwordHash mustChangePassword").lean();
    if (!user) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const ok = await bcrypt.compare(currentPassword, (user as any).passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "invalid_current_password" }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { _id: auth.userId },
      {
        $set: {
          passwordHash,
          mustChangePassword: false, // ✅ เปลี่ยนแล้ว ปลดล็อก
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "unauthorized") return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}