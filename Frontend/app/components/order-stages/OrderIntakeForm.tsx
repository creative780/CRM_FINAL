"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";

/** ===== Types ===== */
type Urgency = "Urgent" | "High" | "Normal" | "Low";
type Status = "New" | "Active" | "Completed";
export type Row = { id: string; title: string; date: string; time: string; urgency: Urgency; status: Status };

type IntakeProduct = { name: string; quantity: number };
type UploadMeta = { name: string; size: number; type: string; url: string };

type Props = {
  onSaved?: (row: Row) => void; // parent ko row bhejna
};

/** ===== Helpers ===== */
const toLocalYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toLocalHM = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** ===== Mini UI prmitives ===== */
const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`rounded-xl border bg-white shadow-sm ${className}`} {...props} />
);
const Separator = () => <div className="h-px w-full bg-gray-200" />;

/** ===== Grouped Product list (sample) ===== */
const GROUPED_PRODUCTS: Record<string, string[]> = {
  A: ["Acrylic Keychain", "Air Freshener"],
  B: ["Brochure", "Business Card"],
  C: ["Canvas Print", "Custom Calendar"],
  D: ["Desk Organizer", "Door Hanger"],
  E: ["Envelope", "Event Pass"],
  F: ["Flyer", "Foam Board"],
  G: ["Greeting Card", "Glass Trophy"],
  H: ["Hand Fan", "Hologram Sticker"],
  I: ["Invitation Card", "ID Badge"],
  J: ["Journal", "Jigsaw Puzzle"],
  K: ["Key Holder", "Kraft Bag"],
  L: ["Label Sticker", "Lanyard"],
  M: ["Mug", "Mouse Pad"],
  N: ["Notebook", "Name Badge"],
  O: ["Office Stamp", "Outdoor Banner"],
  P: ["Pen", "Poster"],
  Q: ["Quote Card", "Quick Guide"],
  R: ["Rollup Banner", "Receipt Book"],
  S: ["Sticker", "Standee"],
  T: ["T-Shirt", "Tent Card"],
  U: ["Umbrella", "USB Drive"],
  V: ["Voucher", "Vinyl Print"],
  W: ["Wall Clock", "Water Bottle"],
  X: ["X-Banner", "X-Ray Folder"],
  Y: ["Yoga Mat", "Yard Sign"],
  Z: ["Zipper Pouch", "Z-Fold Brochure"],
};

const OrderIntakeForm: React.FC<Props> = ({ onSaved = () => {} }) => {
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // preview ke liye initial time; ACTUAL date/time save ke waqt capture hoga
  const initialNow = useMemo(() => new Date(), []);
  const [formData, setFormData] = useState<any>({
    clientName: "",
    companyName: "",
    phone: "",
    email: "",
    address: "",
    specifications: "",
    urgency: "Normal" as Urgency,
    status: "New" as Status, // 🔽 yahan se choose kar sakte ho: New/Active/Completed
    orderId: `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    products: [] as IntakeProduct[],
    orderDetails: "",
    showProductDropdown: false,
    previewDate: toLocalYMD(initialNow),
    previewTime: toLocalHM(initialNow),
  });

  const [searchText, setSearchText] = useState("");
  const [addingCustomProduct, setAddingCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState("");
  const [customProductQty, setCustomProductQty] = useState(1);
  const [intakeFiles, setIntakeFiles] = useState<UploadMeta[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setFormData((prev: any) => ({ ...prev, showProductDropdown: false }));
        setAddingCustomProduct(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** ===== Files ===== */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) {
      e.target.value = "";
      return;
    }
    const existing = new Set(intakeFiles.map((f) => `${f.name}_${f.size}`));
    const metas: UploadMeta[] = selected
      .filter((f) => !existing.has(`${f.name}_${f.size}`))
      .map((f) => ({ name: f.name, size: f.size, type: f.type, url: URL.createObjectURL(f) }));
    if (metas.length) setIntakeFiles((old) => [...old, ...metas]);
    e.target.value = "";
  };

  const handleFileRemove = (index: number) => {
    setIntakeFiles((prev) => {
      const removed = prev[index];
      if (removed?.url?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(removed.url);
        } catch {}
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  /** ===== Products ===== */
  const handleProductToggle = (product: string) => {
    const current = formData.products || [];
    const isSelected = current.some((p: IntakeProduct) => p.name === product);
    const updated = isSelected
      ? current.filter((p: IntakeProduct) => p.name !== product)
      : [...current, { name: product, quantity: 1 }];
    setFormData((prev: any) => ({ ...prev, products: updated }));
    setSearchText("");
  };

  const handleQuantityChange = (product: string, newQty: number) => {
    if (newQty < 1) return;
    setFormData((prev: any) => ({
      ...prev,
      products: (prev.products || []).map((p: IntakeProduct) => (p.name === product ? { ...p, quantity: newQty } : p)),
    }));
  };

  const flatProductList = Object.values(GROUPED_PRODUCTS).flat();
  const exactMatch = flatProductList.some((p) => p.toLowerCase() === searchText.toLowerCase());
  const filteredProducts = Object.entries(GROUPED_PRODUCTS).flatMap(([_, products]) =>
    products.filter((product) => product.toLowerCase().includes(searchText.toLowerCase()))
  );

  /** ===== Validation ===== */
  const hasAtLeastOneProduct = Array.isArray(formData.products) && formData.products.length > 0;
  const hasAtLeastOneFile = intakeFiles.length > 0; // agar files mandatory chahiye to is check ko use karo

  /** ===== Save ===== */
  const handleSave = () => {
    // **If you want files mandatory, uncomment below**
    // if (!hasAtLeastOneFile) { alert("Please upload at least one file before saving."); return; }
    if (!hasAtLeastOneProduct) {
      alert("Please add at least one product before saving.");
      return;
    }

    const now = new Date();
    const date = toLocalYMD(now);
    const time = toLocalHM(now);

    const prods = (formData.products || []) as IntakeProduct[];
    const titleFromProducts =
      prods.length > 0
        ? prods.map((p) => (p.quantity ? `${p.quantity} × ${p.name}` : p.name)).join(", ")
        : "Custom Order";

    const row: Row = {
      id: formData.orderId || `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      title: titleFromProducts,
      date,
      time,
      urgency: formData.urgency as Urgency,
      status: formData.status as Status, // ✅ user-selected section
    };

    onSaved(row); // parent page ko bhej do

    // reset for next time
    const nn = new Date();
    setFormData({
      clientName: "",
      companyName: "",
      phone: "",
      email: "",
      address: "",
      specifications: "",
      urgency: "Normal" as Urgency,
      status: "New" as Status,
      orderId: `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      products: [],
      orderDetails: "",
      showProductDropdown: false,
      previewDate: toLocalYMD(nn),
      previewTime: toLocalHM(nn),
    });
    setIntakeFiles([]);
    setSearchText("");
    setAddingCustomProduct(false);
  };

  return (
    <Card className="text-black bg-white rounded-xl p-6 md:p-8 space-y-6 w-full shadow shadow-gray-200">
      <h2 className="text-xl font-bold text-gray-900">Add Custom Order</h2>
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Name */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Client Name</label>
          <input
            type="text"
            value={formData.clientName}
            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Company Name */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* (Preview) Date & Time */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Date (saved at submit)</label>
          <input
            type="text"
            value={formData.previewDate}
            readOnly
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Time (saved at submit)</label>
          <input
            type="text"
            value={formData.previewTime}
            readOnly
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-700"
          />
        </div>

        {/* Product(s) */}
        <div className="flex flex-col relative md:col-span-2" ref={productDropdownRef}>
          <label className="text-sm font-medium text-gray-700 mb-1">Product(s)</label>

          {/* Selected tags */}
          <div className="flex flex-wrap gap-2 mb-2">
            {(formData.products || []).map((product: IntakeProduct, idx: number) => (
              <div key={product.name} className="flex items-center bg-gray-200 rounded-full px-3 py-1 text-sm">
                {product.name} ({product.quantity})
                <button
                  onClick={() =>
                    setFormData({
                      ...formData,
                      products: (formData.products as IntakeProduct[]).filter((_: any, i: number) => i !== idx),
                    })
                  }
                  className="ml-2 text-gray-500 hover:text-black"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <input
            type="text"
            placeholder="Type to search..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setFormData({ ...formData, showProductDropdown: true });
            }}
            onFocus={() => setFormData({ ...formData, showProductDropdown: true })}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && searchText === "") {
                const current = formData.products || [];
                if (current.length > 0) setFormData({ ...formData, products: current.slice(0, -1) });
              }
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />

          {/* Dropdown */}
          {formData.showProductDropdown && (
            <div className="absolute top-full left-0 w-full mt-1 z-10 bg-white border border-gray-300 rounded shadow max-h-60 overflow-y-auto">
              {filteredProducts.map((product) => {
                const selected = (formData.products as IntakeProduct[] | undefined)?.find((p) => p.name === product);
                return (
                  <div key={product} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm">
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => handleProductToggle(product)}
                      className="cursor-pointer"
                    />
                    <span className="w-6 h-6 rounded bg-gray-200 inline-flex items-center justify-center text-[10px]">🧾</span>
                    <span className="flex-1">{product}</span>
                    {selected && (
                      <input
                        type="number"
                        min={1}
                        value={selected.quantity}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleQuantityChange(product, parseInt(e.target.value))}
                        className="w-16 border px-1 py-0.5 rounded text-sm"
                      />
                    )}
                  </div>
                );
              })}

              {!!searchText && !exactMatch && !addingCustomProduct && (
                <div
                  onClick={() => {
                    setCustomProductName(searchText);
                    setAddingCustomProduct(true);
                  }}
                  className="px-4 py-2 text-blue-600 hover:bg-gray-100 text-sm cursor-pointer border-t border-gray-100"
                >
                  ➕ Add "{searchText}" as a custom product
                </div>
              )}

              {addingCustomProduct && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700">Custom Product:</span>
                    <strong>{customProductName}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="qty">Qty:</label>
                    <input
                      id="qty"
                      type="number"
                      min={1}
                      value={customProductQty}
                      onChange={(e) => setCustomProductQty(parseInt(e.target.value))}
                      className="w-16 border px-2 py-1 rounded text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const current = (formData.products || []) as IntakeProduct[];
                        const isDup = current.some((p) => p.name === customProductName);
                        if (!isDup) {
                          setFormData({
                            ...formData,
                            products: [...current, { name: customProductName, quantity: customProductQty }],
                          });
                        }
                        setAddingCustomProduct(false);
                        setSearchText("");
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingCustomProduct(false)}
                      className="px-3 py-1 bg-[#891F1A] text-white rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Address */}
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1">Address (with Zone)</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={2}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        {/* Specifications */}
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1">Specifications</label>
          <input
            type="text"
            value={formData.specifications}
            onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Urgency */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Urgency</label>
          <select
            value={formData.urgency}
            onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Status (decides which section it shows in) */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="New">New</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Order ID (readonly) */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Order ID</label>
          <input
            type="text"
            value={formData.orderId}
            disabled
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Upload Requirements */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Upload Requirements</label>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-[#891F1A] text-white text-sm font-medium rounded hover:bg-red-700 transition duration-200 shadow">
            📎 Choose Files
            <input type="file" multiple onChange={handleFileChange} className="hidden" />
          </label>
          {intakeFiles.length > 0 && <span className="text-sm text-gray-600">{intakeFiles.length} file(s) selected</span>}
        </div>

        {intakeFiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {intakeFiles.map((file, index) => {
              const ext = file.name.split(".").pop()?.toLowerCase();
              const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext || "");
              const isPdf = ext === "pdf";
              const isDoc = ["doc", "docx"].includes(ext || "");
              const icon = isImage ? "🖼️" : isPdf ? "📄" : isDoc ? "📝" : "📁";
              return (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between border border-gray-300 rounded px-3 py-2 bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xl">{icon}</span>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm truncate text-gray-800 font-medium">{file.name}</span>
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

      {/* Order Details */}
      <div className="flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Order Details</h3>
        <textarea
          value={formData.orderDetails || ""}
          onChange={(e) => setFormData({ ...formData, orderDetails: e.target.value })}
          rows={5}
          placeholder="Enter full order requirements, notes, or extra details..."
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black resize-y"
        />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`bg-[#3B66FF] hover:bg-[#2c53d9] text-white font-medium px-6 py-2 rounded shadow transition duration-200 ${
            !hasAtLeastOneProduct ? "opacity-60 cursor-not-allowed hover:bg-[#3B66FF]" : ""
          }`}
          disabled={!hasAtLeastOneProduct}
          title={!hasAtLeastOneProduct ? "Add at least one product" : "Save"}
        >
          Save
        </button>
      </div>
    </Card>
  );
};

export default OrderIntakeForm;
