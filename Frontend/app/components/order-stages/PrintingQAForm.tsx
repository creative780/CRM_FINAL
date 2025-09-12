"use client";

import React, { useCallback, useMemo, useState } from "react";
import OrderIntakeForm from "./OrderIntakeForm";

/** ===== Types ===== */
type Urgency = "Urgent" | "High" | "Normal" | "Low";
type Status = "New" | "Active" | "Completed";
export type Row = { id: string; title: string; date: string; time: string; urgency: Urgency; status: Status };

/** ===== Helpers ===== */
const toLocalYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const normalizeToYMD = (input: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalYMD(d);
};

const urgencyBadge = (u: Urgency) => {
  const classes: Record<Urgency, string> = {
    Urgent: "bg-red-100 text-red-700 border-red-200",
    High: "bg-amber-100 text-amber-800 border-amber-200",
    Normal: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Low: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs border font-medium ${classes[u]}`}>
      {u}
    </span>
  );
};

/** ===== Simple Modal (no external lib) ===== */
const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 p-4 flex items-center justify-center">
        <div
          className={`bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[90vh] ${
            wide ? "w-full max-w-6xl" : "w-full max-w-3xl"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold text-[#891F1A]">{title}</h2>
            <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default function OrdersPage() {
  /** ✅ Dummy data REMOVED — starts empty */
  const [orders, setOrders] = useState<Row[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [q, setQ] = useState("");
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const filtered = useMemo(() => {
    return orders.filter((r) => {
      const okDay = selectedDate ? normalizeToYMD(r.date) === selectedDate : true;
      const hay = [r.id, r.title, r.date, r.time, r.urgency, r.status].join(" ").toLowerCase();
      const okQuery = q.trim() === "" ? true : hay.includes(q.toLowerCase());
      return okDay && okQuery;
    });
  }, [orders, selectedDate, q]);

  const by = useCallback((s: Status) => filtered.filter((r) => r.status === s), [filtered]);

  const Section: React.FC<{ title: string; rows: Row[] }> = ({ title, rows }) => (
    <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-4">
        <h2 className="text-2xl font-bold text-[#891F1A]">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#7a1b17] text-white">
              <th className="px-3 py-3 text-center w-20">Sr No</th>
              <th className="px-3 py-3 text-center w-36">Order Id</th>
              <th className="px-3 py-3 text-center">Order</th>
              <th className="px-3 py-3 text-center w-36">Date</th>
              <th className="px-3 py-3 text-center w-28">Time</th>
              <th className="px-3 py-3 text-center w-40">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-400" colSpan={6}>
                  No records
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-3 text-center">{i + 1}</td>
                  <td className="px-3 py-3 text-center font-medium text-gray-900">{r.id}</td>
                  <td className="px-3 py-3 text-center">{r.title}</td>
                  <td className="px-3 py-3 text-center">{r.date}</td>
                  <td className="px-3 py-3 text-center">{r.time}</td>
                  <td className="px-3 py-3 text-center">{urgencyBadge(r.urgency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  /** Save callback — form se aaya EXACT row add hota hai */
  const handleCustomSaved = (row: Row) => {
    setOrders((prev) => [row, ...prev]); // newest top
    setSelectedDate("");
    setQ("");
    setIsCustomOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-black">
      <div className="max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-[#891F1A]">Sales Orders</h1>
          <button
            onClick={() => setIsCustomOpen(true)}
            className="bg-[#3B66FF] text-white hover:bg-[#2c53d9] transition px-4 py-2 rounded-lg shadow"
          >
            + Add a Custom Order
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col md:flex-row gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded border bg-white"
          />
          <input
            placeholder="Search (Order Id, order, date, time, urgency, status)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="px-3 py-2 rounded border bg-white flex-1"
          />
        </div>

        {/* Sections */}
        <div className="mt-6 grid grid-cols-1 gap-6">
          <Section title="New Orders" rows={by("New")} />
          <Section title="Active Orders" rows={by("Active")} />
          <Section title="Completed Orders" rows={by("Completed")} />
        </div>
      </div>

      {/* Custom Order Popup */}
      <Modal open={isCustomOpen} onClose={() => setIsCustomOpen(false)} title="Add a Custom Order" wide>
        <OrderIntakeForm onSaved={handleCustomSaved} />
      </Modal>
    </div>
  );
}
