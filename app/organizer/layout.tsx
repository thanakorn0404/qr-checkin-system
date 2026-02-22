import type { ReactNode } from "react";
import OrganizerNav from "./OrganizerNav";

export default function OrganizerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <OrganizerNav />
      <div className="p-4 flex justify-center">
        <div className="w-full max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
