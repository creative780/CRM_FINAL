"use client";

import { Card } from "../Card";
import { Separator } from "../Separator";
import { toast } from "react-hot-toast";
import { useEffect } from "react";
import { saveFileMetaToStorage, loadFileMetaFromStorage, clearFilesFromStorage } from "@/app/lib/fileStorage";

// Mocked production data
const machines = [
  {
    name: "Laser Cutter",
    jobs: [
      { product: "Acrylic Sign", status: "Queued" },
      { product: "Wood Plaque", status: "In Progress" },
    ],
  },
  {
    name: "Printer",
    jobs: [
      { product: "Business Cards", status: "Complete" },
      { product: "Flyers", status: "Queued" },
      { product: "Stickers", status: "In Progress" },
      { product: "Booklets", status: "Queued" },
    ],
  },
];

// ✅ Status Badge Generator
const getStatusBadge = (status: string) => {
  const statusColors: Record<string, string> = {
    "Queued": "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-100 text-blue-800",
    "Complete": "bg-green-100 text-green-800",
  };

  return (
    <span
      className={`ml-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusColors[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
};

export default function OrderIntakeForm({ formData, setFormData }: any) {
  // Load files from localStorage on component mount
  useEffect(() => {
    console.log('DesignProductionForm: Loading requirements files from localStorage');
    // Use the safe file storage function that handles quota limits
    import('@/app/lib/fileStorage').then(({ loadFilesFromStorageSafe }) => {
      const storedFileMeta = loadFilesFromStorageSafe('orderLifecycle_requirementsFiles');
      console.log('DesignProductionForm: Stored file metadata:', storedFileMeta);
      console.log('DesignProductionForm: Current formData.requirementsFiles:', formData.requirementsFiles);
      
      // Don't automatically restore files from localStorage to avoid conflicts with actual file uploads
      // The metadata is just for display purposes when files were too large to store
      if (storedFileMeta.length > 0) {
        console.log('DesignProductionForm: Found stored file metadata (files were too large for localStorage)');
        // Store metadata separately for display purposes
        setFormData((prev: any) => ({ ...prev, storedRequirementsMeta: storedFileMeta }));
      }
    });
  }, []);

  // Save files to localStorage whenever requirementsFiles changes
  useEffect(() => {
    console.log('DesignProductionForm: Saving requirements files to localStorage:', formData.requirementsFiles);
    if (formData.requirementsFiles && formData.requirementsFiles.length > 0) {
      // Use the safe file storage function that handles quota limits
      import('@/app/lib/fileStorage').then(({ saveFilesToStorageSafe }) => {
        saveFilesToStorageSafe('orderLifecycle_requirementsFiles', formData.requirementsFiles);
        console.log('DesignProductionForm: Requirements files saved successfully');
      });
    } else {
      clearFilesFromStorage('orderLifecycle_requirementsFiles');
      console.log('DesignProductionForm: Requirements files cleared from localStorage');
    }
  }, [formData.requirementsFiles]);

  const handleSave = () => {
    toast.success("Design assignment saved successfully");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full px-4 py-6">
      {/* Left Card - Form Section */}
      <div className="w-full lg:w-1/2">
        <Card className="h-full bg-white shadow-md rounded-xl p-6 md:p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Design Assignment</h2>
            <Separator />

            {/* Assigned Designer/Productionist */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Assigned Designer/Productionist
              </label>
              <input
                type="text"
                value={formData.assignedDesigner || ""}
                onChange={(e) => setFormData({ ...formData, assignedDesigner: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Upload Requirements */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Upload Requirements</label>

              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition duration-200 shadow">
                  📎 Choose Files
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const selectedFiles = Array.from(e.target.files || []);
                      const existingFiles = formData.requirementsFiles || [];

                      const newFiles = selectedFiles.filter(
                        (file) =>
                          !existingFiles.some(
                            (existing: any) =>
                              existing.name === file.name && existing.size === file.size
                          )
                      );

                      setFormData({
                        ...formData,
                        requirementsFiles: [...existingFiles, ...newFiles],
                      });

                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>

                {formData.requirementsFiles?.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {formData.requirementsFiles.length} file(s) selected
                  </span>
                )}
              </div>

              {formData.requirementsFiles && formData.requirementsFiles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {formData.requirementsFiles.map((file: File, index: number) => {
                    const fileName = file.name || `file_${index}`;
                    const fileExtension = fileName.split(".").pop()?.toLowerCase();
                    const isImage = ["jpg", "jpeg", "png", "gif", "bmp"].includes(fileExtension || "");
                    const isPdf = fileExtension === "pdf";
                    const isDoc = ["doc", "docx"].includes(fileExtension || "");

                    const getIcon = () => {
                      if (isImage) return "🖼️";
                      if (isPdf) return "📄";
                      if (isDoc) return "📝";
                      return "📁";
                    };

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between border border-gray-300 rounded px-3 py-2 bg-white shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-xl">{getIcon()}</span>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm truncate text-gray-800 font-medium">
                              {fileName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              requirementsFiles: formData.requirementsFiles.filter(
                                (_: File, i: number) => i !== index
                              ),
                            })
                          }
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

              {/* Display stored file metadata when files were too large for localStorage */}
              {formData.storedRequirementsMeta && formData.storedRequirementsMeta.length > 0 && (
                <div className="mt-3">
                  <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-3">
                    <p className="text-sm text-blue-800">
                      📝 Previous files were too large to store fully - metadata preserved:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.storedRequirementsMeta.map((meta: any, index: number) => {
                      const fileName = meta.name || `file_${index}`;
                      const fileExtension = fileName.split(".").pop()?.toLowerCase();
                      const isImage = ["jpg", "jpeg", "png", "gif", "bmp"].includes(fileExtension || "");
                      const isPdf = fileExtension === "pdf";
                      const isDoc = ["doc", "docx"].includes(fileExtension || "");

                      const getIcon = () => {
                        if (isImage) return "🖼️";
                        if (isPdf) return "📄";
                        if (isDoc) return "📝";
                        return "📁";
                      };

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between border border-gray-300 rounded px-3 py-2 bg-gray-50 shadow-sm"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-xl">{getIcon()}</span>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm truncate text-gray-800 font-medium">
                                {fileName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {(meta.size / 1024).toFixed(1)} KB (metadata only)
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">📋</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Design Status */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Design Status</label>
              <select
                value={formData.designStatus || "Design in Progress"}
                onChange={(e) => setFormData({ ...formData, designStatus: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option>Design in Progress</option>
                <option>Design Complete</option>
              </select>
            </div>

            {/* Internal Comments */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Internal Comments / Revision Notes
              </label>
              <textarea
                rows={4}
                value={formData.revisionNotes || ""}
                onChange={(e) => setFormData({ ...formData, revisionNotes: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Add comments here..."
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 text-right">
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 shadow transition-all"
            >
              Save
            </button>
          </div>
        </Card>
      </div>

      {/* Right Card – Production Queue */}
      <div className="w-full lg:w-1/2">
        <Card className="h-full bg-white shadow-md rounded-xl p-6 md:p-8 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">Production Queue (Grouped by Machine)</h2>
          <Separator />

          <div className="space-y-4">
            {machines.map((machine, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800">{machine.name}</h3>
                <ul className="mt-2 space-y-2">
                  {machine.jobs.map((job, jobIndex) => (
                    <li
                      key={jobIndex}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded hover:bg-gray-100 transition-all"
                    >
                      <span className="text-sm text-gray-700">{job.product}</span>
                      {getStatusBadge(job.status)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            </div>



        </Card>
      </div>
    </div>
  );
}
