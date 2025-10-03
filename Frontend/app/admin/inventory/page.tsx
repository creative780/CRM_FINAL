'use client';

import React, { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import toast, { Toaster } from 'react-hot-toast';

const mockInventory = [
  {
    id: 1,
    name: "Glossy Paper A4",
    category: "Paper",
    quantity: 1200,
    unit: "sheets",
    reorderLevel: 500,
    unitPrice: 0.15,
    usedIn: ["Business Cards", "Flyers"],
    lastUpdated: "2025-08-05T12:00:00Z",
  },
  {
    id: 2,
    name: "Black Ink (Premium)",
    category: "Ink",
    quantity: 45,
    unit: "liters",
    reorderLevel: 50,
    unitPrice: 12.5,
    usedIn: ["Posters", "Stickers"],
    lastUpdated: "2025-08-03T09:30:00Z",
  },
  {
    id: 3,
    name: "Matte Vinyl Roll",
    category: "Vinyl",
    quantity: 80,
    unit: "rolls",
    reorderLevel: 20,
    unitPrice: 22.99,
    usedIn: ["Car Decals", "Wall Art"],
    lastUpdated: "2025-07-28T11:45:00Z",
  },
  {
    id: 4,
    name: "Color Toner Cyan",
    category: "Toner",
    quantity: 12,
    unit: "cartridges",
    reorderLevel: 10,
    unitPrice: 45.0,
    usedIn: ["Brochures"],
    lastUpdated: "2025-08-02T14:22:00Z",
  },
  {
    id: 5,
    name: "Kraft Paper",
    category: "Paper",
    quantity: 2500,
    unit: "sheets",
    reorderLevel: 1000,
    unitPrice: 0.08,
    usedIn: ["Packaging", "Menus"],
    lastUpdated: "2025-07-30T09:10:00Z",
  },
  {
    id: 6,
    name: "Photo Gloss Ink",
    category: "Ink",
    quantity: 18,
    unit: "liters",
    reorderLevel: 10,
    unitPrice: 19.75,
    usedIn: ["Photo Prints"],
    lastUpdated: "2025-07-29T16:40:00Z",
  },
  {
    id: 7,
    name: "White T-Shirt (L)",
    category: "Fabric",
    quantity: 300,
    unit: "pieces",
    reorderLevel: 100,
    unitPrice: 3.5,
    usedIn: ["Custom Tees"],
    lastUpdated: "2025-07-28T10:15:00Z",
  },
  {
    id: 8,
    name: "Heat Transfer Paper",
    category: "Transfer Paper",
    quantity: 500,
    unit: "sheets",
    reorderLevel: 200,
    unitPrice: 0.25,
    usedIn: ["T-Shirts", "Caps"],
    lastUpdated: "2025-07-25T13:55:00Z",
  },
  {
    id: 9,
    name: "Bubble Wrap Roll",
    category: "Packaging",
    quantity: 50,
    unit: "rolls",
    reorderLevel: 20,
    unitPrice: 5.9,
    usedIn: ["Shipping"],
    lastUpdated: "2025-07-24T08:10:00Z",
  },
  {
    id: 10,
    name: "Business Card Stock",
    category: "Paper",
    quantity: 10000,
    unit: "sheets",
    reorderLevel: 4000,
    unitPrice: 0.07,
    usedIn: ["Business Cards"],
    lastUpdated: "2025-08-01T12:00:00Z",
  },
  {
    id: 11,
    name: "Binding Spiral (A4)",
    category: "Binding",
    quantity: 600,
    unit: "units",
    reorderLevel: 200,
    unitPrice: 0.45,
    usedIn: ["Reports"],
    lastUpdated: "2025-08-01T12:00:00Z",
  },
  {
    id: 12,
    name: "Poster Paper Roll",
    category: "Paper",
    quantity: 95,
    unit: "rolls",
    reorderLevel: 30,
    unitPrice: 14.5,
    usedIn: ["Posters"],
    lastUpdated: "2025-07-22T16:30:00Z",
  },
  {
    id: 13,
    name: "Silver Foil Sheet",
    category: "Foil",
    quantity: 120,
    unit: "sheets",
    reorderLevel: 40,
    unitPrice: 1.2,
    usedIn: ["Gift Wrap"],
    lastUpdated: "2025-07-19T09:00:00Z",
  },
  {
    id: 14,
    name: "Holographic Sticker Sheet",
    category: "Stickers",
    quantity: 350,
    unit: "sheets",
    reorderLevel: 150,
    unitPrice: 0.95,
    usedIn: ["Labels"],
    lastUpdated: "2025-07-18T17:30:00Z",
  },
  {
    id: 15,
    name: "Envelopes (DL Size)",
    category: "Stationery",
    quantity: 2000,
    unit: "pieces",
    reorderLevel: 800,
    unitPrice: 0.05,
    usedIn: ["Mailers"],
    lastUpdated: "2025-07-15T11:00:00Z",
  },
  {
    id: 16,
    name: "Canvas Sheet (A3)",
    category: "Canvas",
    quantity: 70,
    unit: "sheets",
    reorderLevel: 30,
    unitPrice: 7.5,
    usedIn: ["Art Prints"],
    lastUpdated: "2025-07-12T15:20:00Z",
  },
  {
    id: 17,
    name: "PVC ID Cards (Blank)",
    category: "Plastic",
    quantity: 850,
    unit: "pieces",
    reorderLevel: 300,
    unitPrice: 0.35,
    usedIn: ["Employee Cards"],
    lastUpdated: "2025-07-11T10:05:00Z",
  },
  {
    id: 18,
    name: "Keychains (Metal)",
    category: "Merch",
    quantity: 90,
    unit: "units",
    reorderLevel: 50,
    unitPrice: 2.2,
    usedIn: ["Giveaways"],
    lastUpdated: "2025-07-09T14:45:00Z",
  },
  {
    id: 19,
    name: "Tumbler Boxes",
    category: "Packaging",
    quantity: 600,
    unit: "boxes",
    reorderLevel: 200,
    unitPrice: 1.05,
    usedIn: ["Tumblers"],
    lastUpdated: "2025-07-07T08:25:00Z",
  },
  {
    id: 20,
    name: "UV Coating Spray",
    category: "Finish",
    quantity: 30,
    unit: "cans",
    reorderLevel: 10,
    unitPrice: 6.5,
    usedIn: ["Cards", "Labels"],
    lastUpdated: "2025-07-05T10:30:00Z",
  },
  {
    id: 21,
    name: "Gloss Paper Roll (A2)",
    category: "Paper",
    quantity: 60,
    unit: "rolls",
    reorderLevel: 20,
    unitPrice: 9.99,
    usedIn: ["Brochures"],
    lastUpdated: "2025-07-03T13:40:00Z",
  },
  {
    id: 22,
    name: "Tote Bag (Cotton)",
    category: "Fabric",
    quantity: 100,
    unit: "pieces",
    reorderLevel: 40,
    unitPrice: 2.95,
    usedIn: ["Merchandise"],
    lastUpdated: "2025-07-01T09:30:00Z",
  },
  {
    id: 23,
    name: "Stamp Pad Ink",
    category: "Ink",
    quantity: 25,
    unit: "bottles",
    reorderLevel: 10,
    unitPrice: 3.2,
    usedIn: ["Stamping"],
    lastUpdated: "2025-06-28T15:45:00Z",
  },
  {
    id: 24,
    name: "Ribbon Rolls",
    category: "Packaging",
    quantity: 110,
    unit: "rolls",
    reorderLevel: 30,
    unitPrice: 1.1,
    usedIn: ["Gift Wrap"],
    lastUpdated: "2025-06-25T10:50:00Z",
  },
  {
    id: 25,
    name: "Eco Tote Bags",
    category: "Fabric",
    quantity: 40,
    unit: "pieces",
    reorderLevel: 50,
    unitPrice: 3.25,
    usedIn: ["Eco Campaigns"],
    lastUpdated: "2025-06-20T11:30:00Z",
  },
  {
    id: 26,
    name: "Magnet Sheet",
    category: "Stickers",
    quantity: 70,
    unit: "sheets",
    reorderLevel: 30,
    unitPrice: 1.8,
    usedIn: ["Fridge Magnets"],
    lastUpdated: "2025-06-18T09:10:00Z",
  },
  {
    id: 27,
    name: "Label Roll (Thermal)",
    category: "Labels",
    quantity: 300,
    unit: "rolls",
    reorderLevel: 100,
    unitPrice: 2.5,
    usedIn: ["Shipping"],
    lastUpdated: "2025-06-15T14:00:00Z",
  },
  {
    id: 28,
    name: "Foam Boards (A1)",
    category: "Display",
    quantity: 40,
    unit: "boards",
    reorderLevel: 15,
    unitPrice: 8.99,
    usedIn: ["Exhibits"],
    lastUpdated: "2025-06-10T12:00:00Z",
  },
  {
    id: 29,
    name: "ID Lanyards",
    category: "Stationery",
    quantity: 500,
    unit: "pieces",
    reorderLevel: 200,
    unitPrice: 0.6,
    usedIn: ["ID Cards"],
    lastUpdated: "2025-06-08T09:20:00Z",
  },
  {
    id: 30,
    name: "Gift Box (Large)",
    category: "Packaging",
    quantity: 70,
    unit: "boxes",
    reorderLevel: 25,
    unitPrice: 3.85,
    usedIn: ["Custom Gifts"],
    lastUpdated: "2025-06-05T08:30:00Z",
  },
];
export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<any>(null);
  const [inventory, setInventory] = useState(mockInventory);

  const filtered = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStockBadge = (qty: number, reorder: number) =>
    qty <= reorder ? (
      <Badge className="bg-red-100 text-red-700">Low</Badge>
    ) : (
      <Badge className="bg-green-100 text-green-700">OK</Badge>
    );

  const handleEditChange = (key: string, value: any) => {
    setEditItem((prev: any) => ({
      ...prev,
      [key]: key === 'quantity' || key === 'unitPrice' ? Number(value) : value,
    }));
  };

  const handleSave = () => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === editItem.id
          ? { ...editItem, lastUpdated: new Date().toISOString() }
          : item
      )
    );
    toast.success('Inventory updated successfully!');
    setEditItem(null);
  };

  return (
    <div className="bg-gray-100 h-screen p-6 overflow-hidden text-sm">
      <Toaster position="top-center" />

      <div className="max-w-[96rem] mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-[#891F1A]">Inventory</h2>
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-gray-500"
          />
        </div>

        {/* Table */}
        <div className="flex-1 rounded-xl shadow bg-white overflow-hidden">
          <div
            className="w-full h-full overflow-y-auto overflow-x-auto pr-2 scrollbar-custom"
            style={{ scrollBehavior: 'smooth' }}
          >
            <table className="w-full table-auto text-xs text-center divide-y divide-gray-100">
             <thead className="font-semibold sticky top-0 z-10">
  <tr>
    {[
      "ID",
      "Name",
      "Category",
      "Qty",
      "Unit",
      "Reorder",
      "Unit Price",
      "Total",
      "Stock",
      "Used In",
      "Last Updated",
      "Actions",
    ].map((label, index, array) => (
      <th
        key={label}
        className={cn(
          'px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20',
          index === 0 && 'rounded-tl-md',
          index === array.length - 1 && 'rounded-tr-md min-w-[6rem]'
        )}
      >
        <div className="flex items-center justify-center">{label}</div>
      </th>
    ))}
  </tr>
</thead>

              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-2 py-2 font-semibold">{item.id}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{item.name}</td>
                    <td className="px-2 py-2">{item.category}</td>
                    <td className="px-2 py-2">{item.quantity}</td>
                    <td className="px-2 py-2">{item.unit}</td>
                    <td className="px-2 py-2">{item.reorderLevel}</td>
                    <td className="px-2 py-2">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-2 py-2 font-semibold">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-2 py-2">
                      {getStockBadge(item.quantity, item.reorderLevel)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {item.usedIn.map((use, i) => (
                        <Badge
                          key={i}
                          className="bg-gray-100 text-gray-700 mr-1 mb-1"
                        >
                          {use}
                        </Badge>
                      ))}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500">
                      {item.lastUpdated}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => setEditItem({ ...item })}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-[30rem] p-6 relative animate-fadeInUp">
            <button
              onClick={() => setEditItem(null)}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Edit Inventory Item</h2>
            <div className="space-y-3">
  {/* Read-only fields */}
  <div>
    <label className="text-xs font-medium">Name</label>
    <input
      type="text"
      value={editItem.name}
      readOnly
      className="w-full border px-3 py-1 rounded bg-gray-100 text-gray-600"
    />
  </div>

  <div className="flex gap-3">
    <div className="flex-1">
      <label className="text-xs font-medium">Category</label>
      <input
        type="text"
        value={editItem.category}
        readOnly
        className="w-full border px-3 py-1 rounded bg-gray-100 text-gray-600"
      />
    </div>
    <div className="flex-1">
      <label className="text-xs font-medium">Unit</label>
      <input
        type="text"
        value={editItem.unit}
        readOnly
        className="w-full border px-3 py-1 rounded bg-gray-100 text-gray-600"
      />
    </div>
  </div>

  <div>
    <label className="text-xs font-medium">Reorder Level</label>
    <input
      type="number"
      value={editItem.reorderLevel}
      readOnly
      className="w-full border px-3 py-1 rounded bg-gray-100 text-gray-600"
    />
  </div>

  <div>
    <label className="text-xs font-medium">Used In</label>
    <input
      type="text"
      value={editItem.usedIn.join(', ')}
      readOnly
      className="w-full border px-3 py-1 rounded bg-gray-100 text-gray-600"
    />
  </div>

  {/* Editable fields */}
  <div className="flex gap-3">
    <div className="flex-1">
      <label className="text-xs font-medium">Quantity</label>
      <input
        type="number"
        value={editItem.quantity}
        onChange={(e) => handleEditChange('quantity', e.target.value)}
        className="w-full border px-3 py-1 rounded"
      />
    </div>
    <div className="flex-1">
      <label className="text-xs font-medium">Unit Price</label>
      <input
        type="number"
        step="0.01"
        value={editItem.unitPrice}
        onChange={(e) => handleEditChange('unitPrice', e.target.value)}
        className="w-full border px-3 py-1 rounded"
      />
    </div>
  </div>

  {/* Auto-calculated Total */}
  <div>
    <label className="text-xs font-medium">Total</label>
    <div className="w-full px-3 py-2 bg-gray-100 border rounded text-sm font-semibold">
      ${(editItem.quantity * editItem.unitPrice).toFixed(2)}
    </div>
  </div>

  <button
    className="mt-4 w-full bg-black text-white py-2 rounded hover:bg-gray-900"
    onClick={handleSave}
  >
    Save Changes
  </button>
</div>

          </div>
        </div>
      )}
    </div>
  );
}
