"use client";

import { useEffect } from "react";
import jsPDF from "jspdf";

const cardBase =
  "bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-[520px] mx-auto";
const titleClass =
  "text-xl md:text-2xl font-semibold text-center text-gray-800 mb-6";

type Mode = "net" | "pdf";
type Emp = {
  id: number;
  name: string;
  salary: number;
  designation?: string;
  email?: string;
  phone?: string;
  image?: string;
};

export default function SalarySlipForm({
  formData,
  setFormData,
  employeeOptions = [] as Emp[],
  currency = "AED",
  branchLabel = "Dubai",
  totalMode = "net",
}: {
  formData: any;
  setFormData: (fn: any) => void;
  employeeOptions?: Emp[];
  currency?: string;
  branchLabel?: string;
  totalMode?: Mode;
}) {
  useEffect(() => {
    setFormData((p: any) => ({ ...p, currency, branch: branchLabel }));
  }, [currency, branchLabel, setFormData]);

  const n = (v: any) =>
    v === "" || v === null || v === undefined ? 0 : Number(v);

  const base = n(formData.basePay);
  const ot = n(formData.overtime);
  const adv = n(formData.advances);
  const ded = n(formData.deductions);

  const totalSalary = totalMode === "net" ? base + ot + adv - ded : base + ot;

  const onPickEmployee = (idStr: string) => {
    const id = Number(idStr);
    const emp = employeeOptions.find((e) => e.id === id);
    if (!emp) return;
    setFormData((prev: any) => ({
      ...prev,
      employeeId: emp.id,
      employeeName: emp.name,
      designation: emp.designation ?? "",
      employeeEmail: emp.email ?? "",
      employeePhone: emp.phone ?? "",
      employeeImage: emp.image ?? "",
      currency,
      branch: branchLabel,
      basePay: emp.salary ?? prev.basePay,
    }));
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev: any) => ({
      ...prev,
      [key]: e.target.value === "" ? "" : +e.target.value,
    }));

  const generatePDF = async () => {
    // A4 portrait in millimeters for precise layout
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const PAGE_W = 210;
    const MARGIN_L = 20;
    const MARGIN_R = 20;
    const CENTER_X = PAGE_W / 2;

    // Try to load logo (won't crash if missing)
    const drawLogo = async () => {
      try {
        const res = await fetch("/logo.png");
        const blob = await res.blob();
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const img = reader.result as string;
            // logo ~50mm wide centered at top
            const logoW = 50;
            const logoH = 18;
            doc.addImage(
              img,
              "PNG",
              CENTER_X - logoW / 2,
              18,
              logoW,
              logoH,
              undefined,
              "FAST"
            );
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch {
        // ignore if logo missing
      }
    };

    await drawLogo();

    // Title
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(22);
    doc.text("Salary Slip", CENTER_X, 50, { align: "center" });

    // Body rows
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);

    const labelX = MARGIN_L + 5;         // 25mm
    const valueX = PAGE_W - MARGIN_R - 5; // 185mm, right-aligned
    let y = 80;
    const step = 16;
    const C = (formData.currency || "AED").toUpperCase();
    const fmt = (v: number) => `${C} ${v.toFixed(2)}`;

    const rows: Array<[string, string]> = [
      ["Base Pay:", fmt(base)],
      ["Overtime:", fmt(ot)],
      ["Advances:", fmt(adv)],
      ["Deductions:", fmt(ded)],
      ["Total Salary:", fmt(totalSalary)],
    ];

    rows.forEach(([label, value], i) => {
      // Make the "Total Salary" bold/red like the sample
      if (label === "Total Salary:") {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(137, 31, 26); // #891F1A
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
      }

      doc.text(label, labelX, y);
      doc.text(value, valueX, y, { align: "right" });

      y += step;
    });

    // Signature
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Authorized Signature:", MARGIN_L, y);
    // line
    const lineStartX = MARGIN_L + 50;
    const lineW = 80;
    doc.line(lineStartX, y + 1.5, lineStartX + lineW, y + 1.5);

    // Footer (company text)
    doc.setFontSize(10);
    doc.setTextColor(110);
    const footerY = 270;
    doc.text("Creative Connect Advertising L.L.C.", MARGIN_L, footerY);
    doc.text("Your One-Stop Custom Printing Shop", MARGIN_L, footerY + 5);

    doc.save("Salary_Slip.pdf");
  };

  return (
    <div className={cardBase}>
      <div className="p-6 md:p-8">
        <h2 className={titleClass}>Salary Details Form</h2>

        {/* Select Employee */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Select Employee
          </label>
          <select
            value={formData.employeeId ?? ""}
            onChange={(e) => onPickEmployee(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
          >
            <option value="" disabled>
              Choose employee…
            </option>
            {employeeOptions.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: "Base Pay", key: "basePay" },
            { label: "Overtime", key: "overtime" },
            { label: "Advances", key: "advances" },
            { label: "Deductions", key: "deductions" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-sm font-semibold text-gray-600">{label}</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={formData[key] ?? ""}
                onChange={set(key)}
                className="w-full mt-1 px-3 py-2 rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
              />
            </div>
          ))}
        </div>

        {/* Attendance + Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Attendance
            </label>
            <select
              value={formData.attendance || "Present"}
              onChange={(e) =>
                setFormData((p: any) => ({ ...p, attendance: e.target.value }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
            >
              <option>Present</option>
              <option>Absent</option>
              <option>On Leave</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Hours Worked
            </label>
            <input
              type="number"
              min={0}
              step="0.5"
              placeholder="e.g., 160"
              value={formData.hoursWorked ?? ""}
              onChange={(e) =>
                setFormData((p: any) => ({
                  ...p,
                  hoursWorked:
                    e.target.value === "" ? "" : +e.target.value,
                }))
              }
              className="w-full mt-1 px-3 py-2 rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
            />
          </div>
        </div>

        {/* Total */}
        <div className="text-xl font-semibold text-gray-800 mt-6">
          Total Salary:{" "}
          <span className="text-[#891F1A]">
            {currency.toUpperCase()} {totalSalary.toFixed(2)}
          </span>
        </div>

        <button
          onClick={generatePDF}
          className="mt-4 bg-[#891F1A] hover:bg-red-700 text-white px-6 py-2 rounded-md shadow transition"
        >
          Download PDF Slip
        </button>
      </div>
    </div>
  );
}
