import { connectDB } from "@/lib/db/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  return NextResponse.json({ ok: true, message: "MongoDB connected ✅" });
}
