"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
} from "recharts";

// Define tab types
type TabType = "stats" | "documents" | "contract";
const tabOptions: TabType[] = ["stats", "documents", "contract"];

// Mock performance data
const performanceData = [
  { month: "Jan", score: 78 },
  { month: "Feb", score: 82 },
  { month: "Mar", score: 90 },
  { month: "Apr", score: 88 },
  { month: "May", score: 93 },
  { month: "Jun", score: 95 },
];

const documents = {
  pakistan: [
    {
      title: "CNIC",
      status: "Uploaded",
      type: "image",
      previewUrl: "/previews/cnic.png",
      color: "text-green-600",
    },
    {
      title: "Birth Certificate",
      status: "Pending",
      type: "image",
      previewUrl: "/previews/birth-certificate.png",
      color: "text-yellow-600",
    },
    {
      title: "Education Certificates",
      status: "Uploaded",
      type: "pdf",
      previewUrl: "/previews/education.pdf",
      color: "text-green-600",
    },
    {
      title: "Police Verification",
      status: "Missing",
      type: "pdf",
      previewUrl: "/previews/police.pdf",
      color: "text-red-500",
    },
  ],
  dubai: [
    {
      title: "Emirates ID",
      status: "Uploaded",
      type: "image",
      previewUrl: "/previews/emirates-id.png",
      color: "text-green-600",
    },
    {
      title: "Visa",
      status: "Pending",
      type: "pdf",
      previewUrl: "/previews/visa.pdf",
      color: "text-yellow-600",
    },
    {
      title: "Labour Card",
      status: "Uploaded",
      type: "image",
      previewUrl: "/previews/labour-card.png",
      color: "text-green-600",
    },
    {
      title: "Medical Records",
      status: "Missing",
      type: "pdf",
      previewUrl: "/previews/medical.pdf",
      color: "text-red-500",
    },
  ],
};
const contractDetails = {
  signedDate: "12 Jan 2024",
  durationYears: 2,
  contractType: "Full-Time",
  renewal: "Auto-renewal yearly",
  pdfUrl: "/Hasnain_Shafiq_Contract_With_Image.pdf",
previewImg: "/previews/contract-thumb.jpg", // optional thumbnail image

};

const getContractEndDate = (signedDateStr: string, years: number) => {
  const start = new Date(signedDateStr);
  const end = new Date(start.setFullYear(start.getFullYear() + years));
  return end.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};



// Component Props
interface EmployeeModalProps {
  employee: {
    name: string;
    image: string;
    country?: string;
  };
  onClose: () => void;
}

export default function EmployeeModal({ employee, onClose }: EmployeeModalProps) {
  const [tab, setTab] = useState<TabType>("stats");

  return (
    <Dialog open={true} onClose={onClose} className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-gradient-to-tr from-white via-indigo-50 to-pink-50 rounded-2xl w-full max-w-5xl max-h-[90vh] shadow-2xl relative flex flex-col">

          {/* Close Button */}
          <button
            className="absolute top-5 right-5 text-gray-500 hover:text-gray-800 transition"
            onClick={onClose}
          >
            <X size={20} />
          </button>

          {/* Modal Scrollable Content */}
          <div className="p-10 pt-6 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-transparent">

            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
              <img
                src={employee.image}
                alt={employee.name}
                className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
              />
              <h2 className="text-3xl font-bold text-gray-800">{employee.name}</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 mb-6 border-b border-gray-300">
              {tabOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative pb-2 font-medium transition-all ${
                    tab === t
                      ? "text-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {tab === t && (
                    <span className="absolute left-0 bottom-0 w-full h-1 bg-indigo-500 rounded-full"></span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[220px] text-gray-700 space-y-4">
              {tab === "stats" && (
                <div className="space-y-8">
                  {/* Summary + Line Chart */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Stats Summary */}
                    <div className="space-y-2 text-[15px]">
                      <p>• Monthly Salary: <span className="font-semibold">AED 12,000</span></p>
                      <p>• Hours Worked: <span className="font-semibold">160 hrs</span></p>
                      <p>• Bonuses: <span className="font-semibold">AED 2,000</span></p>
                      <p>• Projects Completed: <span className="font-semibold">5</span></p>
                      <p>• Absences: <span className="text-red-500 font-semibold">1 Day</span></p>
                    </div>

                    {/* Line Chart */}
                    <div className="bg-white rounded-lg shadow p-4">
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">
                        Performance Score (Last 6 Months)
                      </h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={performanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis domain={[60, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <div className="bg-white rounded-lg shadow p-4">
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">
                        Projects Completed (Per Month)
                      </h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[
                          { month: "Jan", projects: 3 },
                          { month: "Feb", projects: 2 },
                          { month: "Mar", projects: 4 },
                          { month: "Apr", projects: 3 },
                          { month: "May", projects: 5 },
                          { month: "Jun", projects: 6 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="projects" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Area Chart */}
                    <div className="bg-white rounded-lg shadow p-4">
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">
                        Working Hours Trend
                      </h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={[
                          { month: "Jan", hours: 145 },
                          { month: "Feb", hours: 150 },
                          { month: "Mar", hours: 160 },
                          { month: "Apr", hours: 155 },
                          { month: "May", hours: 158 },
                          { month: "Jun", hours: 160 },
                        ]}>
                          <defs>
                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" />
                          <YAxis />
                          <CartesianGrid strokeDasharray="3 3" />
                          <Tooltip />
                          <Area type="monotone" dataKey="hours" stroke="#4f46e5" fillOpacity={1} fill="url(#colorHours)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* KPI Circles */}
                  <div className="flex gap-6 justify-around text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-16 h-16 text-indigo-500" viewBox="0 0 36 36">
                        <path
                          className="text-gray-200"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-indigo-500"
                          strokeWidth="3"
                          strokeDasharray="90, 100"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <p className="text-sm font-medium mt-2">Task Completion</p>
                      <p className="text-indigo-600 font-semibold">90%</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <svg className="w-16 h-16 text-green-500" viewBox="0 0 36 36">
                        <path
                          className="text-gray-200"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-green-500"
                          strokeWidth="3"
                          strokeDasharray="75, 100"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <p className="text-sm font-medium mt-2">Client Feedback</p>
                      <p className="text-green-600 font-semibold">75%</p>
                    </div>
                  </div>
                </div>
              )}

              {tab === "documents" && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
    {(employee.country === "Pakistan" ? documents.pakistan : documents.dubai).map((doc, i) => (
      <div
        key={i}
        onClick={() => {
          if (doc.status !== "Missing") {
            window.open(doc.previewUrl, "_blank");
          }
        }}
        className={`cursor-pointer bg-white shadow-sm rounded-xl p-5 flex items-center gap-4 border border-gray-100 hover:shadow-md transition ${
          doc.status === "Missing" ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50">
          {doc.type === "pdf" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-red-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z" />
              <path d="M14 2v6h6" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          )}
        </div>
        <div>
          <h4 className="text-md font-semibold text-gray-700">{doc.title}</h4>
          <p className={`text-sm mt-1 font-medium ${doc.color}`}>{doc.status}</p>
        </div>
      </div>
    ))}
  </div>
)}



             {tab === "contract" && (
  <div className="bg-white rounded-xl shadow p-6 border border-gray-100 space-y-6">
    {/* Header */}
    <div className="flex items-center gap-4">
      <svg
        className="w-6 h-6 text-indigo-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h6l5 5v11a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-gray-700">Employment Contract</h3>
    </div>

    {/* Info Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      <p>• <span className="text-gray-500">Signed on:</span> <span className="font-semibold">{contractDetails.signedDate}</span></p>
      <p>• <span className="text-gray-500">Ends on:</span> <span className="font-semibold">{getContractEndDate(contractDetails.signedDate, contractDetails.durationYears)}</span></p>
      <p>• <span className="text-gray-500">Duration:</span> <span className="font-semibold">{contractDetails.durationYears} Years</span></p>
      <p>• <span className="text-gray-500">Contract Type:</span> <span className="font-semibold">{contractDetails.contractType}</span></p>
      <p>• <span className="text-gray-500">Renewal:</span> <span className="font-semibold">{contractDetails.renewal}</span></p>
    </div>

    {/* Preview */}
    <div className="flex flex-col sm:flex-row gap-6 items-start mt-4">
      {/* <a
        href={contractDetails.pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full sm:w-48"
      >
        <img
          src={contractDetails.previewImg || "/samples/sample.jpg"}
          alt="Contract Preview"
          className="w-full rounded-md border border-gray-200 shadow hover:shadow-md transition"
        />
      </a> */}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <a
          href={contractDetails.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow transition w-40 text-center"
        >
          View Contract
        </a>
        <a
          href={contractDetails.pdfUrl}
          download
          className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-sm font-medium px-4 py-2 rounded-md transition w-40 text-center"
        >
          Download PDF
        </a>
      </div>
    </div>

    {/* Footer */}
    <div className="text-xs text-gray-500 pt-6 border-t">
      <p>
        This contract confirms the appointment of <span className="font-semibold">{employee.name}</span> at our regional office.
        The employee agrees to abide by the company’s policies and code of conduct.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-6 text-center text-sm text-gray-600">
        <div>
          <p className="font-medium">Authorized Signatory</p>
          <div className="mt-6 border-t border-gray-300 pt-2">Creative Connect Advertising L.L.C</div>
        </div>
        <div>
          <p className="font-medium">Employee Signature</p>
          <div className="mt-6 border-t border-gray-300 pt-2">{employee.name}</div>
        </div>
      </div>
    </div>
  </div>
)}

            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
