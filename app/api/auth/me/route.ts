import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";

export async function GET() {
  try {
    const auth = await requireAuth(); // ✅ ต้อง await

    await connectDB();
    const user = await User.findById(auth.userId)
      .select("username studentId name role isActive")
      .lean();

    if (!user || !user.isActive) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        role: user.role,
        username: user.username || "",
        studentId: user.studentId || "",
        name: user.name || "",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
}
