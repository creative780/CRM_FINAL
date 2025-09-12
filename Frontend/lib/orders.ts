// /app/lib/orders.ts
"use client";

export type Urgency = "Urgent" | "High" | "Normal" | "Low";
export type Status = "New" | "Active" | "Completed";

export type Row = {
  id: string;
  title: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  urgency: Urgency;
  status: Status;
};

const KEY = "orders";

export function getOrders(): Row[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Row[]) : [];
  } catch {
    return [];
  }
}

export function setOrders(rows: Row[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function addOrder(row: Row) {
  const all = getOrders();
  all.unshift(row); // newest first
  setOrders(all);
  // notify listeners
  window.dispatchEvent(new CustomEvent("orders:updated"));
}

// Optional: clear helper while developing
export function clearOrders() {
  setOrders([]);
  window.dispatchEvent(new CustomEvent("orders:updated"));
}
