import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isOrganizer = pathname.startsWith("/organizer");
  const isDashboard = pathname.startsWith("/dashboard");

  // ป้องกันเฉพาะ /organizer และ /dashboard
  if (!isOrganizer && !isDashboard) return NextResponse.next();

  const token = req.cookies.get("auth_token")?.value;
  if (!token) return redirectToLogin(req);

  const secret = process.env.JWT_SECRET;
  if (!secret) return redirectToLogin(req);

  try {
    const payload = jwt.verify(token, secret) as any;
    const role = payload?.role as string | undefined;

    // ✅ /organizer/* เข้าได้เฉพาะ admin / organizer
    if (isOrganizer) {
      if (role === "admin" || role === "organizer") return NextResponse.next();
      return redirectToLogin(req);
    }

    // ✅ /dashboard/* เข้าได้เฉพาะ user (และให้ admin/organizer เข้าได้ด้วย)
    // ถ้าระบบคุณใช้ "student" แทน "user" ก็รองรับไว้แล้ว
    if (isDashboard) {
      if (role === "user" || role === "student" || role === "admin" || role === "organizer") {
        return NextResponse.next();
      }
      return redirectToLogin(req);
    }

    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

export const config = {
  matcher: ["/organizer/:path*", "/dashboard/:path*"],
};
