"use client";
import { Card } from "../Card";
import { Separator } from "../Separator";
import { toast } from "react-hot-toast";
import { useRef, useState } from "react";
import QuotationPreview from "./QuotationPreview";
import { useReactToPrint } from "react-to-print";
import { Dialog } from "@headlessui/react";

export default function QuotationForm({ 
  formData, 
  setFormData, 
  selectedProducts = [], 
  onAddProduct, 
  onRemoveProduct, 
  onEditProduct 
}: any) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewRef = useRef(null);



  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: "Quotation",
  });

  const handleProductsChange = (products: any[]) => {
    // Convert products to the format expected by OrderIntakeForm
    const configuredProducts = products.map(product => ({
      id: product.id,
      productId: product.id,
      name: product.name,
      quantity: product.quantity,
      price: product.unitPrice || product.price,
      attributes: product.attributes || {},
      sku: product.sku || '',
      imageUrl: product.imageUrl || '',
      customRequirements: product.customRequirements || '',
    }));

    setFormData({
      ...formData,
      products: products,
      items: products, // Also update items for compatibility
      selectedProducts: configuredProducts, // Add this for OrderIntakeForm compatibility
    });
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch w-full gap-6 pt-6 px-4">
      {/* Form on the Left */}
      <div className="w-full lg:w-1/2">
        <Card className="animate-fadeInUp text-black bg-white shadow-md rounded-xl p-6 md:p-8 space-y-6 w-full border-0">
          <h2 className="text-xl font-bold text-gray-900">Quotation Details</h2>
          <Separator />

          {/* Company Name */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={formData.companyName || ""}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter company name..."
            />
          </div>

          {/* Phone Number */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone || ""}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter phone number..."
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Itemized Quotation Notes
            </label>
            <textarea
              value={formData.quotationNotes || ""}
              onChange={(e) =>
                setFormData({ ...formData, quotationNotes: e.target.value })
              }
              rows={4}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black resize-none"
              placeholder="Enter details..."
            />
          </div>

          {/* Pricing Status */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Pricing Status
            </label>
            <select
              value={formData.status || "Not Priced"}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
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
              { label: "Delivery Cost", key: "deliveryCost" },
              { label: "Discount", key: "discount" },
              { label: "Advance Paid", key: "advancePaid" },
            ].map(({ label, key }) => (
              <div className="flex flex-col" key={key}>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
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
                  placeholder="Enter amount..."
                />
              </div>
            ))}
          </div>

          {/* Custom Field */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Custom Field
            </label>
            <input
              type="text"
              value={formData.customField || ""}
              onChange={(e) =>
                setFormData({ ...formData, customField: e.target.value })
              }
              placeholder="Enter custom information..."
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Final Price (Editable) */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Final Price
            </label>
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
              placeholder="Enter final price..."
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-between pt-6">
            <button
              onClick={() => toast.success("Quotation Details saved!")}
              className="bg-[#891F1A] hover:bg-red-700 text-white font-medium px-6 py-2 rounded shadow"
            >
              Save
            </button>
          </div>
        </Card>
      </div>

      {/* Live Preview on the Right */}
      <div className="w-full lg:w-1/2">
        <div className="sticky top-0">
          <QuotationPreview 
            formData={formData} 
            onProductsChange={handleProductsChange}
            isEditable={true}
          />
        </div>
      </div>

      {/* Downloadable Preview Modal */}
      <Dialog
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/40" />
        <div className="relative bg-white rounded-lg w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Quotation Preview
            </Dialog.Title>
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="text-xl font-bold"
            >
              &times;
            </button>
          </div>

          <div ref={previewRef}>
            <QuotationPreview 
              formData={formData} 
              onProductsChange={handleProductsChange}
              isEditable={true}
            />
          </div>

          <div className="pt-6 text-right">
            <button
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded shadow"
            >
              Download PDF
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
