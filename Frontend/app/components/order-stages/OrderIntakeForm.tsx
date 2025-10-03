"use client";

import React, { useCallback, useState, useEffect } from "react";
import { Plus } from "lucide-react";
import SelectedProductsList from "@/app/components/products/SelectedProductsList";
import { ConfiguredProduct } from "@/app/types/products";
import { saveFileMetaToStorage, loadFileMetaFromStorage, clearFilesFromStorage } from "@/app/lib/fileStorage";

/**
 * Order intake form component used to collect the details necessary to create
 * or update a custom order. This component handles its own internal state
 * when uncontrolled and exposes a few named helpers for consumers.  The
 * default export is the component itself so it can be imported without
 * braces, while the named exports provide utilities for consumers to
 * construct initial form values.
 */

/* ===== Types ===== */
type Urgency = "Urgent" | "High" | "Normal" | "Low";
type Status = "New" | "Active" | "Completed";

export type Row = {
  id: string;
  title: string;
  date: string;
  time: string;
  urgency: Urgency;
  status: Status;
};

type UploadMeta = { name: string; size: number; type: string; url: string };

export interface OrderIntakeFormValues {
  clientName: string;
  companyName: string;
  phone: string;
  trn: string;
  email: string;
  address: string;
  specifications: string;
  urgency: Urgency;
  status: Status;
  orderId: string;
  orderDetails: string;
  previewDate: string;
  previewTime: string;
  // Allow additional keys for uncontrolled updates
  [key: string]: any;
}

type Props = {
  /** Optional callback fired when the user clicks Save.  The row passed
   * back is the row representation used by the table page. */
  onSaved?: (row: Row) => void;
  /** When provided, the form behaves as a controlled component. */
  formData?: OrderIntakeFormValues;
  /** Required when using controlled form data. */
  setFormData?: React.Dispatch<React.SetStateAction<any>>;
  /** Require that products/files are selected before allowing save. */
  requireProductsAndFiles?: boolean;
  /** Optional: show action buttons inside the form */
  onSaveDraft?: () => void | Promise<void>;
  onSendToSales?: () => void | Promise<void>;
  savingDraft?: boolean;
  sendingToSales?: boolean;
  selectedProducts?: ConfiguredProduct[];
  onAddProduct?: (e?: React.MouseEvent) => void;
  onRemoveProduct?: (id: string) => void;
  onEditProduct?: (id: string) => void;
};

/* ===== Helpers ===== */
const toLocalYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toLocalHM = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/* ===== Mini UI primitives ===== */
const Separator = () => <div className="h-px w-full bg-gray-200" />;
/**
 * Creates the default values for a new order intake.  Useful when
 * resetting the form after saving or when initializing controlled form
 * state.
 */
export const createOrderIntakeDefaults = (): OrderIntakeFormValues => {
  const now = new Date();
  return {
    clientName: "",
    companyName: "",
    phone: "",
    trn: "",
    email: "",
    address: "",
    specifications: "",
    urgency: "Normal",
    status: "New",
    orderId: `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    orderDetails: "",
    previewDate: toLocalYMD(now),
    previewTime: toLocalHM(now),
  };
};

const OrderIntakeForm: React.FC<Props> = ({
  onSaved = () => {},
  formData: controlledFormData,
  setFormData: controlledSetFormData,
  requireProductsAndFiles = false,
  onSaveDraft,
  onSendToSales,
  savingDraft = false,
  sendingToSales = false,
  selectedProducts = [],
  onAddProduct = () => {},
  onRemoveProduct = () => {},
  onEditProduct = () => {},
}) => {
  // Determine if the form is controlled
  const isControlled = controlledFormData !== undefined && controlledSetFormData !== undefined;
  const [internalFormData, setInternalFormData] = useState<OrderIntakeFormValues>(() =>
    controlledFormData ? { ...createOrderIntakeDefaults(), ...controlledFormData } : createOrderIntakeDefaults(),
  );
  const formData = (isControlled ? controlledFormData : internalFormData) || createOrderIntakeDefaults();
  
  // Use selectedProducts from formData if available (for quotation stage compatibility)
  const effectiveSelectedProducts = formData.selectedProducts || selectedProducts;
  const setFormData = useCallback(
    (update: any) => {
      if (isControlled && controlledSetFormData) {
        controlledSetFormData(update);
      } else {
        setInternalFormData((prev) => {
          const next = typeof update === "function" ? update(prev) : update;
          return next ?? prev;
        });
      }
    },
    [isControlled, controlledSetFormData],
  );

  const [intakeFiles, setIntakeFiles] = useState<UploadMeta[]>([]);

  // Load files from localStorage on component mount
  useEffect(() => {
    const storedFiles = loadFileMetaFromStorage('orderLifecycle_intakeFiles');
    if (storedFiles.length > 0) {
      // Convert StoredFileMeta to UploadMeta
      const uploadFiles = storedFiles.map(file => ({
        ...file,
        url: file.url || ''
      }));
      setIntakeFiles(uploadFiles);
    }
  }, []);

  // Save files to localStorage whenever intakeFiles changes
  useEffect(() => {
    if (intakeFiles.length > 0) {
      // Convert UploadMeta to File objects for storage
      const files = intakeFiles.map(meta => new File([], meta.name, { 
        type: meta.type,
        lastModified: Date.now()
      }));
      const urls = intakeFiles.map(meta => meta.url);
      saveFileMetaToStorage('orderLifecycle_intakeFiles', files, urls);
    } else {
      clearFilesFromStorage('orderLifecycle_intakeFiles');
    }
  }, [intakeFiles]);

  /** ===== Files ===== */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) {
      e.target.value = "";
      return;
    }
    const existing = new Set(intakeFiles.map((f) => `${f.name}_${f.size}`));
    const metas: UploadMeta[] = selected
      .filter((f) => !existing.has(`${f.name}_${f.size}`))
      .map((f) => ({ name: f.name, size: f.size, type: f.type, url: URL.createObjectURL(f) }));
    if (metas.length) setIntakeFiles((old) => [...old, ...metas]);
    e.target.value = "";
  };

  const handleFileRemove = (index: number) => {
    setIntakeFiles((prev) => {
      const removed = prev[index];
      if (removed?.url?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(removed.url);
        } catch {
          /* ignore */
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  /** ===== Products ===== */
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const hasAtLeastOneProduct = isClient && Array.isArray(effectiveSelectedProducts) && effectiveSelectedProducts.length > 0;

  /** ===== Validation ===== */
  const hasAtLeastOneFile = intakeFiles.length > 0;
  const hasProductDetails = hasAtLeastOneProduct;
/** ===== Save ===== */
  const handleSave = () => {
    if (!hasProductDetails) {
      alert("Please add at least one product before saving.");
      return;
    }
    if (requireProductsAndFiles && !hasAtLeastOneFile) {
      alert("Please upload at least one file before saving.");
      return;
    }

    const now = new Date();
    const date = toLocalYMD(now);
    const time = toLocalHM(now);

    const titleFromProducts =
      effectiveSelectedProducts.length > 0
        ? effectiveSelectedProducts.map((p) => `${p.quantity} x ${p.name}`).join(", ")
        : "Custom Order";

    const row: Row = {
      id: formData.orderId || `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      title: titleFromProducts,
      date,
      time,
      urgency: formData.urgency as Urgency,
      status: formData.status as Status,
    };

    onSaved(row);

    setFormData(createOrderIntakeDefaults());
    setIntakeFiles([]);
  };

  return (
    <div className="text-black bg-white rounded-xl p-6 md:p-8 space-y-6 w-full shadow shadow-gray-200 border">
      <h2 className="text-xl font-bold text-gray-900">Add Custom Order</h2>
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Name */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Client Name</label>
          <input
            type="text"
            value={formData.clientName ?? ""}
            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Company Name */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            type="text"
            value={formData.companyName ?? ""}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* (Preview) Date & Time */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Date (saved at submit)</label>
          <input
            type="text"
            value={formData.previewDate ?? ""}
            readOnly
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Time (saved at submit)</label>
          <input
            type="text"
            value={formData.previewTime ?? ""}
            readOnly
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-700"
          />
        </div>

        {/* Products */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Products</label>
              <p className="text-xs text-gray-500">Search, configure, and add one or more products to this order.</p>
            </div>
            <button
              type="button"
              onClick={(e) => onAddProduct(e)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#891F1A] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6f1814] sm:mt-0"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>

          {!isClient ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : hasAtLeastOneProduct ? (
            <SelectedProductsList
              items={effectiveSelectedProducts}
              onRemove={onRemoveProduct}
              onEdit={onEditProduct}
              className="pt-1"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No products added yet. Use the button above to add items.
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={formData.phone ?? ""}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* TRN */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">TRN</label>
          <input
            type="text"
            value={formData.trn ?? ""}
            onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Enter TRN number..."
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            value={formData.email ?? ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Address */}
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1">Address (with Zone)</label>
          <textarea
            value={formData.address ?? ""}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={2}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        {/* Specifications */}
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1">Specifications</label>
          <input
            type="text"
            value={formData.specifications ?? ""}
            onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Urgency */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Urgency</label>
          <select
            value={formData.urgency ?? "Normal"}
            onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Status (decides which section it shows in) */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status ?? "New"}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="New">New</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Order ID (readonly) */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Order ID</label>
          <input
            type="text"
            value={formData.orderId ?? ""}
            disabled
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>

      {(onSaveDraft || onSendToSales) && (
        <div className="pt-4 mt-2 border-t flex justify-end gap-3">
          {onSaveDraft && (
            <button
              type="button"
              onClick={() => onSaveDraft()}
              disabled={!!savingDraft}
              className="px-4 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {savingDraft ? "Saving..." : "Save as Draft"}
            </button>
          )}
          {onSendToSales && (
            <button
              type="button"
              onClick={() => onSendToSales()}
              disabled={!!sendingToSales}
              className="px-4 py-2 rounded bg-[#891F1A] text-white text-sm hover:bg-red-800 disabled:opacity-60"
            >
              {sendingToSales ? "Sending..." : "Send to Sales"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderIntakeForm;



















