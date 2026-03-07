"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  FileSpreadsheet,
  Filter,
  FolderKanban,
  PlayCircle,
  CheckCircle2,
  Clock3,
  Ban,
  Users,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

type ReportItem = {
  id: string;
  title: string;
  description: string;
  locationName: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  status: "completed" | "ongoing" | "upcoming" | "inactive" | "unknown";
  checkinCount: number;
};

type ChartItem = {
  month: string;
  totalEvents: number;
  totalCheckins: number;
};

type ReportResp = {
  ok: true;
  summary: {
    total: number;
    completed: number;
    ongoing: number;
    upcoming: number;
    inactive: number;
    totalCheckins: number;
  };
  chart: ChartItem[];
  items: ReportItem[];
};

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

function statusText(s: string) {
  if (s === "completed") return "จัดแล้ว";
  if (s === "ongoing") return "กำลังจัด";
  if (s === "upcoming") return "ยังไม่จัด";
  if (s === "inactive") return "ปิดใช้งาน";
  return "ไม่ทราบสถานะ";
}

function statusTone(s: string) {
  if (s === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "ongoing") return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
  if (s === "upcoming") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "inactive") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

const UI = {
  page:
    "min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(217,70,239,0.08),_transparent_24%),radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_28%),linear-gradient(to_bottom,_#ffffff,_#f8fbff)] p-4 md:p-6",
  shell: "max-w-7xl mx-auto",
  card:
    "rounded-[28px] border border-sky-100 bg-white shadow-[0_12px_40px_rgba(14,165,233,0.10)] backdrop-blur",
  cardSoft:
    "rounded-[24px] border border-fuchsia-100 bg-white shadow-[0_10px_30px_rgba(217,70,239,0.08)]",
  input:
    "mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100",
  select:
    "mt-1 w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-fuchsia-500 text-white font-semibold shadow-[0_12px_24px_rgba(59,130,246,0.25)] hover:scale-[1.01] hover:shadow-[0_16px_30px_rgba(217,70,239,0.20)] transition",
  btnSoft:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl border border-sky-200 bg-white text-slate-700 font-semibold hover:border-fuchsia-300 hover:bg-fuchsia-50/40 transition",
  statCard:
    "rounded-[26px] border border-sky-100 bg-white p-5 shadow-[0_8px_28px_rgba(14,165,233,0.08)] hover:shadow-[0_14px_32px_rgba(217,70,239,0.10)] transition",
};

export default function AdminReportsPage() {
  const router = useRouter();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);
  const [status, setStatus] = useState("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [chart, setChart] = useState<ChartItem[]>([]);
  const [summary, setSummary] = useState<ReportResp["summary"] | null>(null);

  async function load() {
    setLoading(true);
    setError("");

    const qs = new URLSearchParams({
      from,
      to,
      status,
    });

    const res = await fetch(`/api/admin/reports/events?${qs.toString()}`, {
      cache: "no-store",
      credentials: "include",
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !data?.ok) {
      setError(data?.error || "load_failed");
      setItems([]);
      setChart([]);
      setSummary(null);
      return;
    }

    setItems(data.items || []);
    setChart(data.chart || []);
    setSummary(data.summary || null);
  }

  useEffect(() => {
    load();
  }, []);

  function exportExcel() {
    const qs = new URLSearchParams({
      from,
      to,
      status,
      export: "xlsx",
    });

    window.open(`/api/admin/reports/events?${qs.toString()}`, "_blank");
  }

  const maxEvents = useMemo(() => Math.max(...chart.map((x) => x.totalEvents), 1), [chart]);
  const maxCheckins = useMemo(() => Math.max(...chart.map((x) => x.totalCheckins), 1), [chart]);

  const summaryCards = summary
    ? [
        {
          label: "กิจกรรมทั้งหมด",
          value: summary.total,
          icon: FolderKanban,
          tone: "from-sky-500 to-fuchsia-500",
          ring: "ring-sky-100",
        },
        {
          label: "จัดแล้ว",
          value: summary.completed,
          icon: CheckCircle2,
          tone: "from-emerald-500 to-green-500",
          ring: "ring-emerald-100",
        },
        {
          label: "กำลังจัด",
          value: summary.ongoing,
          icon: PlayCircle,
          tone: "from-fuchsia-500 to-pink-500",
          ring: "ring-fuchsia-100",
        },
        {
          label: "ยังไม่จัด",
          value: summary.upcoming,
          icon: Clock3,
          tone: "from-amber-400 to-orange-400",
          ring: "ring-amber-100",
        },
        {
          label: "ปิดใช้งาน",
          value: summary.inactive,
          icon: Ban,
          tone: "from-slate-400 to-slate-500",
          ring: "ring-slate-100",
        },
        {
          label: "ผู้เช็คชื่อรวม",
          value: summary.totalCheckins,
          icon: Users,
          tone: "from-violet-500 to-fuchsia-500",
          ring: "ring-violet-100",
        },
      ]
    : [];

  return (
    <div className={UI.page}>
      <div className={UI.shell}>
        {/* Hero Header */}
        <div className={cx(UI.card, "p-6 md:p-8 overflow-hidden relative")}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(217,70,239,0.10),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.10),_transparent_30%)] pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-sky-500 via-blue-500 to-fuchsia-500 text-white flex items-center justify-center shadow-[0_18px_32px_rgba(59,130,246,0.30)]">
                <BarChart3 size={30} />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">
                  <Sparkles size={14} />
                  Executive Activity Report
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-3">รายงานผลกิจกรรม</h1>
                <p className="text-sm text-slate-500 mt-1">
                  มุมมองสำหรับผู้บริหาร • สรุปกิจกรรม สถานะ และจำนวนผู้เข้าร่วม
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => router.push("/organizer/dashboard")} className={UI.btnSoft}>
                <ArrowLeft size={18} />
                กลับ
              </button>

              <button onClick={exportExcel} className={UI.btnPrimary}>
                <FileSpreadsheet size={18} />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className={cx(UI.card, "mt-5 p-6")}>
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Filter size={18} className="text-fuchsia-600" />
            ตัวกรองรายงาน
          </div>

          <div className="mt-4 grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">ตั้งแต่วันที่</label>
              <div className="relative">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={UI.input} />
                <CalendarRange size={18} className="absolute right-4 top-[54%] -translate-y-1/2 text-fuchsia-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">ถึงวันที่</label>
              <div className="relative">
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={UI.input} />
                <CalendarRange size={18} className="absolute right-4 top-[54%] -translate-y-1/2 text-fuchsia-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">กรองสถานะ</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={UI.select}>
                <option value="all">ทั้งหมด</option>
                <option value="completed">จัดแล้ว</option>
                <option value="ongoing">กำลังจัด</option>
                <option value="upcoming">ยังไม่จัด</option>
                <option value="inactive">ปิดใช้งาน</option>
              </select>
            </div>

            <div className="flex items-end">
              <button onClick={load} disabled={loading} className={cx(UI.btnPrimary, "w-full")}>
                {loading ? "กำลังโหลด..." : "ดูรายงาน"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
              โหลดรายงานไม่สำเร็จ: {error}
            </div>
          ) : null}
        </div>

        {/* Summary */}
        {summary ? (
          <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={UI.statCard}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">{card.label}</div>
                      <div className="text-3xl font-bold text-slate-900 mt-1">{card.value}</div>
                    </div>

                    <div
                      className={cx(
                        "h-12 w-12 rounded-[18px] text-white flex items-center justify-center shadow-lg ring-4",
                        `bg-gradient-to-br ${card.tone}`,
                        card.ring
                      )}
                    >
                      <Icon size={22} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Chart */}
        <div className={cx(UI.card, "mt-5 p-6")}>
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <BarChart3 size={18} className="text-fuchsia-600" />
            กราฟสรุปรายเดือน
          </div>
          <p className="text-sm text-slate-500 mt-1">แท่งบน = จำนวนกิจกรรม • แท่งล่าง = จำนวนผู้เช็คชื่อ</p>

          {chart.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-fuchsia-200 bg-fuchsia-50/50 p-6 text-slate-500">
              ยังไม่มีข้อมูลกราฟในช่วงเวลาที่เลือก
            </div>
          ) : (
            <div className="mt-5 grid lg:grid-cols-2 gap-4">
              {chart.map((row) => (
                <div key={row.month} className={cx(UI.cardSoft, "p-5")}>
                  <div className="text-base font-semibold text-slate-900">{row.month}</div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>จำนวนกิจกรรม</span>
                        <span>{row.totalEvents}</span>
                      </div>
                      <div className="h-4 rounded-full bg-sky-100 overflow-hidden">
                        <div
                          className="h-4 rounded-full bg-gradient-to-r from-sky-500 to-fuchsia-500"
                          style={{ width: `${(row.totalEvents / maxEvents) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>จำนวนผู้เช็คชื่อ</span>
                        <span>{row.totalCheckins}</span>
                      </div>
                      <div className="h-4 rounded-full bg-fuchsia-100 overflow-hidden">
                        <div
                          className="h-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500"
                          style={{ width: `${(row.totalCheckins / maxCheckins) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className={cx(UI.card, "mt-5 overflow-hidden")}>
          <div className="px-6 pt-6">
            <div className="text-lg font-semibold text-slate-900">รายการกิจกรรม</div>
            <p className="text-sm text-slate-500 mt-1">สรุปรายการกิจกรรมในช่วงเวลาที่เลือก</p>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-gradient-to-r from-sky-50 via-white to-fuchsia-50 text-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold">ชื่อกิจกรรม</th>
                  <th className="text-left px-4 py-4 font-semibold">สถานที่</th>
                  <th className="text-left px-4 py-4 font-semibold">วันเริ่ม</th>
                  <th className="text-left px-4 py-4 font-semibold">วันสิ้นสุด</th>
                  <th className="text-left px-4 py-4 font-semibold">สถานะ</th>
                  <th className="text-left px-4 py-4 font-semibold">ผู้เช็คชื่อ</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      ไม่พบกิจกรรมในช่วงเวลานี้
                    </td>
                  </tr>
                ) : (
                  items.map((e) => (
                    <tr key={e.id} className="border-t border-sky-50 hover:bg-fuchsia-50/30 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{e.title}</div>
                        {e.description ? <div className="text-xs text-slate-500 mt-1">{e.description}</div> : null}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{e.locationName || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{new Date(e.startAt).toLocaleString("th-TH")}</td>
                      <td className="px-4 py-4 text-slate-600">{new Date(e.endAt).toLocaleString("th-TH")}</td>
                      <td className="px-4 py-4">
                        <span className={cx("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", statusTone(e.status))}>
                          {statusText(e.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex min-w-[52px] items-center justify-center rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 font-semibold text-fuchsia-700">
                          {e.checkinCount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}