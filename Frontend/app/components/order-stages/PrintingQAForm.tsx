"use client";

import React, { useEffect } from "react";
import { Card } from "../Card";
import { Separator } from "../Separator";
import { Button } from "../Button";
import { saveFileMetaToStorage, loadFileMetaFromStorage, clearFilesFromStorage } from "@/app/lib/fileStorage";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleMarkPrinted: () => Promise<void>;
}

export default function PrintingQAForm({ formData, setFormData, handleMarkPrinted }: Props) {
  // Load print time from localStorage on component mount
  useEffect(() => {
    console.log('PrintingQAForm: Loading print time from localStorage');
    const storedPrintTime = localStorage.getItem('orderLifecycle_printTime');
    console.log('PrintingQAForm: Stored print time:', storedPrintTime);
    console.log('PrintingQAForm: Current formData.printTime:', formData.printTime);
    if (storedPrintTime && !formData.printTime) {
      console.log('PrintingQAForm: Setting print time from localStorage');
      setFormData((prev: any) => ({ ...prev, printTime: storedPrintTime }));
    }
  }, []);

  // Save print time to localStorage whenever it changes
  useEffect(() => {
    console.log('PrintingQAForm: Saving print time to localStorage:', formData.printTime);
    if (formData.printTime) {
      localStorage.setItem('orderLifecycle_printTime', formData.printTime);
      console.log('PrintingQAForm: Print time saved successfully');
    }
  }, [formData]);

  return (
    <Card className="text-black bg-white shadow-md rounded-xl p-6 md:p-8 space-y-6 w-full border-0">
      <h2 className="text-xl font-bold text-gray-900">Printing & QA</h2>
      <Separator />

      {/* Current Status Display */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Current Status</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            formData.printStatus === 'Printed' ? 'bg-green-500' : 
            formData.printStatus === 'Printing' ? 'bg-yellow-500' : 'bg-gray-400'
          }`}></div>
          <span className="text-sm text-gray-700">
            Print Status: <strong>{formData.printStatus || 'Pending'}</strong>
          </span>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Print Operator *</label>
          <input
            type="text"
            value={formData.printOperator || ""}
            onChange={(e) => setFormData({ ...formData, printOperator: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter operator name..."
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Print Time *</label>
          <input
            type="datetime-local"
            value={formData.printTime || ""}
            onChange={(e) => setFormData({ ...formData, printTime: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Batch Info *</label>
          <input
            type="text"
            value={formData.batchInfo || ""}
            onChange={(e) => setFormData({ ...formData, batchInfo: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter batch number or info..."
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Print Status</label>
          <select
            value={formData.printStatus || "Pending"}
            onChange={(e) => setFormData({ ...formData, printStatus: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Pending</option>
            <option>Printing</option>
            <option>Printed</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">QA Checklist</label>
          <textarea
            rows={4}
            value={formData.qaChecklist || ""}
            onChange={(e) => setFormData({ ...formData, qaChecklist: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter quality assurance checklist items..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <Button 
          onClick={handleMarkPrinted} 
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
          disabled={formData.printStatus === 'Printed'}
        >
          {formData.printStatus === 'Printed' ? 'Already Printed' : 'Mark as Printed'}
        </Button>
        
        {formData.printStatus === 'Printed' && (
          <div className="flex items-center text-green-600 text-sm">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Ready for Client Approval
          </div>
        )}
      </div>
    </Card>
  );
}

