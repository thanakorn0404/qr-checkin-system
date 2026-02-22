import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies(); // ✅ Next 16
  const token = cookieStore.get("auth_token")?.value || null;
  return NextResponse.json({ ok: true, hasAuthToken: Boolean(token) });
}
