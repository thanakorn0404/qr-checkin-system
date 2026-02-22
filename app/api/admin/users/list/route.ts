import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const auth = requireAuth();
    if (auth.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await connectDB();

    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select("username studentId name role isActive createdAt")
      .lean();

    return NextResponse.json({
      ok: true,
      items: users.map((u: any) => ({
        id: String(u._id),
        username: u.username || "",
        studentId: u.studentId || "",
        name: u.name,
        role: u.role,
        isActive: !!u.isActive,
        createdAt: u.createdAt,
      })),
    });
  } catch (e: any) {
    if (String(e?.message) === "unauthorized") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
