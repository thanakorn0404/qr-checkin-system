// app/lib/auth.ts
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export type AuthPayload = {
  userId: string;
  role: "student" | "organizer" | "admin";
  username?: string;
  studentId?: string;
};

const AUTH_COOKIE = "auth_token";
const LAST_ACTIVE_COOKIE = "last_active";
const IDLE_MS = 3 * 60 * 1000; // ✅ 3 นาที

export function signAuthToken(payload: AuthPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function cookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

// เรียกตอน login สำเร็จ: set JWT + set last_active
export async function setAuthCookies(token: string) {
  const cs = await cookies();

  cs.set(AUTH_COOKIE, token, {
    ...cookieBaseOptions(),
    // cookie อยู่ได้นาน แต่ idle จะคุมด้วย last_active
    maxAge: 7 * 24 * 60 * 60,
  });

  cs.set(LAST_ACTIVE_COOKIE, String(Date.now()), {
    ...cookieBaseOptions(),
    maxAge: 7 * 24 * 60 * 60,
  });
}

// เรียกตอน logout: clear cookies
export async function clearAuthCookies() {
  const cs = await cookies();
  cs.set(AUTH_COOKIE, "", { ...cookieBaseOptions(), maxAge: 0 });
  cs.set(LAST_ACTIVE_COOKIE, "", { ...cookieBaseOptions(), maxAge: 0 });
}

// ✅ ตรวจ auth + idle timeout
export async function requireAuth(): Promise<AuthPayload> {
  const cs = await cookies();
  const token = cs.get(AUTH_COOKIE)?.value;
  const lastActiveRaw = cs.get(LAST_ACTIVE_COOKIE)?.value;

  if (!token) throw new Error("unauthorized");

  const now = Date.now();
  let last = lastActiveRaw ? Number(lastActiveRaw) : 0;

  // ถ้าไม่มี/แปลงไม่ได้ → unauthorized
  if (!last || Number.isNaN(last)) {
    await clearAuthCookies();
    throw new Error("unauthorized");
  }

  // ✅ กัน last_active เพี้ยน (อยู่ในอนาคตไกลเกินไป) → รีเซ็ตให้เป็นตอนนี้
  // (เช่น clock เพี้ยน, เขียนค่าไม่ถูก, restore cookie เก่า)
  if (last > now + 60_000) {
    last = now;
  }

  // ✅ idle timeout
  if (now - last > IDLE_MS) {
    await clearAuthCookies();
    throw new Error("idle_timeout");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("unauthorized");

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;

    // ✅ touch: อัปเดต last_active ทุกครั้งที่เรียก API ที่ผ่าน requireAuth
    cs.set(LAST_ACTIVE_COOKIE, String(Date.now()), {
      ...cookieBaseOptions(),
      maxAge: 7 * 24 * 60 * 60,
    });

    return payload;
  } catch {
    await clearAuthCookies();
    throw new Error("unauthorized");
  }
}