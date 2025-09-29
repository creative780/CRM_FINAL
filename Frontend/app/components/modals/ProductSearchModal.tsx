"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { BaseProduct } from "@/app/types/products";
import { searchProducts } from "@/app/lib/products";
import ProductCard from "@/app/components/products/ProductCard";

export interface ProductSearchModalProps {
  open: boolean;
  onClose: () => void;
  onPickBaseProduct: (product: BaseProduct, initialQty?: number) => void;
}

export default function ProductSearchModal({
  open,
  onClose,
  onPickBaseProduct
}: ProductSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BaseProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  // Debounced search
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchQuery: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (!searchQuery.trim()) {
            setResults([]);
            return;
          }

          setLoading(true);
          setError(null);
          
          try {
            const searchResults = await searchProducts(searchQuery);
            setResults(searchResults);
          } catch (err) {
            setError("Failed to search products");
            console.error("Search error:", err);
          } finally {
            setLoading(false);
          }
        }, 400);
      };
    })(),
    []
  );

  // Handle search input changes
  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setError(null);
      setLoading(false);
      setProductQuantities({});
    }
  }, [open]);

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

  const handleProductClick = (product: BaseProduct) => {
    const quantity = productQuantities[product.id] || 1;
    onPickBaseProduct(product, quantity);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setProductQuantities(prev => ({
      ...prev,
      [productId]: quantity
    }));
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking on the backdrop (not on the modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

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
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Search Products</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#891F1A] focus:border-transparent"
              autoFocus
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">{error}</div>
              <button
                onClick={() => debouncedSearch(query)}
                className="text-sm text-[#891F1A] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : !query.trim() ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Enter a search term to find products</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
              <p className="text-gray-500">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No products found for "{query}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  mode="result"
                  name={product.name}
                  imageUrl={product.imageUrl}
                  quantity={1}
                  onClick={() => handleProductClick(product)}
                  qtyInputProps={{
                    value: productQuantities[product.id] || 1,
                    onChange: (e) => {
                      const qty = parseInt(e.target.value) || 1;
                      handleQuantityChange(product.id, qty);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}