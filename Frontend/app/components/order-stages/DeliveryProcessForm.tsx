"use client";

import React, { useEffect } from "react";
import { Button } from "../Button";
import { Card } from "../Card";
import { Separator } from "../Separator";
import { saveFileMetaToStorage, loadFileMetaFromStorage, clearFilesFromStorage } from "@/app/lib/fileStorage";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  deliveryCode: string;
  generateCode: () => Promise<void>;
  riderPhoto: File | null;
  setRiderPhoto: React.Dispatch<React.SetStateAction<File | null>>;
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
  // Load rider photo from localStorage on component mount
  useEffect(() => {
    console.log('DeliveryProcessForm: Loading rider photo from localStorage');
    // Use the safe file storage function that handles quota limits
    import('@/app/lib/fileStorage').then(({ loadFilesFromStorageSafe }) => {
      const storedRiderPhotos = loadFilesFromStorageSafe('orderLifecycle_riderPhoto');
      console.log('DeliveryProcessForm: Stored rider photos:', storedRiderPhotos);
      console.log('DeliveryProcessForm: Current riderPhoto:', riderPhoto);
      if (storedRiderPhotos.length > 0 && !riderPhoto) {
        console.log('DeliveryProcessForm: Setting rider photo from localStorage');
        const storedMeta = storedRiderPhotos[0];
        
        // Convert StoredFileMeta to File object
        fetch(storedMeta.url || '')
          .then(response => response.blob())
          .then(blob => {
            const file = new File([blob], storedMeta.name, {
              type: storedMeta.type,
              lastModified: storedMeta.lastModified,
            });
            setRiderPhoto(file);
          })
          .catch(error => {
            console.error('Failed to convert StoredFileMeta to File:', error);
          });
      }
    });
  }, [riderPhoto]);

  // Save rider photo to localStorage whenever it changes
  useEffect(() => {
    console.log('DeliveryProcessForm: Saving rider photo to localStorage:', riderPhoto);
    if (riderPhoto) {
      // Use the safe file storage function that handles quota limits
      import('@/app/lib/fileStorage').then(({ saveFilesToStorageSafe }) => {
        saveFilesToStorageSafe('orderLifecycle_riderPhoto', [riderPhoto]);
        console.log('DeliveryProcessForm: Rider photo saved successfully');
      });
    } else {
      clearFilesFromStorage('orderLifecycle_riderPhoto');
      console.log('DeliveryProcessForm: Rider photo cleared from localStorage');
    }
  }, [riderPhoto]);

  return (
    <Card className="text-black bg-white shadow-md rounded-xl p-6 md:p-8 space-y-6 w-full border-0">
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
          className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500"
        />
      </div>

      <Button
        onClick={generateCode}
        disabled={!canGenerate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
      >
        Generate Code
      </Button>

      {/* Rider Photo Upload */}
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">Rider Photo</label>
        <input
          type="file"
          onChange={(e) => setRiderPhoto(e.target.files ? e.target.files[0] : null)}
          className="w-full"
        />
        {riderPhoto && (
          <Button onClick={handleUpload} className="mt-2 bg-green-600 hover:bg-green-700 text-white">
            Upload Photo
          </Button>
        )}
      </div>

      {/* Delivery Status */}
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">Delivery Status</label>
        <select
          value={formData.deliveryStatus || "Dispatched"}
          onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
        >
          <option>Dispatched</option>
          <option>Delivered</option>
        </select>
      </div>
    </Card>
  );
}

