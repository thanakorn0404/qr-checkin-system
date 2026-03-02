"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  /** timeout ที่ฝั่ง server ใช้ (ไว้คุม UI) */
  idleMs?: number; // default 3 นาที
  /** ping ถี่สุดเท่าไหร่ตอนมี activity (กันยิงถี่) */
  minPingIntervalMs?: number; // default 25 วิ
  /** ไม่ทำงานใน path พวกนี้ */
  excludePrefixes?: string[];
};

export default function IdlePing({
  idleMs = 3 * 60 * 1000,
  minPingIntervalMs = 25 * 1000,
  excludePrefixes = ["/login"],
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const lastActivityRef = useRef<number>(Date.now());
  const lastPingRef = useRef<number>(0);
  const loopRef = useRef<number | null>(null);

  const excluded = excludePrefixes.some((p) => pathname.startsWith(p));

  async function ping() {
    try {
      const res = await fetch("/api/auth/ping", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (res.status === 401) {
        // หมดเวลาแล้ว → เด้งไป login
        const next = encodeURIComponent(pathname || "/dashboard");
        router.replace(`/login?next=${next}`);
      }
    } catch {
      // network fail: ไม่ต้องทำอะไร
    }
  }

  function markActivity() {
    lastActivityRef.current = Date.now();

    // กัน ping ถี่เกินไป
    const now = Date.now();
    if (now - lastPingRef.current >= minPingIntervalMs) {
      lastPingRef.current = now;
      ping();
    }
  }

  useEffect(() => {
    if (excluded) return;

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const onActivity = () => markActivity();
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    const onVisibility = () => {
      if (!document.hidden) markActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // loop คอยเช็คว่าถ้าไม่มี activity เกิน idleMs ให้เด้ง
    loopRef.current = window.setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > idleMs) {
        const next = encodeURIComponent(pathname || "/dashboard");
        router.replace(`/login?next=${next}`);
      }
    }, 1000);

    // เริ่มต้น ping 1 ครั้งเมื่อเข้า page
    markActivity();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity as any));
      document.removeEventListener("visibilitychange", onVisibility);
      if (loopRef.current) window.clearInterval(loopRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excluded, pathname, idleMs, minPingIntervalMs]);

  return null;
}