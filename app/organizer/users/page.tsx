"use client";

import { useEffect, useState } from "react";
import OrganizerTopbar from "../OrganizerTopbar";

type Row = {
  id: string;
  username: string;
  studentId: string;
  name: string;
  role: "student" | "organizer" | "admin";
  isActive: boolean;
  createdAt: string;
};

export default function ManageUsersPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [fName, setFName] = useState("");
  const [fUsername, setFUsername] = useState("");
  const [fStudentId, setFStudentId] = useState("");
  const [fRole, setFRole] = useState<Row["role"]>("student");
  const [fPassword, setFPassword] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/users/list");
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
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
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsg(
        data?.error === "username_taken"
          ? "username ซ้ำ"
          : data?.error === "studentId_taken"
          ? "studentId ซ้ำ"
          : data?.error === "missing_identity"
          ? "ต้องใส่ username หรือ studentId"
          : "สร้างผู้ใช้ไม่สำเร็จ"
      );
      return;
    }

    setFName("");
    setFUsername("");
    setFStudentId("");
    setFPassword("");
    setFRole("student");
    setMsg("สร้างผู้ใช้สำเร็จ ✅");
    load();
  }

  async function updateUser(id: string, patch: any) {
    setMsg("");
    const res = await fetch("/api/admin/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg("อัปเดตไม่สำเร็จ");
      return;
    }
    load();
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 flex justify-center">
      <div className="w-full max-w-3xl">
        <OrganizerTopbar />

        <h1 className="text-2xl font-semibold mt-4">จัดการผู้ใช้ (Admin)</h1>
        <p className="text-white/60 mt-1">สร้าง / เปลี่ยนสิทธิ์ / ปิดใช้งาน / รีเซ็ตรหัสผ่าน</p>

        {msg ? (
          <div className="mt-4 rounded-xl p-3 text-sm border bg-white/5 border-white/10 text-white/80">
            {msg}
          </div>
        ) : null}

        {/* Create */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 grid gap-3">
          <div className="text-lg font-semibold">เพิ่มผู้ใช้</div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/70">ชื่อ</label>
              <input
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-white/70">สิทธิ์</label>
              <select
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={fRole}
                onChange={(e) => setFRole(e.target.value as any)}
              >
                <option value="student">student (user)</option>
                <option value="organizer">organizer</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-white/70">username (สำหรับ admin/organizer หรือ student ก็ได้)</label>
              <input
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={fUsername}
                onChange={(e) => setFUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-white/70">studentId (สำหรับ student)</label>
              <input
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={fStudentId}
                onChange={(e) => setFStudentId(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-white/70">รหัสผ่าน</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none"
                value={fPassword}
                onChange={(e) => setFPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={createUser}
            className="rounded-xl bg-white text-black font-semibold py-2"
          >
            สร้างผู้ใช้
          </button>
        </div>

        {/* List */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-lg font-semibold">รายชื่อผู้ใช้</div>

          {loading ? (
            <div className="text-white/60 mt-3">กำลังโหลด...</div>
          ) : (
            <div className="mt-3 grid gap-3">
              {items.map((u) => (
                <div key={u.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex flex-wrap gap-2 justify-between">
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-sm text-white/60">
                        username: {u.username || "-"} | studentId: {u.studentId || "-"}
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        created: {new Date(u.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap items-start">
                      <select
                        className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                        value={u.role}
                        onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      >
                        <option value="student">student</option>
                        <option value="organizer">organizer</option>
                        <option value="admin">admin</option>
                      </select>

                      <button
                        onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
                      >
                        {u.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>

                      <button
                        onClick={() => {
                          const np = prompt("ตั้งรหัสผ่านใหม่ (อย่างน้อย 6 ตัว)");
                          if (np && np.length >= 6) updateUser(u.id, { newPassword: np });
                        }}
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
                      >
                        รีเซ็ตรหัสผ่าน
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-white/50">
          * หน้า/ API นี้ใช้ได้เฉพาะ role = admin
        </div>
      </div>
    </div>
  );
}
