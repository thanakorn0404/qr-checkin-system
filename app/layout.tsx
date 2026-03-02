// app/layout.tsx
import "./globals.css";
import { theme } from "./ui";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={theme.page}>{children}</body>
    </html>
  );
}