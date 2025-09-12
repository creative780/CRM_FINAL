// File: app/components/ui/SalarySlipPreview.tsx
"use client";

const cardBase =
  "bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden w-full";
const titleClass = "text-xl md:text-2xl font-semibold text-center text-gray-800 mb-6";

type SlipData = {
  currency?: string;
  basePay: number | string;
  overtime: number | string;
  advances: number | string;
  deductions: number | string;
  employeeId?: number | null;
  employeeName?: string;
  designation?: string;
  attendance?: string;
  hoursWorked?: number | string;
  employeeEmail?: string;
  employeePhone?: string;
  employeeImage?: string;
  branch?: string;
  companyName?: string;
  companyTagline?: string;
  logoSrc?: string;
};

export default function SalarySlipPreview({ formData }: { formData: SlipData }) {
  const C = (formData.currency || "AED").toUpperCase();
  const num = (v: any) => (v === "" || v === null || v === undefined ? 0 : Number(v));

  const base = num(formData.basePay);
  const ot = num(formData.overtime);
  const adv = num(formData.advances);
  const ded = num(formData.deductions);

  const total = base + ot + adv - ded;
  const fmt = (n: number) => `${C} ${n.toFixed(2)}`;

  const companyName = formData.companyName ?? "Creative Connect Advertising L.L.C.";
  const companyTagline = formData.companyTagline ?? "Your One-Stop Custom Printing Shop";
  const logoSrc = formData.logoSrc ?? "/logo.png";

  return (
    <div className={cardBase}>
      <div className="p-9 md:p-8">
        <div className="flex justify-center pt-2 pb-4">
          <img src={logoSrc} alt={companyName} className="h-14 md:h-16 w-auto object-contain" />
        </div>
        <h2 className={titleClass}>Salary Slip</h2>

        {/* Employee block */}
        <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 mb-6">
          <div className="flex items-center justify-between">
            <span className="font-medium">Employee:</span>
            <span className="text-gray-900">{formData.employeeName || "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Designation:</span>
            <span className="text-gray-900">{formData.designation || "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Attendance:</span>
            <span className="text-gray-900">{formData.attendance || "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Hours Worked:</span>
            <span className="text-gray-900">{formData.hoursWorked ?? "-"}</span>
          </div>
        </div>

        {/* Money rows */}
        <div className="space-y-5 text-gray-900">
          <Row label="Base Pay:" value={fmt(base)} />
          <Divider />
          <Row label="Overtime:" value={fmt(ot)} />
          <Divider />
          <Row label="Advances:" value={fmt(adv)} />
          <Divider />
          <Row label="Deductions:" value={fmt(ded)} />
          <Divider />
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-lg text-gray-900">Total Salary:</span>
            <span className="font-extrabold text-lg text-[#891F1A]">{fmt(total)}</span>
          </div>
        </div>

        <div className="mt-10">
          <span className="text-gray-900">Authorized Signature:</span>
          <span className="ml-4 inline-block align-bottom w-64 border-b border-gray-900 translate-y-2" />
        </div>
      </div>

      <div className="bg-gray-50 border-t px-8 py-6 text-center">
        <div className="font-semibold text-gray-900">{companyName}</div>
        <div className="text-gray-600 text-sm">{companyTagline}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-base">{label}</span>
      <span className="text-base font-semibold">{value}</span>
    </div>
  );
}
function Divider() {
  return <div className="border-t border-gray-200" />;
}