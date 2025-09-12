// app/components/quotation/QuotationFormWithPreview.tsx
"use client";

import { useRef } from "react";
import { Card } from "../Card";
import { Separator } from "../Separator";
import QuotationPreview from "../../components/order-stages/QuotationPreview";
import { toast } from "react-hot-toast";

type Props = {
  formData: any;
  setFormData: (u: any) => void;
};

export default function QuotationFormWithPreview({ formData, setFormData }: Props) {
  const previewRef = useRef(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 lg:pt-6 px-2 lg:px-0">
      {/* LEFT: Quotation form */}
      <div className="w-full">
        <Card className="text-black bg-white shadow-md rounded-xl p-6 md:p-8 space-y-6 w-full border-0">
          <h2 className="text-xl font-bold text-gray-900">Quotation Details</h2>
          <Separator />

          {/* Notes */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Itemized Quotation Notes
            </label>
            <textarea
              value={formData.quotationNotes || ""}
              onChange={(e) => setFormData({ ...formData, quotationNotes: e.target.value })}
              rows={4}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black resize-none"
              placeholder="Enter details..."
            />
          </div>

          {/* NEW: Customer fields directly under notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={formData.clientName || ""}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="e.g., Ali Khan"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.clientCompany || ""}
                onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                placeholder="e.g., Creative Prints LLC"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.clientPhone || ""}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                placeholder="+971-5xxxxxxxx"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Pricing Status */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Pricing Status</label>
            <select
              value={formData.status || "Not Priced"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option>Not Priced</option>
              <option>Pending Approval</option>
              <option>Approved</option>
            </select>
          </div>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Labour Cost", key: "labourCost" },
              { label: "Finishing Cost", key: "finishingCost" },
              { label: "Paper/Material Cost", key: "paperCost" },
              { label: "Machine Usage Cost", key: "machineCost" },
              { label: "Design Complexity Cost", key: "designCost" },
              { label: "Delivery Cost", key: "deleiveryCost" },
              { label: "Other Charges", key: "otherCharges" },
              { label: "Discount", key: "discount" },
            ].map(({ label, key }) => (
              <div className="flex flex-col" key={key}>
                <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={
                    formData[key] !== undefined && formData[key] !== null
                      ? formData[key]
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      [key]: val === "" ? "" : parseFloat(val) || 0,
                    });
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          {/* Payments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Advance Paid</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={formData.advancePaid ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    advancePaid: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="0"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Remaining (auto)</label>
              <input
                value={(() => {
                  const n = Number(
                    (formData._computedTotal ?? 0) - (parseFloat(formData.advancePaid) || 0)
                  );
                  return isNaN(n) ? "" : n.toFixed(2);
                })()}
                readOnly
                className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-gray-700"
              />
            </div>
          </div>

          {/* Custom Field */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Custom Field</label>
            <input
              type="text"
              value={formData.customField || ""}
              onChange={(e) => setFormData({ ...formData, customField: e.target.value })}
              placeholder="Enter custom information..."
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Final Price */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Final Price</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={formData.finalPrice ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  finalPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="0"
            />
          </div>

          {/* Save */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => {
                try {
                  toast.success("Quotation saved (in memory only)");
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to save quotation");
                }
              }}
              className="bg-[#891F1A] hover:bg-red-700 text-white font-medium px-6 py-2 rounded shadow"
            >
              Save
            </button>
          </div>
        </Card>
      </div>

      {/* RIGHT: Live preview */}
      <div className="w-full">
        <div className="sticky top-0">
          <QuotationPreview formData={formData} />
        </div>
      </div>
    </div>
  );
}
