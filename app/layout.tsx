// app/layout.tsx
import "./globals.css";
import IdlePing from "./components/IdlePing";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 text-slate-900">
        <IdlePing idleMs={3 * 60 * 1000} minPingIntervalMs={25 * 1000} excludePrefixes={["/login"]} />
        {children}
      </body>
    </html>
  );
}