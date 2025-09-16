"use client";

import React from "react";
import { Card } from "../Card";
import { Separator } from "../Separator";
import { Button } from "../Button";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleMarkPrinted: () => Promise<void>;
}

export default function PrintingQAForm({ formData, setFormData, handleMarkPrinted }: Props) {
  return (
    <Card className="text-black bg-white shadow-md rounded-xl p-6 md:p-8 space-y-6 w-full border-0">
      <h2 className="text-xl font-bold text-gray-900">Printing & QA</h2>
      <Separator />

      <div className="grid gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Print Operator</label>
          <input
            type="text"
            value={formData.printOperator || ""}
            onChange={(e) => setFormData({ ...formData, printOperator: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Print Time</label>
          <input
            type="datetime-local"
            value={formData.printTime || ""}
            onChange={(e) => setFormData({ ...formData, printTime: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Batch Info</label>
          <input
            type="text"
            value={formData.batchInfo || ""}
            onChange={(e) => setFormData({ ...formData, batchInfo: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Print Status</label>
          <select
            value={formData.printStatus || "Pending"}
            onChange={(e) => setFormData({ ...formData, printStatus: e.target.value })}
            className="border rounded px-3 py-2 bg-white text-black"
          >
            <option>Pending</option>
            <option>Printing</option>
            <option>Printed</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">QA Checklist</label>
          <textarea
            rows={3}
            value={formData.qaChecklist || ""}
            onChange={(e) => setFormData({ ...formData, qaChecklist: e.target.value })}
            className="border rounded px-3 py-2 resize-none"
          />
        </div>
      </div>

      <Button onClick={handleMarkPrinted} className="bg-blue-600 hover:bg-blue-700 text-white mt-4">
        Mark Printed
      </Button>
    </Card>
  );
}

