"use client";

import { useRef, useState, useEffect } from "react";

// TypeScript fix for html2pdf global
declare global {
  interface Window {
    html2pdf: any;
  }
}

export default function QuotationPreview({ formData }: any) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [isPDFReady, setIsPDFReady] = useState(false);

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

    return () => document.body.removeChild(script);
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

  const productsData: Record<string, number> = {
    "Canvas Print": 50.0,
    "Custom Calendar": 30.0,
    "Flyer A5": 0.5,
    "Business Cards": 0.3,
    "Mug": 20.0,
    "Poster": 15.0,
    "Brochure": 10.0,
  };

  const selectedProducts: { name: string; quantity: number }[] = formData.products || [];

  const productLines = selectedProducts.map((p) => {
    const unitPrice = productsData[p.name] || 0;
    const quantity = p.quantity || 0;
    return {
      ...p,
      unitPrice,
      lineTotal: quantity * unitPrice,
    };
  });

  const productSubtotal = productLines.reduce((sum, p) => sum + p.lineTotal, 0);
  const otherSubtotal = labour + finishing + paper + machine + design + delivery + otherCharges;
  const subtotal = productSubtotal + otherSubtotal;
  const vat = Math.round((subtotal - discount) * 0.03);
  const total = subtotal - discount + vat;
  const remaining = total - advancePaid;

  const rows = [...productLines];
  while (rows.length < 17) rows.push({ name: "", quantity: "", unitPrice: "", lineTotal: "" });

  return (
    <>
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
              <p><strong>Name:</strong> {formData.clientName || "John Doe"}</p>
              <p><strong>Company:</strong> {formData.clientCompany || "ABC Corp"}</p>
              <p><strong>Phone:</strong> {formData.clientPhone || "+971-5xxxxxxxx"}</p> {/* NEW */}
              <p><strong>Location:</strong> {formData.clientLocation || "Dubai"}</p>
              <p><strong>TRN:</strong> {formData.clientTRN || "1003 62033100003"}</p>
            </div>
          </div>

          <div className="border border-gray-300">
            <div className="bg-[#891F1A] text-white px-4 py-1 font-bold text-sm">Project Description</div>
            <div className="p-3 space-y-1 text-xs">
              <p><strong>Project:</strong> {formData.projectDescription || "N/A"}</p>
              <p><strong>Date:</strong> {formData.date || "2025-08-05"}</p>
              <p><strong>Sales Person:</strong> {formData.salesPerson || "Ahmed"}</p>
              <p><strong>Invoice:</strong> {formData.orderId || "INV-00123"}</p>
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
              {rows.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-400 px-2 py-1">{index + 1}</td>
                  <td className="border border-gray-400 px-2 py-1">{item.name}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{item.quantity}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right">
                    {item.unitPrice?.toFixed?.(2) || ""}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right">
                    {item.lineTotal?.toFixed?.(2) || ""}
                  </td>
                </tr>
              ))}
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
                  { label: "VAT 3%", value: vat, border: true },
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
            onClick={handleDownloadPDF}
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
