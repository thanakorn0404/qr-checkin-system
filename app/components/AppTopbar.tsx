// app/components/AppTopbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { theme } from "@/app/ui";

export default function AppTopbar({
  title,
  subtitle,
  right,
  backTo,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  backTo?: string; // ถ้าต้องการปุ่มย้อนกลับ
}) {
  const router = useRouter();

  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div>
        <div className={theme.h1}>{title}</div>
        {subtitle ? <div className={theme.sub + " mt-1"}>{subtitle}</div> : null}
      </div>

      <div className="flex items-center gap-2">
        {backTo ? (
          <button
            onClick={() => router.push(backTo)}
            className={`${theme.btn} ${theme.btnGhost}`}
          >
            กลับ
          </button>
        ) : null}
        {right}
      </div>
    </div>
  );
}