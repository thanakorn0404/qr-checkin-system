"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  username: string;
  studentId: string;
  name: string;
  role: "student" | "organizer" | "admin";
  isActive: boolean;
  createdAt: string;
};

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

function roleBadge(role: Row["role"]) {
  if (role === "admin") return "bg-sky-100 text-sky-700 border-sky-200";
  if (role === "organizer") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function ManageUsersPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"info" | "success" | "error">("info");

  const [fName, setFName] = useState("");
  const [fUsername, setFUsername] = useState("");
  const [fStudentId, setFStudentId] = useState("");
  const [fRole, setFRole] = useState<Row["role"]>("student");
  const [fPassword, setFPassword] = useState("");

  const inputCls =
    "mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-2.5 outline-none transition " +
    "placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200";

  const selectCls =
    "mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-2.5 outline-none transition " +
    "focus:border-sky-400 focus:ring-2 focus:ring-sky-200";

  async function load() {
    setLoading(true);
    setMsg("");

    const res = await fetch("/api/admin/users/list", { credentials: "include" });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsgType("error");
      setMsg("โหลดรายชื่อไม่สำเร็จ (ต้องเป็น admin)");
      setLoading(false);
      return;
    }

    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const canCreate = useMemo(() => {
    if (!fName.trim()) return false;
    if (!fPassword || fPassword.length < 6) return false;
    // ต้องมี username หรือ studentId อย่างน้อย 1 อย่าง (ตาม backend error missing_identity)
    if (!fUsername.trim() && !fStudentId.trim()) return false;
    return true;
  }, [fName, fPassword, fUsername, fStudentId]);

  async function createUser() {
    setMsg("");

    const payload = {
      name: fName.trim(),
      username: fUsername.trim() || undefined,
      studentId: fStudentId.trim() || undefined,
      role: fRole,
      password: fPassword,
    };

    const res = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsgType("error");
      setMsg(
        data?.error === "username_taken"
          ? "username ซ้ำ"
          : data?.error === "studentId_taken"
          ? "studentId ซ้ำ"
          : data?.error === "missing_identity"
          ? "ต้องใส่ username หรือ studentId"
          : data?.error === "unauthorized"
          ? "ยังไม่ได้ล็อกอิน"
          : data?.error === "forbidden"
          ? "สิทธิ์ไม่ถูกต้อง"
          : "สร้างผู้ใช้ไม่สำเร็จ"
      );
      return;
    }

    setFName("");
    setFUsername("");
    setFStudentId("");
    setFPassword("");
    setFRole("student");

    setMsgType("success");
    setMsg("สร้างผู้ใช้สำเร็จ ✅");
    load();
  }

  async function updateUser(id: string, patch: any) {
    setMsg("");

    const res = await fetch("/api/admin/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, ...patch }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsgType("error");
      setMsg("อัปเดตไม่สำเร็จ");
      return;
    }

    setMsgType("success");
    setMsg("อัปเดตสำเร็จ ✅");
    load();
  }

  return (
    <div className="w-full max-w-6xl">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">จัดการผู้ใช้</h1>
        <p className="text-sm text-slate-500 mt-1">สร้าง / เปลี่ยนสิทธิ์ / ปิดใช้งาน / รีเซ็ตรหัสผ่าน</p>
      </div>

      {msg ? (
        <div
          className={cx(
            "mb-4 rounded-2xl p-3 text-sm border",
            msgType === "success" && "bg-emerald-50 border-emerald-200 text-emerald-700",
            msgType === "error" && "bg-red-50 border-red-200 text-red-700",
            msgType === "info" && "bg-sky-50 border-sky-200 text-slate-700"
          )}
        >
          {msg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4 items-start">
        {/* Create card */}
        <section className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">เพิ่มผู้ใช้</h2>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-sky-100 text-sky-700">
              Admin only
            </span>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">ชื่อ</label>
              <input className={inputCls} value={fName} onChange={(e) => setFName(e.target.value)} placeholder="เช่น ทดสอบ นักศึกษา" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">สิทธิ์</label>
                <select className={selectCls} value={fRole} onChange={(e) => setFRole(e.target.value as any)}>
                  <option value="student">student (user)</option>
                  <option value="organizer">organizer</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">studentId (สำหรับ student)</label>
                <input className={inputCls} value={fStudentId} onChange={(e) => setFStudentId(e.target.value)} placeholder="เช่น 6504xxxxxxx" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">username (สำหรับ admin/organizer หรือ student ก็ได้)</label>
              <input className={inputCls} value={fUsername} onChange={(e) => setFUsername(e.target.value)} placeholder="เช่น admin / staff1" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">รหัสผ่าน (อย่างน้อย 6 ตัว)</label>
              <input
                type="password"
                className={inputCls}
                value={fPassword}
                onChange={(e) => setFPassword(e.target.value)}
                placeholder="••••••"
              />
              <div className="mt-1 text-xs text-slate-500">
                ต้องใส่ <span className="font-semibold">username หรือ studentId</span> อย่างน้อย 1 อย่าง
              </div>
            </div>

            <button
              onClick={createUser}
              disabled={!canCreate}
              className="h-11 rounded-2xl font-semibold transition
                         bg-gradient-to-r from-sky-500 to-blue-500 text-white
                         shadow-md shadow-sky-200/70 hover:shadow-lg
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              สร้างผู้ใช้
            </button>
          </div>
        </section>

        {/* List card */}
        <section className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur shadow-xl shadow-sky-100/60 p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">รายชื่อผู้ใช้</h2>
            <div className="text-xs text-slate-500">
              {loading ? "กำลังโหลด..." : `${items.length} รายการ`}
            </div>
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-slate-600">
              กำลังโหลดข้อมูล...
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((u) => (
                <div key={u.id} className="rounded-2xl border border-sky-100 bg-white p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    {/* Left */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold truncate">{u.name}</div>

                        <span className={cx("text-xs font-semibold px-2 py-1 rounded-full border", roleBadge(u.role))}>
                          {u.role}
                        </span>

                        <span
                          className={cx(
                            "text-xs font-semibold px-2 py-1 rounded-full border",
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          {u.isActive ? "active" : "disabled"}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-slate-600 break-all">
                        username: <span className="font-medium">{u.username || "-"}</span> • studentId:{" "}
                        <span className="font-medium">{u.studentId || "-"}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        created: {new Date(u.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 items-start">
                      <select
                        className="h-10 rounded-2xl border border-sky-200 bg-white px-3 text-sm outline-none
                                   focus:border-sky-400 focus:ring-2 focus:ring-sky-200 transition"
                        value={u.role}
                        onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      >
                        <option value="student">student</option>
                        <option value="organizer">organizer</option>
                        <option value="admin">admin</option>
                      </select>

                      <button
                        onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                        className="h-10 px-3 rounded-2xl border border-sky-200 bg-white hover:bg-sky-50 transition text-sm font-medium"
                      >
                        {u.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>

                      <button
                        onClick={() => {
                          const np = prompt("ตั้งรหัสผ่านใหม่ (อย่างน้อย 6 ตัว)");
                          if (np && np.length >= 6) updateUser(u.id, { newPassword: np });
                        }}
                        className="h-10 px-3 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 transition text-sm font-medium text-red-700"
                      >
                        รีเซ็ตรหัสผ่าน
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2 text-xs text-slate-500">
                * หน้า/ API นี้ใช้ได้เฉพาะ role = admin
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}