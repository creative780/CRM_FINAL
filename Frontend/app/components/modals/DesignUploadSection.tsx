"use client";

import React, { useCallback, useRef, useState } from "react";

const DEFAULT_ACCEPT = [
  ".pdf", ".png", ".jpg", ".jpeg", ".svg", ".ai", ".psd", ".doc", ".docx"
];

export type DesignUploadSectionProps = {
  value?: File[];
  onChange?: (files: File[]) => void;
  readyDesign: boolean;
  setReadyDesign: (v: boolean) => void;
  needCustom: boolean;
  setNeedCustom: (v: boolean) => void;
  customText: string;
  setCustomText: (v: string) => void;
  accept?: string[];
};

export default function DesignUploadSection({
  value = [],
  onChange,
  readyDesign,
  setReadyDesign,
  needCustom,
  setNeedCustom,
  customText,
  setCustomText,
  accept = DEFAULT_ACCEPT,
}: DesignUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const arr = Array.from(files);

      // validate types
      const ok = arr.every(f => {
        const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
        return accept.includes(ext);
      });

      if (!ok) {
        setError(`Unsupported file type. Allowed: ${accept.join(", ")}`);
        return;
      }
      setError(null);
      onChange?.([...(value || []), ...arr]);
    },
    [accept, onChange, value]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-900 flex items-center gap-1">
        Design upload <span className="text-red-500">*</span>
      </label>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={onKey}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          "w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center",
          "transition-all cursor-pointer outline-none",
          isDragging ? "border-gray-900 bg-gray-50" : "border-gray-300 hover:border-gray-400"
        ].join(" ")}
        aria-label="Upload design file"
      >
        {/* Upload icon */}
        <div className="h-12 w-12 mb-3 flex items-center justify-center">
          <svg 
            className="h-12 w-12 text-gray-600" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            <path d="M12,14L16,18H13.5V21H10.5V18H8L12,14Z"/>
          </svg>
        </div>

        <div className="text-base font-medium text-gray-900">Upload your design files</div>
        <div className="text-sm text-gray-500">Click or drag & drop to upload <span className="text-red-500">(required)</span></div>
        <div className="text-xs text-gray-400 mt-1">
          Files supported: {accept.join(", ")}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={accept.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {value?.length > 0 && (
        <ul className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">
          {value.map((f, i) => (
            <li key={i} className="flex items-center justify-between py-1">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="text-xs underline text-gray-600 hover:text-gray-900"
                onClick={() => onChange?.(value.filter((_, idx) => idx !== i))}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Checkboxes */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <label className="flex items-center gap-2 text-sm text-gray-900">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={readyDesign}
            onChange={(e) => setReadyDesign(e.target.checked)}
          />
          Ready design
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-900">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={needCustom}
            onChange={(e) => setNeedCustom(e.target.checked)}
          />
          Need a custom design
        </label>
      </div>

      {/* Custom requirements textarea (visible only if needCustom is checked) */}
      {needCustom && (
        <div className="pt-1">
          <label className="text-sm text-gray-700">Custom requirements</label>
          <textarea
            placeholder="Describe your custom design needs…"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none bg-white placeholder:text-gray-400 focus:border-gray-900 focus:ring-0"
          />
        </div>
      )}
    </div>
  );
}
