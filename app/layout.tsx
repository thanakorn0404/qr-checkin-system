// app/layout.tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}