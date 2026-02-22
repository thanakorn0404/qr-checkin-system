"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Toast = { type: "success" | "error"; text: string } | null;

export default function AdminImportStudentsPage() {
  const router = useRouter();
  const [meLoading, setMeLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [resetPassword, setResetPassword] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        router.push("/login?next=/admin/import-students");
        return;
      }
      if (data.user?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setMeLoading(false);
    })();
  }, [router]);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }

  async function onUpload() {
    if (!file) return showToast("error", "กรุณาเลือกไฟล์ก่อน");

    const ext = file.name.toLowerCase();
    const okExt = ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".csv");
    if (!okExt) return showToast("error", "รองรับเฉพาะไฟล์ .xlsx .xls .csv");

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("resetPassword", resetPassword ? "1" : "0");

      // ✅ ยิงให้ตรงกับ path จริง
      const res = await fetch("/api/admin/import-students", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        showToast("error", `import ไม่สำเร็จ: ${data?.error || "unknown"}`);
        return;
      }

      showToast(
        "success",
        `นำเข้าสำเร็จ ✅ (เพิ่มใหม่ ${data.inserted} / อัปเดต ${data.updated} / ข้าม ${data.skipped})`
      );

      setFile(null);
      const el = document.getElementById("fileInput") as HTMLInputElement | null;
      if (el) el.value = "";
    } catch {
      showToast("error", "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  if (meLoading) return <div className="min-h-screen bg-black text-white p-4">กำลังตรวจสอบสิทธิ์...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Admin: Import รายชื่อนักศึกษา</h1>
          <button
            onClick={() => router.push("/organizer/dashboard")}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
          >
            กลับ
          </button>
        </div>

        <p className="text-white/60 mt-2 text-sm">
          รองรับไฟล์ <span className="text-white">Excel (.xlsx/.xls)</span> หรือ <span className="text-white">CSV (.csv)</span>
        </p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/70">
            รูปแบบคอลัมน์ที่ต้องมี:
            <div className="mt-2 rounded-xl bg-black/30 border border-white/10 p-3 text-white/80">
              <div>studentId</div>
              <div>name</div>
            </div>
            <div className="text-xs text-white/50 mt-2">
              * username = studentId, password เริ่มต้น = studentId และจะบังคับเปลี่ยนหลัง login ครั้งแรก
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={resetPassword}
                onChange={(e) => setResetPassword(e.target.checked)}
              />
              รีเซ็ตรหัสผ่านผู้ที่มีอยู่แล้วให้กลับเป็น studentId
            </label>

            <input
              id="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-white/80 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:text-black file:px-4 file:py-2"
            />

            {file ? (
              <div className="text-sm text-white/70">
                ไฟล์ที่เลือก: <span className="text-white">{file.name}</span>
              </div>
            ) : (
              <div className="text-sm text-white/50">ยังไม่ได้เลือกไฟล์</div>
            )}

            <button
              onClick={onUpload}
              disabled={uploading}
              className="rounded-xl bg-white text-black font-semibold py-2 disabled:opacity-60"
            >
              {uploading ? "กำลังนำเข้า..." : "นำเข้ารายชื่อ"}
            </button>
          </div>
        </div>

        {toast ? (
          <div
            className={`mt-4 rounded-xl p-3 text-sm border ${
              toast.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-200"
                : "bg-red-500/10 border-red-500/30 text-red-200"
            }`}
          >
            {toast.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}