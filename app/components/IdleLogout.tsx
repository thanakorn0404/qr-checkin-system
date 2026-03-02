"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  /** นาทีที่ปล่อยว่างก่อน logout (default 3 นาที) */
  idleMs?: number;
  /** ไม่ทำงานใน path เหล่านี้ เช่น login */
  excludePrefixes?: string[];
};

export default function IdleLogout({
  idleMs = 3 * 60 * 1000,
  excludePrefixes = ["/login"],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<number | null>(null);
  const lastPathRef = useRef<string>("");

  const isExcluded = excludePrefixes.some((p) => pathname.startsWith(p));

  async function doLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ไม่ต้องทำอะไร แค่พาไปหน้า login
    }

    const next = encodeURIComponent(lastPathRef.current || "/dashboard");
    router.replace(`/login?next=${next}`);
  }

  function resetTimer() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(doLogout, idleMs);
  }

  useEffect(() => {
    if (isExcluded) return;

    // เก็บ path ล่าสุดไว้ใช้เป็น next=
    lastPathRef.current = pathname;

    // events ที่ถือว่า "มีการใช้งาน"
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const onActivity = () => resetTimer();

    // เริ่มนับทันที
    resetTimer();

    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    const onVisibility = () => {
      // กลับมาหน้าเดิมก็รีเซ็ต
      if (!document.hidden) resetTimer();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, onActivity as any));
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isExcluded, idleMs]);

  return null;
}