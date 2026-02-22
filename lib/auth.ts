import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export type AuthPayload = {
  userId: string;
  role: "student" | "organizer" | "admin";
  username?: string;
  studentId?: string;
};

export function signAuthToken(payload: AuthPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

// ✅ Next 16: cookies() ต้อง await
export async function requireAuth(): Promise<AuthPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) throw new Error("unauthorized");

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("unauthorized");

  try {
    return jwt.verify(token, secret) as AuthPayload;
  } catch {
    throw new Error("unauthorized");
  }
}
