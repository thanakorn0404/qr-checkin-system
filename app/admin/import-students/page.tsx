"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Toast = { type: "success" | "error"; text: string } | null;

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

export default function AdminImportStudentsPage() {
  const router = useRouter();
  const [meLoading, setMeLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [resetPassword, setResetPassword] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

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

  const fileName = useMemo(() => file?.name || "", [file]);

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
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      showToast("error", "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  // ✅ Loading page (Light theme)
  if (meLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-sky-100 text-slate-800 grid place-items-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
          <div className="text-lg font-semibold">กำลังตรวจสอบสิทธิ์...</div>
          <div className="text-sm text-slate-500 mt-1">โปรดรอสักครู่</div>
          <div className="mt-4 h-2 rounded-full bg-sky-100 overflow-hidden">
            <div className="h-full w-1/2 bg-sky-400 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const inputBox =
    "h-11 w-full rounded-2xl border border-sky-200 bg-white px-4 outline-none transition " +
    "placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-sky-100 text-slate-800 p-4 flex justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Admin: Import รายชื่อนักศึกษา
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              รองรับไฟล์ <span className="font-semibold">Excel (.xlsx/.xls)</span> หรือ{" "}
              <span className="font-semibold">CSV (.csv)</span>
            </p>
          </div>

          <button
            onClick={() => router.push("/organizer/dashboard")}
            className="h-10 px-4 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition font-medium"
          >
            กลับ
          </button>
        </div>

        {/* Main card */}
        <div className="mt-4 rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
          {/* Format */}
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <div className="text-sm font-semibold text-slate-700">รูปแบบคอลัมน์ที่ต้องมี</div>
            <pre className="mt-2 rounded-2xl border border-sky-200 bg-white p-3 text-sm overflow-auto">
              <code>studentId{"\n"}name</code>
            </pre>
            <div className="text-xs text-slate-500 mt-2">
              * username = studentId, password เริ่มต้น = studentId และจะบังคับเปลี่ยนหลัง login ครั้งแรก
            </div>
          </div>

          {/* Options */}
          <div className="mt-5">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-white px-4 py-3">
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-700">
                  รีเซ็ตรหัสผ่านผู้ที่มีอยู่แล้ว
                </div>
                <div className="text-xs text-slate-500">
                  ถ้าเลือก ระบบจะตั้งรหัสผ่านกลับเป็น studentId
                </div>
              </div>
              <input
                type="checkbox"
                checked={resetPassword}
                onChange={(e) => setResetPassword(e.target.checked)}
                className="h-5 w-5 accent-sky-600"
              />
            </label>
          </div>

          {/* File picker */}
          <div className="mt-5">
            <div className="text-sm font-medium text-slate-700">เลือกไฟล์</div>

            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-11 px-4 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition font-medium"
              >
                เลือกไฟล์
              </button>

              <div className={cx(inputBox, "flex items-center text-sm text-slate-600")}>
                {fileName || "ยังไม่ได้เลือกไฟล์"}
              </div>

              <input
                ref={fileRef}
                id="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="mt-2 text-xs text-slate-500">
              รองรับ .xlsx / .xls / .csv เท่านั้น
            </div>
          </div>

          {/* Submit */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={onUpload}
              disabled={uploading}
              className="h-11 px-6 rounded-2xl font-semibold transition
                         bg-gradient-to-r from-sky-500 to-blue-500 text-white
                         shadow-md shadow-sky-200/70 hover:shadow-lg
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? "กำลังนำเข้า..." : "นำเข้ารายชื่อ"}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast ? (
          <div
            className={cx(
              "mt-4 rounded-2xl p-3 text-sm border",
              toast.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-700",
              toast.type === "error" && "bg-red-50 border-red-200 text-red-700"
            )}
          >
            {toast.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}