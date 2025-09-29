"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import { BaseProduct, ConfiguredProduct, ProductAttribute } from "@/app/types/products";
import { getProductAttributes } from "@/app/lib/products";
import DesignUploadSection from "./DesignUploadSection";
import { saveFileMetaToStorage, loadFileMetaFromStorage, clearFilesFromStorage } from "@/app/lib/fileStorage";

export interface ProductConfigModalProps {
  open: boolean;
  onClose: () => void;
  baseProduct: BaseProduct | null;
  onConfirm: (configured: ConfiguredProduct) => void;
  initialQty?: number;
  initialAttributes?: Record<string, string>;
  initialPrice?: number;
  editingProductId?: string;
  onBack?: () => void; // New prop for back button
}

export default function ProductConfigModal({
  open,
  onClose,
  baseProduct,
  onConfirm,
  initialQty = 1,
  initialAttributes = {},
  initialPrice = 0,
  editingProductId,
  onBack
}: ProductConfigModalProps) {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Design upload state
  const [files, setFiles] = useState<File[]>([]);
  const [readyDesign, setReadyDesign] = useState(false);
  const [needCustom, setNeedCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  // Load design files from localStorage on component mount
  useEffect(() => {
    if (baseProduct) {
      const storageKey = `orderLifecycle_designFiles_${baseProduct.id}`;
      const storedFiles = loadFileMetaFromStorage(storageKey);
      if (storedFiles.length > 0) {
        // Convert stored file metadata back to File objects with proper name
        const loadedFiles = storedFiles.map(meta => {
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
        setFiles(loadedFiles);
      }
    }
  }, [baseProduct]);

  // Save design files to localStorage whenever files change
  useEffect(() => {
    if (baseProduct && files.length > 0) {
      const storageKey = `orderLifecycle_designFiles_${baseProduct.id}`;
      saveFileMetaToStorage(storageKey, files);
    } else if (baseProduct) {
      const storageKey = `orderLifecycle_designFiles_${baseProduct.id}`;
      clearFilesFromStorage(storageKey);
    }
  }, [files, baseProduct]);

  // Price calculation helpers
  const toQty = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  const baseUnitPrice = baseProduct?.defaultPrice || 0;
  
  const effectiveUnitPrice = useMemo(() => {
    const sumDelta = Object.entries(selectedAttributes).reduce((sum, [attrKey, optionValue]) => {
      if (!optionValue) return sum;
      const attr = attributes.find(a => a.key === attrKey);
      const option = attr?.options.find(o => o.value === optionValue);
      // Use priceDelta property, default to 0 if not present
      return sum + (option?.priceDelta ?? 0);
    }, 0);
    return Math.max(0, baseUnitPrice + sumDelta);
  }, [baseUnitPrice, selectedAttributes, attributes]);

  const finalPrice = useMemo(() => {
    return effectiveUnitPrice * toQty(quantity);
  }, [effectiveUnitPrice, quantity]);

  // Auto-update price when attributes change
  useEffect(() => {
    if (baseProduct && Object.keys(selectedAttributes).length > 0) {
      const newPrice = effectiveUnitPrice;
      setPrice(newPrice);
    }
  }, [effectiveUnitPrice, baseProduct]);

  // Load product attributes when baseProduct changes
  useEffect(() => {
    if (baseProduct && open) {
      setLoading(true);
      setError(null);
      
      getProductAttributes(baseProduct.id)
        .then((attrs) => {
          setAttributes(attrs);
          
          // Initialize selected attributes with first option if not set
          const initialSelections: Record<string, string> = {};
          attrs.forEach(attr => {
            if (initialAttributes && initialAttributes[attr.key]) {
              initialSelections[attr.key] = initialAttributes[attr.key];
            } else if (attr.options.length > 0) {
              initialSelections[attr.key] = attr.options[0].value;
            }
          });
          setSelectedAttributes(initialSelections);
          
          // Initialize price with default price or initial price
          const defaultPrice = baseProduct.defaultPrice || 0;
          setPrice(initialPrice || defaultPrice);
        })
        .catch((err) => {
          setError("Failed to load product attributes");
          console.error("Error loading attributes:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [baseProduct, open]); // Simplified dependencies

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setQuantity(initialQty ? initialQty.toString() : "");
      setError(null);
      // Don't set selectedAttributes here - let the first useEffect handle it
    } else {
      setAttributes([]);
      setSelectedAttributes({});
      setQuantity("");
      setPrice(0);
      setFiles([]);
      setReadyDesign(false);
      setNeedCustom(false);
      setCustomText("");
    }
  }, [open]); // Only depend on open

  // Handle escape key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      // Store original overflow style
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      
      return () => {
        document.removeEventListener("keydown", handleEscape);
        // Restore original overflow style
        document.body.style.overflow = originalOverflow;
      };
    } else {
      // Ensure scroll is restored when modal is closed
      document.body.style.overflow = "unset";
    }
  }, [open, onClose]);

  const handleAttributeChange = (key: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    if (!baseProduct) return;

    // Validate required attributes
    const missingAttributes = attributes
      .filter(attr => !selectedAttributes[attr.key])
      .map(attr => attr.label);

    if (missingAttributes.length > 0) {
      setError(`Please select: ${missingAttributes.join(", ")}`);
      return;
    }

    const qtyNum = toQty(quantity);
    if (qtyNum < 1) {
      setError("Quantity must be at least 1");
      return;
    }

    if (effectiveUnitPrice <= 0) {
      setError("Effective unit price must be greater than 0");
      return;
    }

    // Generate unique ID for the configured product
    const configuredProduct: ConfiguredProduct = {
      id: editingProductId || `${baseProduct.id}_${Date.now()}`,
      productId: baseProduct.id,
      name: baseProduct.name,
      imageUrl: baseProduct.imageUrl,
      quantity: qtyNum,
      price: effectiveUnitPrice, // Always use the calculated effective unit price
      attributes: selectedAttributes,
      sku: `${baseProduct.id}_${Object.values(selectedAttributes).join('_')}`,
      design: {
        ready: readyDesign,
        needCustom: needCustom,
        customRequirements: needCustom ? customText : "",
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
      }
    };

    onConfirm(configuredProduct);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking on the backdrop (not on the modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open || !baseProduct) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {onBack && !editingProductId && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Back to search"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Configure {baseProduct.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {editingProductId ? "Edit product configuration" : "Select options and quantity"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
              <p className="text-gray-500">Loading product options...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">{error}</div>
              <button
                onClick={() => {
                  setError(null);
                  if (baseProduct) {
                    setLoading(true);
                    getProductAttributes(baseProduct.id)
                      .then(setAttributes)
                      .catch(() => setError("Failed to load product attributes"))
                      .finally(() => setLoading(false));
                  }
                }}
                className="text-sm text-[#891F1A] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Existing Fields */}
              <div className="space-y-6">
                {/* Product Image with Name and Stock */}
                {baseProduct.imageUrl && (
                  <div className="flex items-start gap-4">
                    <img
                      src={baseProduct.imageUrl}
                      alt={baseProduct.name}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-1">
                        {baseProduct.name}
                      </h3>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">Stock Available:</span> 
                        <span className={`ml-1 font-semibold ${
                          (baseProduct.stock || 0) > (baseProduct.stockThreshold || 0) 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {baseProduct.stock || 'N/A'}
                        </span>
                        {baseProduct.stockThreshold && (
                          <span className="text-xs text-gray-500 ml-1">
                            (Threshold: {baseProduct.stockThreshold})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attributes */}
                {attributes.map((attribute) => (
                  <div key={attribute.key} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {attribute.label}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {attribute.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleAttributeChange(attribute.key, option.value)}
                          className={`
                            relative px-3 py-2 text-sm border rounded-lg transition-colors
                            ${selectedAttributes[attribute.key] === option.value
                              ? "bg-[#891F1A] text-white border-[#891F1A]"
                              : "bg-white text-gray-700 border-gray-300 hover:border-[#891F1A] hover:text-[#891F1A]"
                            }
                          `}
                        >
                          {option.label}
                          {option.priceDelta !== undefined && option.priceDelta !== 0 && (
                            <span className={`
                              absolute -top-3.5 -right-5 rounded px-1.5 py-0.5 text-xs font-medium border border-white shadow-sm z-10
                              ${option.priceDelta > 0 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                              }
                            `}>
                              {option.priceDelta > 0 ? `+AED ${option.priceDelta}` : `-AED ${Math.abs(option.priceDelta)}`}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Quantity */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="text"
                    placeholder="Qty"
                    value={quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow digits
                      const numericValue = value.replace(/\D/g, '');
                      setQuantity(numericValue);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#891F1A] focus:border-transparent"
                  />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Unit Price (AED)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#891F1A] focus:border-transparent"
                  />
                </div>

                {/* Configuration Summary */}
                {baseProduct && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Configuration Summary</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>Quantity: {quantity || "0"}</div>
                      <div>Unit Price: AED {effectiveUnitPrice.toFixed(2)}</div>
                      {attributes.map((attr) => {
                        const selectedValue = selectedAttributes[attr.key];
                        const selectedOption = attr.options.find(opt => opt.value === selectedValue);
                        if (selectedValue && selectedOption) {
                          return (
                            <div key={attr.key}>
                              {attr.label}: {selectedOption.label}
                            </div>
                          );
                        }
                        return null;
                      })}
                      <div className="font-bold">Final Price: AED {finalPrice.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Design Upload Section */}
              <div className="space-y-6">
                <DesignUploadSection
                  value={files}
                  onChange={setFiles}
                  readyDesign={readyDesign}
                  setReadyDesign={setReadyDesign}
                  needCustom={needCustom}
                  setNeedCustom={setNeedCustom}
                  customText={customText}
                  setCustomText={setCustomText}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || attributes.length === 0}
            className="px-4 py-2 bg-[#891F1A] text-white rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {editingProductId ? "Update Product" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}