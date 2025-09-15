"use client";

import { Button } from "../Button";
import { Card } from "../Card";
import { Separator } from "../Separator";

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  deliveryCode: string;
  generateCode: () => Promise<void>;
  riderPhoto: File | null;
  setRiderPhoto: (file: File | null) => void;
  handleUpload: () => Promise<void>;
  canGenerate: boolean;
}

export default function DeliveryProcessForm({
  formData,
  setFormData,
  deliveryCode,
  generateCode,
  riderPhoto,
  setRiderPhoto,
  handleUpload,
  canGenerate,
}: Props) {
  return (
    <Card className="animate-fadeInUp text-black bg-white shadow-md rounded-xl p-6 md:p-8 space-y-6 w-full border-0">
      <h2 className="text-xl font-bold text-gray-900">Secure Delivery</h2>
      <Separator />

      {/* Phone Number */}
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">Recipient Phone</label>
        <input
          type="tel"
          value={formData.phone || ""}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Delivery Code */}
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">Delivery Code</label>
        <input
          type="text"
          value={deliveryCode}
          readOnly
          className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
        />
      </div>

      {/* Generate Code Button */}
      <div>
        <Button
          onClick={generateCode}
          disabled={!canGenerate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow disabled:opacity-50"
        >
          Generate Code & Save
        </Button>
      </div>

      {/* Rider Photo Upload */}
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">Rider Photo</label>
        <input
          type="file"
          onChange={(e) => setRiderPhoto(e.target.files?.[0] || null)}
          disabled={!canGenerate}
          className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
        />
        {riderPhoto && (
          <Button
            onClick={handleUpload}
            disabled={!canGenerate}
            className="mt-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            Upload Photo
          </Button>
        )}
      </div>

      {/* Delivery Status Dropdown */}
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">Delivery Status</label>
        <select
          value={formData.deliveryStatus || "Dispatched"}
          onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option>Dispatched</option>
          <option>Delivered</option>
        </select>
      </div>
    </Card>
  );
}

