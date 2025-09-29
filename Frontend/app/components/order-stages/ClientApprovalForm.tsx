"use client";

import { Card } from "../Card";
import { Separator } from "../Separator";
import { Button } from "../Button";
import { CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { useEffect } from "react";
import { saveFileMetaToStorage, loadFileMetaFromStorage, clearFilesFromStorage } from "@/app/lib/fileStorage";

export default function ClientApprovalForm({ formData, setFormData }: any) {
  const clientApprovalFiles = formData.clientApprovalFiles || [];

  // Load files from localStorage on component mount
  useEffect(() => {
    const storedFiles = loadFileMetaFromStorage('orderLifecycle_clientApprovalFiles');
    if (storedFiles.length > 0) {
      // Convert stored file metadata back to File objects with proper name
      const files = storedFiles.map(meta => {
        const file = new File([], meta.name, { 
          type: meta.type,
          lastModified: meta.lastModified
        });
        // Ensure the name property is properly set
        Object.defineProperty(file, 'name', {
          value: meta.name,
          writable: false
        });
        return file;
      });
      setFormData({ ...formData, clientApprovalFiles: files });
    }
  }, []);

  // Save files to localStorage whenever clientApprovalFiles changes
  useEffect(() => {
    if (clientApprovalFiles && clientApprovalFiles.length > 0) {
      saveFileMetaToStorage('orderLifecycle_clientApprovalFiles', clientApprovalFiles);
    } else {
      clearFilesFromStorage('orderLifecycle_clientApprovalFiles');
    }
  }, [clientApprovalFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles = selectedFiles.filter(
      (file) =>
        !clientApprovalFiles.some(
          (existing: File) =>
            existing.name === file.name && existing.size === file.size
        )
    );

    setFormData({
      ...formData,
      clientApprovalFiles: [...clientApprovalFiles, ...newFiles],
    });

    e.target.value = "";
  };

  const handleFileRemove = (indexToRemove: number) => {
    const updatedFiles = clientApprovalFiles.filter((_: File, i: number) => i !== indexToRemove);
    setFormData({
      ...formData,
      clientApprovalFiles: updatedFiles,
    });
  };

  return (
    <Card className="animate-fadeInUp text-black bg-white shadow-md rounded-xl p-6 md:p-8 space-y-6 w-full border-0">
      <h2 className="text-xl font-bold text-gray-900">Client Review & Approval</h2>
      <Separator />

      {/* Upload Requirements */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Upload Requirements</label>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition duration-200 shadow">
            📎 Choose Files
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {clientApprovalFiles.length > 0 && (
            <span className="text-sm text-gray-600">
              {clientApprovalFiles.length} file(s) selected
            </span>
          )}
        </div>

        {clientApprovalFiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {clientApprovalFiles.map((file: File, index: number) => {
              const fileName = file.name || `file_${index}`;
              const fileExtension = fileName.split('.').pop()?.toLowerCase();
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension || '');
              const isPdf = fileExtension === 'pdf';
              const isDoc = ['doc', 'docx'].includes(fileExtension || '');

              const getIcon = () => {
                if (isImage) return '🖼️';
                if (isPdf) return '📄';
                if (isDoc) return '📝';
                return '📁';
              };

              return (
                <div
                  key={index}
                  className="flex items-center justify-between border border-gray-300 rounded px-3 py-2 bg-white shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xl">{getIcon()}</span>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm truncate text-gray-800 font-medium">{fileName}</span>
                      <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFileRemove(index)}
                    className="ml-3 text-red-500 hover:text-red-700 text-sm font-bold transition duration-200"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons in Two Columns */}
      <div className="pt-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="default"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
            onClick={() => alert("Approved (client side)")}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve Order (Client Side)
          </Button>

          <Button
            variant="default"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow"
            onClick={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("Saved formData:", formData);
              }
              toast.success("Client Review & Approval section saved!");
            }}
          >
            Save
          </Button>
        </div>
      </div>

      {/* SLA Tracker */}
      <div className="text-sm text-gray-800 flex items-center justify-between pt-4">
        <span className="font-medium">SLA Tracker</span>
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
          12h 45m left
        </span>
      </div>
    </Card>
  );
}
