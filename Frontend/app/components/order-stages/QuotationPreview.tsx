"use client";

import { useRef, useState, useEffect } from "react";
import { Plus, Minus, X } from "lucide-react";
import ProductSearchModal from "../modals/ProductSearchModal";
import ProductConfigModal from "../modals/ProductConfigModal";
import { BaseProduct, ConfiguredProduct } from "../../types/products";

// TypeScript fix for html2pdf global
declare global {
  interface Window {
    html2pdf: any;
  }
}

interface QuotationPreviewProps {
  formData: any;
  onProductsChange?: (products: any[]) => void;
  isEditable?: boolean;
}

export default function QuotationPreview({ 
  formData, 
  onProductsChange,
  isEditable = false 
}: QuotationPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [isPDFReady, setIsPDFReady] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showProductConfig, setShowProductConfig] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [pendingBaseProduct, setPendingBaseProduct] = useState<BaseProduct | null>(null);
  const [pendingInitialQty, setPendingInitialQty] = useState<number | undefined>(undefined);

  // Dynamically load html2pdf.js from CDN with retry fallback
  useEffect(() => {
    const checkLoaded = () => {
      if (window.html2pdf) {
        setIsPDFReady(true);
        if (process.env.NODE_ENV !== "production") {
          console.log("✅ html2pdf.js loaded");
        }
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Retrying html2pdf load check...");
        }
        setTimeout(checkLoaded, 300);
      }
    };

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    script.onload = checkLoaded;
    script.onerror = () => {
      if (process.env.NODE_ENV !== "production") {
        console.error("❌ Failed to load html2pdf.js");
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleDownloadPDF = (attempt = 1) => {
    if (!printRef.current) {
      alert("Printable content not found.");
      return;
    }

    if (typeof window.html2pdf === "undefined") {
      if (attempt < 4) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`🕐 Attempt ${attempt}: Waiting for html2pdf...`);
        }
        setTimeout(() => handleDownloadPDF(attempt + 1), 300);
      } else {
        alert("⚠️ PDF tool is not ready yet. Please try again in a few seconds.");
      }
      return;
    }

    // Proceed with PDF generation
    setTimeout(() => {
      window.html2pdf()
        .set({
          margin: 0.5,
          filename: `${formData.orderId || "quotation"}.pdf`,
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            ignoreElements: (el: HTMLElement) =>
              el.classList.contains("html2pdf__ignore"),
          },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        })
        .from(printRef.current)
        .save();
    }, 200);
  };

  const handleShare = () => {
    const shareData = {
      title: "Quotation from Creative Connect",
      text: "Check out this quotation preview from Creative Connect Advertising.",
      url: window.location.href,
    };

    if (navigator.share) {
      navigator
        .share(shareData)
        .catch((err) => {
          if (process.env.NODE_ENV !== "production") {
            console.error("Share failed:", err);
          }
        });
    } else {
      alert("Sharing not supported. Please copy the URL manually.");
    }
  };

  // Parse cost fields
  const labour = parseFloat(formData.labourCost) || 0;
  const finishing = parseFloat(formData.finishingCost) || 0;
  const paper = parseFloat(formData.paperCost) || 0;
  const machine = parseFloat(formData.machineCost) || 0;
  const design = parseFloat(formData.designCost) || 0;
  const delivery = parseFloat(formData.deleiveryCost) || 0;
  const otherCharges = parseFloat(formData.otherCharges) || 0;
  const discount = parseFloat(formData.discount) || 0;
  const advancePaid = parseFloat(formData.advancePaid) || 0;

  // Use actual order items instead of hardcoded data
  const selectedProducts: any[] = formData.products || formData.items || [];

  const productLines = selectedProducts.map((p) => {
    // Handle multiple price field names (unitPrice, unit_price, price, unitCost, cost)
    const unitPrice = parseFloat(p.unitPrice || p.unit_price || p.price || p.unitCost || p.cost || "");
    const quantity = parseInt(p.quantity || "");
    
    return {
      id: p.id || Math.random().toString(),
      name: p.name || '',
      quantity: quantity,
      unitPrice: unitPrice,
      lineTotal: quantity * unitPrice,
    };
  });

  const productSubtotal = productLines.reduce((sum, p) => sum + p.lineTotal, 0);
  const otherSubtotal = labour + finishing + paper + machine + design + delivery + otherCharges;
  const subtotal = productSubtotal + otherSubtotal;
  const vat = Math.round((subtotal - discount) * 0.05);
  const total = subtotal - discount + vat;
  const remaining = total - advancePaid;

  // Create rows with empty slots
  const rows = [...productLines];
  while (rows.length < 17) {
    rows.push({ 
      id: `empty-${rows.length}`, 
      name: "", 
      quantity: 0, 
      unitPrice: 0, 
      lineTotal: 0 
    });
  }

  // Helper function to get the correct field value with fallbacks
  const getFieldValue = (primary: string, fallback: string, defaultValue: string = "") => {
    return formData[primary] || formData[fallback] || defaultValue;
  };

  // Get current logged-in user's username
  const getCurrentUsername = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_username") || "Unknown User";
    }
    return "Unknown User";
  };

  // Product management functions
  const handleAddProduct = (rowIndex: number) => {
    setEditingRowIndex(rowIndex);
    setShowProductSearch(true);
  };

  const handleEditProduct = (rowIndex: number) => {
    if (rowIndex >= selectedProducts.length) return;
    
    const productToEdit = selectedProducts[rowIndex];
    
    // Create a BaseProduct object from the existing product
    const baseProduct: BaseProduct = {
      id: productToEdit.productId || productToEdit.id,
      name: productToEdit.name,
      imageUrl: productToEdit.imageUrl || '',
      defaultPrice: productToEdit.unitPrice || 0
    };
    
    // Save custom requirements to localStorage so modal can retrieve them
    if (productToEdit.customRequirements) {
      const storageKey = `orderLifecycle_customRequirements_${productToEdit.id}`;
      localStorage.setItem(storageKey, productToEdit.customRequirements);
    }
    
    setEditingRowIndex(rowIndex);
    setPendingBaseProduct(baseProduct);
    setPendingInitialQty(productToEdit.quantity);
    setShowProductConfig(true);
  };

  const handleProductSelected = (product: BaseProduct, quantity: number = 1) => {
    if (editingRowIndex === null) return;

    // Set the pending product and open config modal
    setPendingBaseProduct(product);
    setPendingInitialQty(quantity);
    setShowProductSearch(false);
    setShowProductConfig(true);
  };

  const handleProductConfigured = (configured: ConfiguredProduct) => {
    if (editingRowIndex === null) return;

    const newProduct = {
      id: configured.id,
      name: configured.name,
      quantity: configured.quantity,
      unitPrice: configured.price,
      lineTotal: configured.quantity * configured.price,
      attributes: configured.attributes,
      sku: configured.sku,
      imageUrl: configured.imageUrl, // Preserve the image URL
      customRequirements: configured.design?.customRequirements || "", // Preserve custom requirements
    };

    // Update the products array
    const updatedProducts = [...selectedProducts];
    if (editingRowIndex < selectedProducts.length) {
      // Replace existing product
      updatedProducts[editingRowIndex] = newProduct;
    } else {
      // Add new product
      updatedProducts.push(newProduct);
    }

    // Update form data
    if (onProductsChange) {
      onProductsChange(updatedProducts);
    }

    // Reset state
    setShowProductConfig(false);
    setPendingBaseProduct(null);
    setPendingInitialQty(undefined);
    setEditingRowIndex(null);
  };

  const resetPendingProduct = () => {
    setPendingBaseProduct(null);
    setPendingInitialQty(undefined);
    setEditingRowIndex(null);
  };

  const handleRemoveProduct = (rowIndex: number) => {
    if (rowIndex >= selectedProducts.length) return;

    const updatedProducts = selectedProducts.filter((_, index) => index !== rowIndex);
    
    if (onProductsChange) {
      onProductsChange(updatedProducts);
    }
  };

  const handleQuantityChange = (rowIndex: number, newQuantity: number) => {
    if (rowIndex >= selectedProducts.length || newQuantity < 0) return;

    const updatedProducts = [...selectedProducts];
    updatedProducts[rowIndex] = {
      ...updatedProducts[rowIndex],
      quantity: newQuantity,
      lineTotal: newQuantity * (updatedProducts[rowIndex].unitPrice || updatedProducts[rowIndex].unit_price || updatedProducts[rowIndex].price || 0)
    };

    if (onProductsChange) {
      onProductsChange(updatedProducts);
    }
  };

  const handleUnitPriceChange = (rowIndex: number, newPrice: number) => {
    if (rowIndex >= selectedProducts.length || newPrice < 0) return;

    const updatedProducts = [...selectedProducts];
    const quantity = updatedProducts[rowIndex].quantity || "";
    updatedProducts[rowIndex] = {
      ...updatedProducts[rowIndex],
      unitPrice: newPrice,
      lineTotal: quantity * newPrice
    };

    if (onProductsChange) {
      onProductsChange(updatedProducts);
    }
  };

  return (
    <>
      {/* Product Search Modal */}
      <ProductSearchModal
        open={showProductSearch}
        onClose={() => {
          setShowProductSearch(false);
          setEditingRowIndex(null);
        }}
        onPickBaseProduct={handleProductSelected}
      />

      {/* Product Config Modal */}
      <ProductConfigModal
        open={showProductConfig}
        onClose={() => {
          setShowProductConfig(false);
          resetPendingProduct();
        }}
        baseProduct={pendingBaseProduct}
        onConfirm={handleProductConfigured}
        initialQty={pendingInitialQty}
        initialAttributes={editingRowIndex !== null && editingRowIndex < selectedProducts.length ? selectedProducts[editingRowIndex].attributes : {}}
        initialPrice={editingRowIndex !== null && editingRowIndex < selectedProducts.length ? selectedProducts[editingRowIndex].unitPrice : 0}
        editingProductId={editingRowIndex !== null && editingRowIndex < selectedProducts.length ? selectedProducts[editingRowIndex].id : undefined}
        onBack={() => {
          setShowProductConfig(false);
          setShowProductSearch(true);
        }}
      />

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 html2pdf__ignore border-0">
          <div className="bg-white p-6 rounded-md max-w-md w-full">
            <h2 className="text-lg font-bold mb-3">Request Edits</h2>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              rows={4}
              placeholder="Enter your feedback or corrections here..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[#891F1A] text-white rounded hover:bg-[#6e1714]"
                onClick={() => {
                  if (process.env.NODE_ENV !== "production") {
                    console.log("Edit requested:", editNotes);
                  }
                  alert("Edit request submitted!");
                  setShowEditModal(false);
                  setEditNotes("");
                }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Printable Content */}
      <div
        ref={printRef}
        className="bg-white p-8 rounded-md text-sm text-black font-sans border border-gray-300 max-w-5xl mx-auto"
      >
        {/* HEADER */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-[#891F1A] uppercase">Creative Connect Advertising L.L.C.</h1>
          <p className="text-xs text-gray-700">Shop No. 7, Al Madani Bldg, Al Nakhal Road, Deira-Dubai</p>
          <div className="flex justify-center gap-6 text-xs mt-1">
            <span>📞 04 325 9806</span>
            <span>✉️ ccaddxb@gmail.com</span>
            <span>🌐 www.creativeprints.ae</span>
          </div>
        </div>

        {/* CUSTOMER & PROJECT INFO */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="border border-gray-300">
            <div className="bg-[#891F1A] text-white px-4 py-1 font-bold text-sm">Customer</div>
            <div className="p-3 space-y-1 text-xs">
              <p><strong>Name:</strong> {getFieldValue("clientName", "client_name", "John Doe")}</p>
              <p><strong>Company:</strong> {getFieldValue("companyName", "clientCompany", "ABC Corp")}</p>
              <p><strong>Phone:</strong> {getFieldValue("phone", "clientPhone", "+971-5xxxxxxxx")}</p>
              <p><strong>Location:</strong> {getFieldValue("clientLocation", "address", "Dubai")}</p>
              <p><strong>TRN:</strong> {getFieldValue("trn", "trn", "1003 62033100003")}</p>
            </div>
          </div>

          <div className="border border-gray-300">
            <div className="bg-[#891F1A] text-white px-4 py-1 font-bold text-sm">Project Description</div>
            <div className="p-3 space-y-1 text-xs">
              <p><strong>Project:</strong> {getFieldValue("projectDescription", "specifications", "N/A")}</p>
              <p><strong>Date:</strong> {getFieldValue("date", "created_at", "2025-08-05")}</p>
              <p><strong>Sales Person:</strong> {getFieldValue("salesPerson", "created_by", getCurrentUsername())}</p>
              <p><strong>Invoice:</strong> {getFieldValue("orderId", "order_code", "INV-00123")}</p>
            </div>
          </div>
        </div>

        {/* PRODUCTS TABLE */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border border-gray-400 text-xs text-left">
            <thead className="bg-[#891F1A] text-white">
              <tr>
                <th className="border border-gray-400 px-2 py-1">Sr. No.</th>
                <th className="border border-gray-400 px-2 py-1">Description</th>
                <th className="border border-gray-400 px-2 py-1 text-center">Quantity</th>
                <th className="border border-gray-400 px-2 py-1 text-right">Unit Price</th>
                <th className="border border-gray-400 px-2 py-1 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => {
                const isEmpty = !item.name;
                const isFirstEmpty = isEmpty && index === selectedProducts.length;
                
                return (
                  <tr key={index} className={isEmpty ? "bg-gray-50" : ""}>
                    <td className="border border-gray-400 px-2 py-1 relative">
                      <div className="flex items-center justify-between">
                        <span>{index + 1}</span>
                        {isEditable && isFirstEmpty && (
                          <button
                            onClick={() => handleAddProduct(index)}
                            className="w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-green-600 html2pdf__ignore ml-1"
                            title="Add Product"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-400 px-2 py-1">
                      {isEditable && !isEmpty ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditProduct(index)}
                            className="flex-1 text-left hover:underline cursor-pointer"
                            title="Click to edit product"
                          >
                            {item.name}
                          </button>
                          <button
                            onClick={() => handleRemoveProduct(index)}
                            className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 html2pdf__ignore"
                            title="Remove Product"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-center">
                      {isEditable && !isEmpty ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleQuantityChange(index, (item.quantity as number) - 1)}
                            className="w-5 h-5 bg-gray-200 text-gray-700 rounded flex items-center justify-center text-xs hover:bg-gray-300 html2pdf__ignore"
                            title="Decrease Quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                            className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-xs html2pdf__ignore"
                            min="0"
                          />
                          <button
                            onClick={() => handleQuantityChange(index, (item.quantity as number) + 1)}
                            className="w-5 h-5 bg-gray-200 text-gray-700 rounded flex items-center justify-center text-xs hover:bg-gray-300 html2pdf__ignore"
                            title="Increase Quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        isEmpty ? "" : item.quantity
                      )}
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-right">
                      {isEditable && !isEmpty ? (
                        <input
                          type="number"
                          value={typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) : item.unitPrice}
                          onChange={(e) => handleUnitPriceChange(index, parseFloat(e.target.value) || 0)}
                          className="w-20 text-right border border-gray-300 rounded px-1 py-0.5 text-xs html2pdf__ignore"
                          min="0"
                          step="0.01"
                        />
                      ) : (
                        isEmpty ? "" : (typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) : (item.unitPrice || ""))
                      )}
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-right">
                      {isEmpty ? "" : (typeof item.lineTotal === 'number' ? item.lineTotal.toFixed(2) : (item.lineTotal || ""))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* TERMS & TOTALS */}
        <div className="grid grid-cols-3 gap-6 mt-4">
          <div className="col-span-2 border border-gray-400">
            <div className="bg-[#891F1A] text-white px-4 py-1 font-bold text-sm">Terms & Conditions</div>
            <div className="p-3 text-xs space-y-1 leading-relaxed">
              <p>Please check all numbers & spelling. Once approved, the file will go for printing and corrections cannot be made.</p>
              <p>1. Accuracy of color and cutting will be 85% to 90%.</p>
              <p>2. Design, spelling, logos, phone numbers, email, etc., must be approved.</p>
              <p>3. Material, sizes, and mock-ups must be confirmed.</p>
              <p>4. Production time starts only after mock-up approval.</p>
              <p>5. No refunds after payment.</p>
              <p className="font-bold text-[#891F1A] uppercase">
                Once approved, Creative Connect is not responsible for any printing mistakes.
              </p>
            </div>
          </div>

          <div className="border border-gray-400">
            <table className="w-full text-xs">
              <tbody>
                {[
                  { label: "Subtotal", value: subtotal, border: true },
                  { label: "Discount", value: discount, border: true },
                  { label: "VAT 5%", value: vat, border: true },
                  { label: "Advance Paid", value: advancePaid, border: true },
                  { label: "Total", value: total, rowClass: "bg-[#891F1A] text-white font-bold" },
                  { label: "Remaining", value: remaining, rowClass: "font-semibold" },
                ].map(({ label, value, border = false, rowClass = "" }) => (
                  <tr key={label} className={rowClass}>
                    <td
                      className={`px-3 py-1 font-medium${border ? " border-b border-gray-300" : ""}`}
                    >
                      {label}
                    </td>
                    <td
                      className={`px-3 py-1 text-right${border ? " border-b border-gray-300" : ""}`}
                    >
                      {value.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BANK DETAILS */}
        <div className="mt-6 border border-gray-400">
          <div className="bg-[#891F1A] text-white px-4 py-1 font-bold text-sm">Company Bank Details</div>
          <div className="p-3 text-xs space-y-1">
            <p><strong>Company Name:</strong> Creative Connect Advertising L.L.C</p>
            <p><strong>Account Number:</strong> 019101090493</p>
            <p><strong>IBAN:</strong> AE480330000019101090493</p>
            <p><strong>Swift Code:</strong> BOMLAEAD</p>
            <p><strong>Branch:</strong> Mashreq NEO (099)</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center text-sm html2pdf__ignore">
          <button
            className="bg-[#891F1A] hover:bg-[#6e1714] text-white px-4 py-2 rounded shadow transition"
            onClick={handleShare}
          >
            Share to Social Platforms
          </button>

          <button
            className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded shadow transition"
            onClick={() => handleDownloadPDF()}
          >
            Download PDF Preview
          </button>

          <button
            className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded shadow transition"
            onClick={() => setShowEditModal(true)}
          >
            Request Edits
          </button>
        </div>
      </div>
    </>
  );
}