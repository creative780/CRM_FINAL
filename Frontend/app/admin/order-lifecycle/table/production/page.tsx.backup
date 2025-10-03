"use client";

import { useMemo, useState, useCallback, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";

/* ============================================================================
   Types (local, no external store)
============================================================================ */

type Urgency = "Urgent" | "High" | "Normal" | "Low";
type Status = "New" | "Active" | "Completed";

type Row = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  urgency: Urgency;
  status: Status;
};

type Machine = { id: string; name: string; eta: string };
type QueueItem = { id: string; title: string; status: "Queued" | "In Progress" | "Complete" };

type UploadMeta = { name: string; size: number; type: string };

type SharedFormData = {
  orderId?: string;
  designerUploads?: Record<string, Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    ext?: string;
    isImage?: boolean;
    url?: string;
    previewUrl?: string;
  }>>;
  intakeProductsMap?: Record<string, Array<{ name: string; qty: number }>>;
  orderInformationMap?: Record<string, Array<{ product: string; spec: string }>>;
  sendTo?: "Sales" | "Designer" | "Production";
};

type QueueByMachine = Record<string, QueueItem[]>;

/* ============================================================================
   Demo Data (replace with your API)
============================================================================ */

const DATA: Row[] = [
  { id: "PROD-201", title: "Flyer Print Batch A", date: "2025-08-05", time: "09:00", urgency: "Urgent", status: "New" },
  { id: "PROD-202", title: "Roll-up Banner Printing", date: "2025-08-05", time: "13:20", urgency: "High", status: "Active" },
  { id: "PROD-203", title: "Sticker Sheet Batch", date: "2025-08-04", time: "15:10", urgency: "Normal", status: "Active" },
  { id: "PROD-204", title: "Business Cards – Matte", date: "2025-08-02", time: "11:45", urgency: "Low", status: "Completed" },
];

const MACHINES: Machine[] = [
  { id: "m1", name: "Laser Cutter", eta: "~45m" },
  { id: "m2", name: "Printer", eta: "~30m" },
  { id: "m3", name: "UV Flatbed", eta: "~1h" },
  { id: "m4", name: "Plotter", eta: "~20m" },
];

const QUEUE: QueueByMachine = {
  "Laser Cutter": [
    { id: "Q-101", title: "Acrylic Sign", status: "Queued" },
    { id: "Q-102", title: "Wood Plaque", status: "In Progress" },
  ],
  Printer: [
    { id: "Q-201", title: "Business Cards", status: "Complete" },
    { id: "Q-202", title: "Flyers", status: "Queued" },
    { id: "Q-203", title: "Stickers", status: "In Progress" },
    { id: "Q-204", title: "Booklets", status: "Queued" },
  ],
};

/* ============================================================================
   UI helpers
============================================================================ */

const urgencyBadge = (u: Urgency) => {
  const classes: Record<Urgency, string> = {
    Urgent: "bg-red-100 text-red-700 border-red-200",
    High: "bg-amber-100 text-amber-800 border-amber-200",
    Normal: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Low: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs border font-medium ${classes[u]}`}>{u}</span>;
};

const statusBadge = (s: QueueItem["status"]) => {
  const map: Record<QueueItem["status"], string> = {
    Queued: "bg-amber-100 text-amber-800",
    "In Progress": "bg-blue-100 text-blue-700",
    Complete: "bg-emerald-100 text-emerald-700",
  };
  return <span className={`text-xs px-2.5 py-1 rounded-full ${map[s]}`}>{s}</span>;
};

const etaBadge = (eta: string) => (
  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{eta}</span>
);

const normalizeToYMD = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(s).toISOString().slice(0, 10));

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return "";
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
};

/* ============================================================================
   Shared tables
============================================================================ */

function IntakeProductsTable({
  items,
  title = "Products (Order Intake)",
}: {
  items: Array<{ name: string; qty: number }>;
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-black bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-100 border-b border-black">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>

      {items?.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-6 py-2 border-b border-black w-[70%]">Name</th>
              <th className="text-right px-6 py-2 border-b border-black w-[30%]">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => (
              <tr key={`${p.name}-${i}`} className="odd:bg-white even:bg-gray-50">
                <td className="px-6 py-2 border-b border-gray-200 text-gray-900 truncate">{p.name}</td>
                <td className="px-6 py-2 border-b border-gray-200 text-right font-extrabold tabular-nums">{p.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-6 py-3 text-sm text-gray-500">No products captured from Order Intake.</div>
      )}
    </div>
  );
}

function OrderInformationTable({
  items,
  title = "Order Information",
}: {
  items: Array<{ product: string; spec: string }>;
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-black bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-100 border-b border-black">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>

      {items?.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-6 py-2 border-b border-black w-[40%]">Product</th>
              <th className="text-left px-6 py-2 border-b border-black w-[60%]">Specification</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={`${row.product}-${i}`} className="odd:bg-white even:bg-gray-50">
                <td className="px-6 py-2 border-b border-gray-200 text-gray-900 truncate">{row.product}</td>
                <td className="px-6 py-2 border-b border-gray-200 text-gray-700">{row.spec?.trim() ? row.spec : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-6 py-3 text-sm text-gray-500">No order information added.</div>
      )}
    </div>
  );
}

/* ============================================================================
   Component
============================================================================ */

export default function ProductionOrdersTablePage() {
  const [monthFilter, setMonthFilter] = useState<"All" | "2025-08" | "2025-07">("All");
  const [q, setQ] = useState("");

  // modal state
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  // Local replacement for store-backed form data
  const [formData, setFormData] = useState<SharedFormData>({});

  // Machines
  const [machineOpen, setMachineOpen] = useState(false);
  const [machineSelections, setMachineSelections] = useState<Record<string, boolean>>({});
  const [machineSearch, setMachineSearch] = useState("");

  const filteredMachines = useMemo(() => {
    const term = machineSearch.trim().toLowerCase();
    if (!term) return MACHINES;
    return MACHINES.filter((m) => m.name.toLowerCase().includes(term));
  }, [machineSearch]);

  const assignedMachines = useMemo(() => MACHINES.filter((m) => !!machineSelections[m.id]), [machineSelections]);

  const toggleMachine = (id: string) => setMachineSelections((m) => ({ ...m, [id]: !m[id] }));
  const clearAllMachines = () => setMachineSelections({});
  const selectAllMachines = () => {
    const next: Record<string, boolean> = {};
    MACHINES.forEach((m) => (next[m.id] = true));
    setMachineSelections(next);
  };
  const removeOneMachine = (id: string) => setMachineSelections(({ [id]: _, ...rest }) => rest);

  const openForRow = useCallback((row: Row) => {
    setSelected(row);
    setIsOpen(true);
  }, []);

  const filtered = useMemo(() => {
    return DATA.filter((r) => {
      const okMonth = monthFilter === "All" ? true : r.date.startsWith(monthFilter);
      const hay = [r.id, r.title, r.date, r.time, r.urgency].join(" ").toLowerCase();
      const okQuery = q.trim() === "" ? true : hay.includes(q.toLowerCase());
      return okMonth && okQuery;
    });
  }, [monthFilter, q]);

  const by = (s: Status) => filtered.filter((r) => r.status === s);

  // Designer uploads (read from local formData mirror)
  const uploadedFromDesigner = useMemo(() => {
    const du = formData?.designerUploads || {};
    const selectedKey = selected?.id;
    const lastDesignerOrder = formData?.orderId;
    if (selectedKey && du[selectedKey]) return du[selectedKey];
    if (lastDesignerOrder && du[lastDesignerOrder]) return du[lastDesignerOrder];
    const firstKey = Object.keys(du)[0];
    return firstKey ? du[firstKey] : [];
  }, [formData, selected]);

  // Intake + order info for the selected order
  const intakeProducts: Array<{ name: string; qty: number }> = useMemo(() => {
    if (!selected) return [];
    return formData?.intakeProductsMap?.[selected.id] || [];
  }, [formData, selected]);

  const orderInformation: Array<{ product: string; spec: string }> = useMemo(() => {
    if (!selected) return [];
    const map = formData?.orderInformationMap?.[selected.id];
    if (Array.isArray(map) && map.length) return map;
    return (intakeProducts || []).map((p) => ({ product: p.name, spec: "" }));
  }, [formData, selected, intakeProducts]);

  const Section = ({ title, rows }: { title: string; rows: Row[] }) => (
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
                <tr
                  key={r.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => openForRow(r)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openForRow(r)}
                >
                  <td className="px-3 py-3 text-center">{i + 1}</td>
                  <td className="px-3 py-3 text-center font-medium text-gray-900">{r.id}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="font-medium text-gray-900">{r.title}</div>
                  </td>
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

  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-black">
      <DashboardNavbar />
      <div className="h-4 sm:h-5 md:h-6" />

      <div className="max-w-7xl mx-auto pb-16">
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-[#891F1A]">Production Orders</h1>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-3">
          <select
            aria-label="Months"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value as any)}
            className="px-3 py-2 rounded border bg-white"
          >
            <option value="All">All Months</option>
            <option value="2025-08">Aug 2025</option>
            <option value="2025-07">Jul 2025</option>
          </select>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6">
          <Section title="New Orders" rows={by("New")} />
          <Section title="Active Orders" rows={by("Active")} />
          <Section title="Completed Orders" rows={by("Completed")} />
        </div>
      </div>

      {/* Popup */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px]" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-1" enterTo="opacity-100 scale-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100 translate-y-0" leaveTo="opacity-0 scale-95 translate-y-1">
                <Dialog.Panel ref={ref} className="w-full max-w-7xl max-h-[90vh] bg-white rounded-2xl lg:rounded-3xl shadow-2xl ring-1 ring-black/5 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0 z-10">
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-[#891F1A]">Production Panel — {selected?.id}</Dialog.Title>
                      {selected && (
                        <p className="text-xs text-gray-500">
                          {selected.title} · {normalizeToYMD(selected.date) || selected.date} · {selected.time} ·{" "}
                          <span className="align-middle">{urgencyBadge(selected.urgency)}</span>
                        </p>
                      )}
                    </div>
                    <button onClick={() => setIsOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">Close</button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-auto px-6 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* ===== TOP ROW: mirrored tables ===== */}
                      <div className="space-y-5">
                        <IntakeProductsTable items={intakeProducts} />
                      </div>
                      <div className="space-y-5">
                        <OrderInformationTable items={orderInformation} />
                      </div>

                      {/* ===== SECOND ROW: existing features ===== */}
                      {/* LEFT: Assign Machine + Files From Designer */}
                      <div className="space-y-5">
                        {/* Assign Machine */}
                        {/* CHANGE: overflow-visible + relative so dropdown can escape */}
                        <div className="relative rounded-2xl border border-black bg-white shadow-sm overflow-visible">
                          <div className="px-4 py-3 bg-gray-100 border-b border-black">
                            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">⚙️ Assign Machine</h3>
                          </div>
                          <div className="p-4">
                            {/* Trigger */}
                            <div className="relative">
                              <button
                                onClick={() => setMachineOpen((o) => !o)}
                                className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-400 transition"
                                aria-haspopup="listbox"
                                aria-expanded={machineOpen}
                              >
                                <span>{assignedMachines.length === 0 ? "Select machine(s)" : `${assignedMachines.length} selected`}</span>
                                <svg className={`h-4 w-4 transition-transform ${machineOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                </svg>
                              </button>

                              {/* Dropdown */}
                              <Transition show={machineOpen} as={Fragment} enter="transition ease-out duration-150" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-100" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                                {/* CHANGE: z-40 to sit above neighbors */}
                                <div className="absolute z-40 mt-2 w-full bg-white border rounded-xl shadow-lg overflow-hidden">
                                  <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
                                    <input value={machineSearch} onChange={(e) => setMachineSearch(e.target.value)} placeholder="Search machines…" className="flex-1 px-2 py-1.5 rounded border bg-white text-sm" />
                                    <button onClick={selectAllMachines} className="text-xs px-2 py-1 rounded border hover:bg-gray-100">Select All</button>
                                    <button onClick={clearAllMachines} className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50">Clear All</button>
                                  </div>
                                  <div className="max-h-60 overflow-auto divide-y" role="listbox">
                                    {filteredMachines.length === 0 ? (
                                      <div className="px-3 py-3 text-sm text-gray-500">No machines</div>
                                    ) : (
                                      filteredMachines.map((m) => (
                                        <label key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                                          <input type="checkbox" className="w-4 h-4 accent-indigo-500" checked={!!machineSelections[m.id]} onChange={() => toggleMachine(m.id)} />
                                          <span className="flex-1">{m.name}</span>
                                          {etaBadge(m.eta)}
                                        </label>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </Transition>
                            </div>

                            {/* Selected chips */}
                            {assignedMachines.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 items-center">
                                {assignedMachines.map((m) => (
                                  <span key={m.id} className="group inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200">
                                    {m.name}
                                    <button aria-label={`Remove ${m.name}`} onClick={() => removeOneMachine(m.id)} className="rounded p-0.5 hover:bg-indigo-100">✕</button>
                                  </span>
                                ))}
                                <button onClick={clearAllMachines} className="ml-auto text-xs text-red-600 hover:text-red-700 font-medium transition">Clear All</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Files From Designer (Preview) */}
                        <div className="rounded-2xl border border-black bg-white shadow-sm overflow-hidden">
                          <div className="px-4 py-3 bg-gray-100 border-b border-black flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">Files From Designer (Preview)</h3>
                            {uploadedFromDesigner.length > 0 && (
                              <span className="text-xs text-gray-600">{uploadedFromDesigner.length} file(s)</span>
                            )}
                          </div>

                          <div className="p-4">
                            {uploadedFromDesigner.length === 0 ? (
                              <p className="text-sm text-gray-500">No files from Designer yet.</p>
                            ) : (
                              <div className="space-y-4">
                                {/* Image thumbnails: 2 per row */}
                                <div className="grid grid-cols-2 gap-3">
                                  {uploadedFromDesigner.filter((f: any) => f.isImage).map((f: any) => {
                                    const imgSrc = f.previewUrl ?? f.url;
                                    return (
                                      <div key={f.id} className="relative overflow-hidden rounded-lg border bg-gray-50">
                                        {imgSrc ? (
                                          <img src={imgSrc} alt={f.name} className="h-40 w-full object-cover" />
                                        ) : (
                                          <div className="h-40 w-full grid place-items-center text-xs text-gray-500">No preview</div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[11px] px-2 py-1 truncate">
                                          {f.name}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Non-image files as badges */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {uploadedFromDesigner.filter((f: any) => !f.isImage).map((f: any) => (
                                    <div key={f.id} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-gray-50">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate" title={f.name}>{f.name}</div>
                                        <div className="text-[11px] text-gray-500">{formatBytes(f.size)}</div>
                                      </div>
                                      <a href={f.url || f.previewUrl} download={f.name} className="text-[11px] px-2 py-1 rounded border hover:bg-gray-100">
                                        Download
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Production Queue */}
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-black bg-white shadow-sm overflow-hidden">
                          <div className="px-4 py-3 bg-gray-100 border-b border-black">
                            <h3 className="text-sm font-semibold text-gray-900">Production Queue</h3>
                          </div>

                          <div className="p-5">
                            {/* Laser Cutter Group */}
                            <div className="mb-5">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-gray-700">Laser Cutter</h4>
                                <span className="text-xs text-gray-500">{QUEUE["Laser Cutter"]?.length || 0} jobs</span>
                              </div>
                              <div className="space-y-3">
                                {(QUEUE["Laser Cutter"] || []).map((it) => (
                                  <div key={it.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                    <span className="text-sm">{it.title}</span>
                                    {statusBadge(it.status)}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Printer Group */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-gray-700">Printer</h4>
                                <span className="text-xs text-gray-500">{QUEUE["Printer"]?.length || 0} jobs</span>
                              </div>
                              <div className="space-y-3">
                                {(QUEUE["Printer"] || []).map((it) => (
                                  <div key={it.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                    <span className="text-sm">{it.title}</span>
                                    {statusBadge(it.status)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t bg-white px-4 py-4 flex justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <label htmlFor="sendTo" className="text-sm font-medium text-gray-700">
                        Send to:
                      </label>
                      <select
                        id="sendTo"
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#891F1A]/30 focus:border-[#891F1A] transition"
                        value={formData?.sendTo ?? "Sales"}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...(prev || {}),
                            sendTo: e.target.value as "Sales" | "Designer" | "Production",
                          }))
                        }
                      >
                        <option value="Sales">Sales</option>
                        <option value="Designer">Designer</option>
                        <option value="Production">Production</option>
                      </select>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
