"use client";

import { useMemo, useState, useCallback, Fragment, forwardRef, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";

/* =========================
   Local Types (no store)
========================= */

type Urgency = "Urgent" | "High" | "Normal" | "Low";
type Status = "New" | "Active" | "Completed";

type Row = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD" or ISO string
  time: string;
  urgency: Urgency;
  status: Status;
};

// Small meta record used across the UI, mirrors what was in the store
export type UploadMeta = { name: string; size: number; type: string };

export type SharedFormData = {
  orderId?: string;
  projectDescription?: string;
  clientLocation?: string;
  intakeProductsMap?: Record<string, Array<{ name: string; qty: number }>>;
  internalComments?: Record<string, string>;
  orderIntakeFiles?: UploadMeta[];
  designerUploads?: Record<string, any[]>;
  orderInformationMap?: Record<string, Array<{ product: string; spec: string }>>;
  sendTo?: "Sales" | "Designer" | "Production";
};

/* =========================
   Demo Data (replace with API)
========================= */

const DATA: Row[] = [
  { id: "DES-311", title: "Logo Concept Drafts", date: "2025-08-06", time: "09:30", urgency: "Urgent", status: "New" },
  { id: "DES-312", title: "Business Card Layout", date: "2025-08-05", time: "12:10", urgency: "High", status: "New" },
  { id: "DES-298", title: "Roll-up Banner Artwork", date: "2025-08-04", time: "15:20", urgency: "Normal", status: "Active" },
  { id: "DES-296", title: "Product Sticker Set (v2)", date: "2025-08-03", time: "11:05", urgency: "Low", status: "Active" },
  { id: "DES-287", title: "Menu Design Final Export", date: "2025-08-02", time: "17:00", urgency: "High", status: "Completed" },
  { id: "DES-283", title: "T-Shirt Print Vector Cleanup", date: "2025-07-31", time: "10:00", urgency: "Normal", status: "Completed" },
];

/* =========================
   UI Helpers
========================= */

const urgencyBadge = (u: Urgency) => {
  const classes: Record<Urgency, string> = {
    Urgent: "bg-red-100 text-red-700 border-red-200",
    High: "bg-amber-100 text-amber-800 border-amber-200",
    Normal: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Low: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs border font-medium ${classes[u]}`}>{u}</span>;
};

const toLocalYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const normalizeToYMD = (input: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalYMD(d);
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
};

const isImageExt = (ext?: string) =>
  ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes((ext || "").toLowerCase());

/* =========================
   File / Designer Types
========================= */

type FileItem = {
  id: string;
  file: File;
  url: string; // object URL for download/preview
};

// Per-order Designer state
type DesignerPerOrder = {
  internalComment: string;
  designFiles: FileItem[];
  finalArtworks: FileItem[];
  flags: { pdf: boolean; cmyk: boolean; final: boolean };
};

// Accept either UploadMeta (manifest) or a real File
type FileLike = File | UploadMeta;

/* =========================
   Small Badge Component
========================= */

const FileBadge: React.FC<{ file: FileLike }> = ({ file }) => {
  const name = (file as any).name as string;
  const size = Number((file as any).size || 0);
  const ext = name?.split(".").pop()?.toLowerCase();
  const isImage = isImageExt(ext);
  const isPdf = ext === "pdf";
  const isDoc = ["doc", "docx"].includes(ext || "");
  const icon = isImage ? "🖼️" : isPdf ? "📄" : isDoc ? "📝" : "📁";

  return (
    <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-white shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-gray-500">{formatBytes(size)}</p>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Intake Products Table
========================= */

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

/* =========================
   Order Information Table
========================= */

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
                <td className="px-6 py-2 border-b border-gray-200 text-gray-700">
                  {row.spec?.trim() ? row.spec : "—"}
                </td>
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

/* =========================
   Output Checklist Card
========================= */

function OutputChecklistCard({
  flags,
  onToggle,
}: {
  flags: { pdf: boolean; cmyk: boolean; final: boolean } | undefined;
  onToggle: (key: "pdf" | "cmyk" | "final") => void;
}) {
  return (
    <div className="rounded-2xl border border-black bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-100 border-b border-black">
        <h3 className="text-sm font-semibold text-gray-900">Output Checklist</h3>
      </div>

      <div className="text-sm">
        <label className="flex items-center gap-3 px-6 py-3 border-b border-gray-200">
          <input
            type="checkbox"
            checked={!!flags?.pdf}
            onChange={() => onToggle("pdf")}
            className="w-4 h-4 rounded border-gray-400"
          />
          <span className="text-gray-900">PDF format</span>
        </label>

        <label className="flex items-center gap-3 px-6 py-3 border-b border-gray-200">
          <input
            type="checkbox"
            checked={!!flags?.cmyk}
            onChange={() => onToggle("cmyk")}
            className="w-4 h-4 rounded border-gray-400"
          />
          <span className="text-gray-900">CMYK Colors</span>
        </label>

        <label className="flex items-center gap-3 px-6 py-3">
          <input
            type="checkbox"
            checked={!!flags?.final}
            onChange={() => onToggle("final")}
            className="w-4 h-4 rounded border-gray-400"
          />
          <span className="text-gray-900">Final Design</span>
        </label>
      </div>
    </div>
  );
}

/* =========================
   Internal Comment Section
========================= */

const InternalCommentSection = ({
  orderId,
  internalComment,
  setDesignerState,
  setFormData,
}: {
  orderId: string;
  internalComment: string;
  setDesignerState: React.Dispatch<React.SetStateAction<Record<string, DesignerPerOrder>>>;
  setFormData: (updates: Partial<SharedFormData> | ((p: SharedFormData) => SharedFormData)) => void;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newComment = e.target.value;

    setDesignerState((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], internalComment: newComment },
    }));

    setFormData((prev) => ({
      ...prev,
      internalComments: { ...(prev.internalComments || {}), [orderId]: newComment },
    }));
  };

  return (
    <div className="rounded-2xl border border-black bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-100 border-b border-black">
        <h3 className="text-sm font-semibold text-gray-900">Internal Comment</h3>
      </div>
      <div className="p-4">
        <textarea
          id={`internal-comment-${orderId}`}
          value={internalComment}
          onChange={handleChange}
          className="w-full border rounded-lg px-3 py-2 text-sm leading-6 h-36 resize-none overflow-auto focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
          placeholder="Notes for internal use..."
          aria-label={`Internal comment for order ${orderId}`}
        />
      </div>
    </div>
  );
};

/* =========================
   SelectedPopup
========================= */

type SelectedPopupProps = {
  selected: Row;
  designerState: Record<string, DesignerPerOrder>;
  setDesignerState: React.Dispatch<React.SetStateAction<Record<string, DesignerPerOrder>>>;
  formData: SharedFormData;
  setFormData: (updates: Partial<SharedFormData> | ((p: SharedFormData) => SharedFormData)) => void;
  setIsOpen: (v: boolean) => void;
};

const SelectedPopup = forwardRef<HTMLDivElement, SelectedPopupProps>(function SelectedPopup(
  { selected, designerState, setDesignerState, formData, setFormData, setIsOpen },
  ref
) {
  const d = designerState[selected.id];

  const setD = (updates: Partial<DesignerPerOrder>) =>
    setDesignerState((prev) => ({ ...prev, [selected.id]: { ...prev[selected.id], ...updates } }));

  const toggleFlag = (key: keyof DesignerPerOrder["flags"]) =>
    setDesignerState((prev) => ({
      ...prev,
      [selected.id]: {
        ...prev[selected.id],
        flags: { ...prev[selected.id].flags, [key]: !prev[selected.id].flags[key] },
      },
    }));

  const intakeFiles = formData.orderIntakeFiles || [];

  // ------------------ Design Files handlers (local only) ------------------
  const onAddDesignFiles = (files: FileList | null) => {
    if (!files) return;
    const items: FileItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));
    setD({ designFiles: [...(d?.designFiles || []), ...items] });
  };

  const clearAllDesignFiles = () => {
    (d?.designFiles || []).forEach((f) => URL.revokeObjectURL(f.url));
    setD({ designFiles: [] });
  };

  const removeDesignFile = (id: string) => {
    const found = d?.designFiles?.find((x) => x.id === id);
    if (found) URL.revokeObjectURL(found.url);
    setD({ designFiles: (d?.designFiles || []).filter((x) => x.id !== id) });
  };

  // --- helper to persist image previews across refresh
  const fileToDataURL = (file: File) =>
    new Promise<string | undefined>((resolve) => {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const isImg = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext);
      if (!isImg) return resolve(undefined);
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : undefined);
      fr.onerror = () => resolve(undefined);
      fr.readAsDataURL(file);
    });

  // ------------------ Final Artwork handlers (local + manifest + mirror) ------------------
  const onAddFinalArtworks = async (files: FileList | null) => {
    if (!files) return;

    const items: FileItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));

    // local thumbnails (fast UI)
    setD({ finalArtworks: [...(d?.finalArtworks || []), ...items] });

    const addedDesigner = await Promise.all(
      items.map(async (x) => {
        const ext = (x.file.name.split(".").pop() || "").toLowerCase();
        const isImg = isImageExt(ext);
        const previewUrl = isImg ? await fileToDataURL(x.file) : undefined;
        return {
          id: x.id,
          name: x.file.name,
          size: x.file.size,
          type: x.file.type,
          ext,
          isImage: isImg,
          url: x.url,
          previewUrl,
        };
      })
    );

    const addedIntake: UploadMeta[] = items.map((x) => ({
      name: x.file.name,
      size: x.file.size,
      type: x.file.type,
    }));

    setFormData((prev: any) => {
      const prevMap = prev?.designerUploads || {};
      const prevList = prevMap[selected.id] || [];
      return {
        ...(prev || {}),
        designerUploads: {
          ...prevMap,
          [selected.id]: [...prevList, ...addedDesigner],
        },
        orderIntakeFiles: [...(prev?.orderIntakeFiles || []), ...addedIntake],
      };
    });
  };

  const removeFinalArtwork = (id: string) => {
    const found = d?.finalArtworks?.find((x) => x.id === id);
    if (found) URL.revokeObjectURL(found.url);

    setD({ finalArtworks: (d?.finalArtworks || []).filter((x) => x.id !== id) });

    setFormData((prev: any) => {
      const map = { ...(prev?.designerUploads || {}) };
      const list = (map[selected.id] || []).filter((f: any) => f.id !== id);

      const toDropName = found?.file.name;
      const toDropSize = found?.file.size;
      let intake = (prev?.orderIntakeFiles || []).slice();
      if (toDropName && typeof toDropSize === "number") {
        const idx = intake.findIndex((m: UploadMeta) => m.name === toDropName && m.size === toDropSize);
        if (idx !== -1) intake.splice(idx, 1);
      }

      return { ...(prev || {}), designerUploads: { ...map, [selected.id]: list }, orderIntakeFiles: intake };
    });
  };

  const clearAllFinalArtworks = () => {
    (d?.finalArtworks || []).forEach((f) => URL.revokeObjectURL(f.url));
    setD({ finalArtworks: [] });

    setFormData((prev: any) => {
      const map = { ...(prev?.designerUploads || {}) };
      const removed = map[selected.id] || [];
      delete map[selected.id];

      const rmSet = new Set(removed.map((r: any) => `${r.name}|${r.size}`));
      const intake = (prev?.orderIntakeFiles || []).filter((m: UploadMeta) => !rmSet.has(`${m.name}|${m.size}`));

      return { ...(prev || {}), designerUploads: map, orderIntakeFiles: intake };
    });
  };

  useEffect(() => {
    return () => {
      const cur = designerState[selected.id];
      cur?.designFiles?.forEach((f) => URL.revokeObjectURL(f.url));
      cur?.finalArtworks?.forEach((f) => URL.revokeObjectURL(f.url));
    };
  }, [designerState, selected.id]);

  // Sales helpers (kept for future use)
  const sales = formData || ({} as any);
  const rawLines: any[] =
    (Array.isArray(sales.items) && sales.items) ||
    (Array.isArray(sales.products) && sales.products) ||
    (Array.isArray(sales.lineItems) && sales.lineItems) ||
    [];
  const lines = rawLines.map((it: any) => {
    const desc = it.description ?? it.desc ?? it.name ?? it.title ?? "—";
    const qty = Number(it.qty ?? it.quantity ?? it.units ?? 0) || 0;
    const rate = Number(it.rate ?? it.price ?? it.unitPrice ?? 0) || 0;
    const total = Number(it.total ?? it.amount ?? qty * rate) || 0;
    return { desc, qty, rate, total };
  });
  const numericEntries = Object.entries(sales)
    .filter(([k, v]) => {
      if (["grandTotal", "finalPrice", "total"].includes(k)) return false;
      if (Array.isArray(v) || (v && typeof v === "object")) return false;
      return typeof v === "number" && Number.isFinite(v);
    })
    .map(([k, v]) => ({ key: k, value: Number(v) }));

  // ⬇️ Intake products for this order
  const intakeProducts: Array<{ name: string; qty: number }> =
    (formData as any)?.intakeProductsMap?.[selected.id] || [];

  // ⬇️ Order Information for this order
  const orderInformation: Array<{ product: string; spec: string }> =
    (formData as any)?.orderInformationMap?.[selected.id] ||
    (intakeProducts || []).map((p: any) => ({ product: p.name, spec: "" }));

  return (
    <Dialog.Panel
      ref={ref}
      className="w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-white sticky top-0 z-10">
        <div>
          <Dialog.Title className="text-lg font-semibold text-[#891F1A]">Designer Panel — {selected.id}</Dialog.Title>
        </div>
        <button onClick={() => setIsOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
          Close
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-4 py-4 lg:px-6 lg:py-6 overscroll-contain scroll-pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT SIDE */}
          <div className="space-y-5">
            {/* Order Details (full height card) */}
            <div className="rounded-2xl border border-black bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-100 border-b border-black">
                <h3 className="text-sm font-semibold text-gray-900">Order Details</h3>
              </div>
              <div className="grid grid-cols-2 text-sm">
                <div className="flex items-center gap-2 px-6 py-3 border-b border-black border-r">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-bold text-gray-900">{selected.id}</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-3 border-b border-black">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-bold text-gray-900">{normalizeToYMD(selected.date) || selected.date}</span>
                </div>
                <div className="col-span-2 flex items-center gap-2 px-6 py-3">
                  <span className="text-gray-600">Title:</span>
                  <span className="font-bold text-gray-900">{selected.title}</span>
                </div>
              </div>
            </div>

            {/* Products table */}
            <IntakeProductsTable items={intakeProducts} />

            {/* Files from Client (uniform) */}
            <div className="rounded-2xl border border-black bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-100 border-b border-black">
                <h3 className="text-sm font-semibold text-gray-900">Files from Client (Requirements)</h3>
              </div>
              <div className="p-4">
                {intakeFiles.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {intakeFiles.map((file, i) => (
                      <FileBadge key={`${file.name}-${i}`} file={file} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No files uploaded in Order Intake.</p>
                )}
              </div>
            </div>

            {/* Final Artwork (uniform) */}
            <div className="rounded-2xl border border-black bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-100 border-b border-black flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">🎯 Final Artwork</h3>
                {(d?.finalArtworks?.length || 0) > 0 && (
                  <button onClick={clearAllFinalArtworks} className="text-xs text-red-600 hover:text-red-700">
                    Clear All
                  </button>
                )}
              </div>

              <div className="p-4">
                <label className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50 p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.ai,.psd,.eps,.svg,.zip"
                    className="hidden"
                    onChange={(e) => onAddFinalArtworks(e.target.files)}
                  />
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">Upload Final Artwork (multiple)</div>
                    <div className="text-xs">Images, PDF, AI, PSD, EPS, SVG, ZIP</div>
                  </div>
                </label>

                {(d?.finalArtworks?.length || 0) > 0 && (
                  <div className="mt-4 space-y-4">
                    {/* Image thumbnails */}
                    <div className="grid grid-cols-2 gap-3">
                      {d.finalArtworks
                        .filter((f) => isImageExt(f.file.name.split(".").pop()))
                        .map((f) => (
                          <div key={f.id} className="relative group overflow-hidden rounded-lg border bg-gray-50">
                            <img src={f.url} alt={f.file.name} className="h-40 w-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[11px] px-2 py-1 truncate">
                              {f.file.name}
                            </div>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              <a
                                href={f.url}
                                download={f.file.name}
                                className="text-[11px] px-2 py-1 rounded border bg-white/90 hover:bg-white"
                              >
                                Download
                              </a>
                              <button
                                onClick={() => removeFinalArtwork(f.id)}
                                className="text-[11px] px-2 py-1 rounded border bg-white/90 text-red-600 hover:bg-white"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Non-image files */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {d.finalArtworks
                        .filter((f) => !isImageExt(f.file.name.split(".").pop()))
                        .map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between px-3 py-2 text-sm border rounded-lg bg-gray-50"
                          >
                            <div className="min-w-0">
                              <div className="font-medium truncate" title={f.file.name}>
                                {f.file.name}
                              </div>
                              <div className="text-[11px] text-gray-500">{formatBytes(f.file.size)}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={f.url}
                                download={f.file.name}
                                className="text-[11px] px-2 py-1 rounded border hover:bg-gray-100"
                              >
                                Download
                              </a>
                              <button
                                onClick={() => removeFinalArtwork(f.id)}
                                className="text=[11px] px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Internal Comment */}
            <InternalCommentSection
              orderId={selected.id}
              internalComment={d?.internalComment || ""}
              setDesignerState={setDesignerState}
              setFormData={setFormData}
            />
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-5">
            {/* Order Information table */}
            <OrderInformationTable items={orderInformation} />

            {/* Output Checklist */}
            <OutputChecklistCard flags={d?.flags} onToggle={(k) => toggleFlag(k)} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-4 py-4 flex justify-center">
        <div className="flex items-center gap-2">
          <label htmlFor="sendTo" className="text-sm font-medium text-gray-700">
            Send to:
          </label>
          <select
            id="sendTo"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#891F1A]/30 focus:border-[#891F1A] transition"
            value={(formData as any)?.sendTo ?? "Sales"}
            onChange={(e) =>
              setFormData((prev: any) => ({
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
  );
});

/* =========================
   Page Component
========================= */

export default function DesignerOrdersTablePage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [q, setQ] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  // Local-only state (replaces useOrderStore)
  const [formData, setFormData] = useState<SharedFormData>({});
  const [designerState, setDesignerState] = useState<Record<string, DesignerPerOrder>>({});

  const openForRow = useCallback(
    (row: Row) => {
      setSelected(row);

      setFormData((prev: SharedFormData) => {
        const nextId = row.id;
        const prevId = prev?.orderId;
        const prevMap = prev?.intakeProductsMap || {};
        const clonedMap = { ...prevMap };

        if (prevId && prevMap[prevId] && !prevMap[nextId]) {
          clonedMap[nextId] = prevMap[prevId];
        }

        return {
          ...prev,
          orderId: nextId,
          projectDescription: row.title,
          clientLocation: prev?.clientLocation || "Dubai",
          intakeProductsMap: clonedMap,
        };
      });

      setDesignerState((prev) => {
        if (prev[row.id]) return prev;
        return {
          ...prev,
          [row.id]: {
            internalComment: (formData as any).internalComments?.[row.id] || "",
            designFiles: [],
            finalArtworks: [],
            flags: { pdf: false, cmyk: false, final: false },
          },
        };
      });

      setIsOpen(true);
    },
    [setFormData, formData]
  );

  const filtered = useMemo(() => {
    return DATA.filter((r) => {
      const okDay = selectedDate ? normalizeToYMD(r.date) === selectedDate : true;
      const hay = [r.id, r.title, r.date, r.time, r.urgency].join(" ").toLowerCase();
      const okQuery = q.trim() === "" ? true : hay.includes(q.toLowerCase());
      return okDay && okQuery;
    });
  }, [selectedDate, q]);

  const by = (s: Status) => filtered.filter((r) => r.status === s);

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
                  <td className="px-3 py-3 text-center">{normalizeToYMD(r.date) || r.date}</td>
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-black">
      <DashboardNavbar />
      <div className="h-4 sm:h-5 md:h-6" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-[#891F1A]">Designer Orders</h1>
          </div>
          <div className="flex gap-2" />
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="order-date" className="text-sm font-medium text-gray-700">
              Day
            </label>
            <input
              id="order-date"
              type="date"
              aria-label="Select day to filter orders"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded border bg-white"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="text-xs underline text-gray-600"
                aria-label="Clear selected day"
              >
                Clear
              </button>
            )}
          </div>
          <input
            placeholder="Search (Order Id, order, date, time, urgency)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="px-3 py-2 rounded border bg-white flex-1 w-full md:w-auto"
          />
        </div>

        {/* Sections */}
        <div className="mt-6 grid grid-cols-1 gap-6">
          <Section title="New Orders" rows={by("New")} />
          <Section title="Active Orders" rows={by("Active")} />
          <Section title="Completed Orders" rows={by("Completed")} />
        </div>
      </div>

      {/* Designer Popup */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
          <Transition.Child
            as="div"
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as="div"
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95 translate-y-1"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-1"
              >
                {isOpen && selected ? (
                  <SelectedPopup
                    selected={selected}
                    designerState={designerState}
                    setDesignerState={setDesignerState}
                    formData={formData}
                    setFormData={setFormData}
                    setIsOpen={setIsOpen}
                  />
                ) : null}
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
