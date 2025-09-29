"use client";

import React from "react";
import { ConfiguredProduct } from "@/app/types/products";
import ProductCard from "./ProductCard";

export interface SelectedProductsListProps {
  items: ConfiguredProduct[];
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  className?: string;
}

export default function SelectedProductsList({
  items,
  onRemove,
  onEdit,
  className = ""
}: SelectedProductsListProps) {
  if (items.length === 0) {
    return null;
  }


  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            mode="selected"
            name={item.name}
            imageUrl={item.imageUrl}
            quantity={item.quantity}
            price={item.price}
            onRemove={() => onRemove(item.id)}
            onEdit={() => onEdit(item.id)}
          />
        ))}
      </div>
      
      {/* Summary */}
      <div className="text-xs text-gray-600 pt-2 border-t border-gray-100">
        {items.length} product{items.length !== 1 ? 's' : ''} selected
        {items.length > 0 && (
          <>
            <span className="ml-2">
              • Total quantity: {items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
            </span>
            <span className="ml-2">
              • Total value: AED {items.reduce((sum, item) => {
                const price = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
                const quantity = item.quantity || 0;
                return sum + (price * quantity);
              }, 0).toFixed(2)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}