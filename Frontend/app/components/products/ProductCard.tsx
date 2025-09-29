"use client";

import React from "react";
import { X } from "lucide-react";

export interface ProductCardProps {
  mode: "result" | "selected";
  name: string;
  imageUrl?: string;
  quantity?: number;
  price?: number;               // unit price
  onClick?: () => void;         // for result select
  onRemove?: () => void;        // for selected remove
  onEdit?: () => void;          // for selected edit
  qtyInputProps?: React.InputHTMLAttributes<HTMLInputElement>; // for result qty
}

export default function ProductCard({
  mode,
  name,
  imageUrl,
  quantity,
  price,
  onClick,
  onRemove,
  onEdit,
  qtyInputProps
}: ProductCardProps) {
  const isResult = mode === "result";
  const isSelected = mode === "selected";


  return (
    <div
      className={`
        relative bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200
        ${isResult ? "cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-[#891F1A]" : ""}
        ${isSelected ? "cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-[#891F1A]" : ""}
      `}
      onClick={isResult ? onClick : (isSelected && onEdit ? onEdit : undefined)}
    >
      {/* Content - Horizontal Layout */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Image - Left side */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Right side - Name and Quantity stacked */}
          <div className="flex-1 min-w-0">
            {/* Product Name */}
            <h3 className="font-semibold text-sm text-gray-900 truncate mb-2">
              {name}
            </h3>

            {/* Quantity Section */}
            <div>
              {/* Quantity Input (result mode) */}
              {isResult && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-600 block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={qtyInputProps?.value !== undefined ? qtyInputProps.value : (quantity || 1)}
                    onChange={qtyInputProps?.onChange}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#891F1A] focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Quantity Display (selected mode) */}
              {isSelected && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">
                    <span className="text-gray-500">Qty:</span> {quantity || 1}
                  </div>
                  {price !== undefined && (
                    <div className="text-xs text-gray-600">
                      <span className="text-gray-500">Price:</span> AED {typeof price === 'number' ? price.toFixed(2) : parseFloat(price || 0).toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Remove Button (selected mode) */}
      {isSelected && onRemove && (
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors"
            title="Remove product"
          >
            <X className="w-3 h-3 text-red-600" />
          </button>
        </div>
      )}

      {/* Focus ring for accessibility */}
      {(isResult || (isSelected && onEdit)) && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-transparent focus-within:ring-[#891F1A] pointer-events-none" />
      )}
    </div>
  );
}