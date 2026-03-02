// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import StudentNav from "./StudentNav";
import StudentTopbar from "./StudentTopbar";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-sky-100 text-slate-800">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <aside className="lg:sticky lg:top-4 h-fit">
            <StudentNav />
          </aside>

          <main className="min-w-0">
            <StudentTopbar />
            <div className="mt-4">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}