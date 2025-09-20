"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UploadMeta = {
  name: string;
  size: number;
  type?: string;
  // NOTE: blob/object URLs are runtime-only; don't rely on them after reload
  url?: string;
};

export type DesignerUploadedItem = {
  id: string;
  name: string;
  size: number;
  type?: string;
  ext?: string;
  isImage: boolean;

  /** Data URL used for image preview that survives refresh (optional). */
  previewUrl?: string;

  /** Runtime-only blob/object URL (good for same-tab downloads; may break after refresh). */
  url?: string;
};

/**
 * Shared form data used across various order stages. Added `specifications`, `sendTo`, `urgency` and `status`
 * as optional fields to support Sales UI without causing type errors.
 */
export type SharedFormData = {
  orderId?: string;
  projectDescription?: string;
  clientName?: string;
  clientCompany?: string;
  clientLocation?: string;

  /** Files shown in "Files from Client (Requirements)". */
  orderIntakeFiles: UploadMeta[];

  /** Designer notes keyed by orderId. */
  internalComments: Record<string, string>;

  /** Canonical per-order manifest for Production/Designer handoff. */
  designerUploads?: Record<string, DesignerUploadedItem[]>;

  /** Additional Sales/Quotation fields */
  specifications?: string;
  sendTo?: "Sales" | "Designer" | "Production";
  urgency?: string;
  status?: string;

  // --- Explicit sales cost fields (Sales UI) ---
  labourCost?: number;
  finishingCost?: number;
  paperMaterialCost?: number;
  machineUsageCost?: number;
  designComplexityCost?: number;
  deliveryCost?: number;
  otherCharges?: number;
  discount?: number;

  advancePaid?: number;     // alias of advancePayment
  remaining?: number;       // optional; Designer will auto-calc if absent
  customField?: string;
  finalPrice?: number;      // alias of finalTotal

  // --- Legacy numeric/financials (compat only) ---
  tax?: number;
  shipping?: number;
  vat?: number;
  advancePayment?: number;  // alias target for advancePaid
  finalTotal?: number;      // alias target for finalPrice

  /** Allow additional dynamic fields on formData */
  [key: string]: any;
};

type State = {
  formData: SharedFormData;

  setFormData: (
    partial:
      | Partial<SharedFormData>
      | ((prev: SharedFormData) => Partial<SharedFormData>)
  ) => void;

  appendIntakeFiles: (files: UploadMeta[]) => void;
  clearIntakeFiles: () => void;
  resetFormData: () => void;
};

const numericKeys: (keyof SharedFormData)[] = [
  "labourCost",
  "finishingCost",
  "paperMaterialCost",
  "machineUsageCost",
  "designComplexityCost",
  "deliveryCost",
  "otherCharges",
  "discount",
  "advancePaid",
  "advancePayment",
  "remaining",
  "tax",
  "shipping",
  "vat",
  "finalPrice",
  "finalTotal",
];

export const useOrderStore = create<State>()(
  persist(
    (set) => ({
      formData: {
        orderIntakeFiles: [],
        internalComments: {},
        designerUploads: {}, // keep shape from the start
      },

      setFormData: (partial) =>
        set((s) => {
          const rawUpdates =
            typeof partial === "function" ? partial(s.formData) : partial;

          const u: Partial<SharedFormData> = { ...rawUpdates };

          // --- Alias normalization ---
          if (u.finalPrice != null && u.finalTotal == null) u.finalTotal = u.finalPrice;
          if (u.finalTotal != null && u.finalPrice == null) u.finalPrice = u.finalTotal;

          if (u.advancePaid != null && u.advancePayment == null) u.advancePayment = u.advancePaid;
          if (u.advancePayment != null && u.advancePaid == null) u.advancePaid = u.advancePayment;

          // --- Coerce numerics ---
          for (const k of numericKeys) {
            const val = u[k];
            if (val !== undefined && val !== null) {
              const n = Number(val);
              if (!Number.isNaN(n)) (u as any)[k] = n;
            }
          }

          return { formData: { ...s.formData, ...u } };
        }),

      appendIntakeFiles: (files) =>
        set((s) => ({
          formData: {
            ...s.formData,
            orderIntakeFiles: [...s.formData.orderIntakeFiles, ...files],
          },
        })),

      clearIntakeFiles: () =>
        set((s) => ({
          formData: { ...s.formData, orderIntakeFiles: [] },
        })),

      resetFormData: () =>
        set({
          formData: {
            orderIntakeFiles: [],
            internalComments: {},
            designerUploads: {}, // keep shape on reset
          },
        }),
    }),
    {
      name: "order-store",
      // persist across refreshes and tabs
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // (optional) basic migrate to ensure designerUploads exists after older versions
      migrate: (state: any, version) => {
        if (!state?.formData) return state;
        if (!state.formData.designerUploads) {
          state.formData.designerUploads = {};
        }
        return state;
      },
    }
  )
);
