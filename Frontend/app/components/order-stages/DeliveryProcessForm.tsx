// components/order-stages/OrderIntakeForm.tsx
import { Send, UploadCloud } from "lucide-react";
import { Button } from "../Button";
import { Card } from "../Card";
import { Separator } from "../Separator";
import { useState } from "react";

export default function OrderIntakeForm({ formData, setFormData }: any) {
  const [deliveryCode, setDeliveryCode] = useState<string>("");
  const [riderPhoto, setRiderPhoto] = useState<File | null>(null);

  function generateCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setDeliveryCode(code);
    // TODO: Add SMS sending logic here
  }

  function handleUpload() {
    if (!riderPhoto) {
      alert("Please select a photo to upload.");
      return;
    }
    alert(`Photo "${riderPhoto.name}" uploaded successfully.`);
  }

  return (
    <Card className="animate-fadeInUp text-black bg-white shadow-md rounded-xl p-6 md:p-8 space-y-6 w-full border-0">

      <h2 className="text-xl font-bold text-gray-900">Secure Delivery</h2>
      <Separator />

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
        <Button onClick={generateCode} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow">
          Generate Code & Save
        </Button>
      </div>

      

     


      {/* Delivery Status Dropdown */}
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">Delivery Status</label>
        <select
          value={formData.deliveryStatus || "Dispatched"}
          onChange={(e) =>
            setFormData({ ...formData, deliveryStatus: e.target.value })
          }
          className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option>Dispatched</option>
          <option>Delivered</option>
        </select>
      </div>
    </Card>
  );
}
