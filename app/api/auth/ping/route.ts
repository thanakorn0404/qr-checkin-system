import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth(); // ✅ จะเช็ค idle + touch last_active ให้เอง
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // ถ้าหมดเวลา/unauthorized
    return NextResponse.json({ ok: false, error: e?.message || "unauthorized" }, { status: 401 });
  }
}