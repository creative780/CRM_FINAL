export type Role = "admin" | "sales" | "designer" | "production" | "delivery" | "finance";

export interface BaseProduct {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface ProductAttribute {
  key: string; // "size", "color"
  label: string; // "Size", "Color"
  options: Array<{ value: string; label: string }>;
}

export interface ConfiguredProduct {
  id: string;              // unique per selection (uuid or baseId + timestamp)
  productId: string;       // base product id
  name: string;
  imageUrl?: string;
  quantity: number;
  attributes: Record<string, string>; // { size: "L", color: "Red" }
  sku?: string;
}