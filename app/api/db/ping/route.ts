import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import mongoose from "mongoose";

export async function GET() {
  await connectDB();
  const state = mongoose.connection.readyState; // 1 = connected
  return NextResponse.json({ ok: true, readyState: state });
}
