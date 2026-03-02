import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  // ลบ JWT
  res.cookies.set({
    ...base,
    name: "auth_token",
    value: "",
    maxAge: 0,
  });

  // ✅ ลบ last_active ด้วย
  res.cookies.set({
    ...base,
    name: "last_active",
    value: "",
    maxAge: 0,
  });

  return res;
}