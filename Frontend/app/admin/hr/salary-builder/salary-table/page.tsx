"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import ScrollAreaWithRail from "@/app/components/ScrollAreaWithRail";

type SalaryItem = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  designation: string;
  branch: string;
  baseSalary: number;
  loans: number;
  advances: number;
  fines: number;
  allowances: number;
  month: string;
  year: number;
};

const initialSalaryData = Array.from({ length: 30 }).map((_, index) => {
  const isDubai = index % 2 === 0;
  const monthIndex = index % 12;
  const year = 2022 + (index % 4);

  return {
    id: index + 1,
    firstName: isDubai ? `Mohammed` : `Ayesha`,
    lastName: isDubai ? `Zayed` : `Noor`,
    phone: `050${1000000 + index}`,
    designation: isDubai ? `Designer` : `Developer`,
    branch: isDubai ? "Dubai" : "Pakistan",
    baseSalary: isDubai ? 5000 + index * 20 : 4000 + index * 15,
    loans: index % 3 === 0 ? 200 : 0,
    advances: index % 4 === 0 ? 300 : 100,
    fines: index % 5 === 0 ? 100 : 50,
    allowances: 500 + index * 10,
    month: [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ][monthIndex],
    year,
  };
});

export default function SalaryTablePage() {
  const [salaryData, setSalaryData] = useState(initialSalaryData);
  const [locationFilter, setLocationFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<SalaryItem>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = salaryData.filter((item) => {
    const locationMatch =
      locationFilter === "all" || item.branch.toLowerCase() === locationFilter;
    const monthMatch = monthFilter === "all" || item.month === monthFilter;
    const yearMatch =
      yearFilter === "all" || item.year === parseInt(yearFilter);
    return locationMatch && monthMatch && yearMatch;
  });

  const handleEditClick = (item: SalaryItem) => {
    setFormData({ ...item });
    setEditingItem(item.id);
  };

  const handleDeleteClick = (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this entry?"
    );
    if (confirmDelete) {
      setSalaryData((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleModalClose = () => {
    setEditingItem(null);
    setFormData({});
  };

  return (
    <div className="bg-gray-100 h-screen p-6 overflow-hidden text-sm">
      <div className="mx-auto h-full flex flex-col">
        {/* Header & Filters */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-[#891F1A]">Salary Table</h2>
          <div className="flex flex-wrap gap-3">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-sm text-black"
            >
              <option value="all">All Locations</option>
              <option value="dubai">Dubai</option>
              <option value="pakistan">Pakistan</option>
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-sm text-black"
            >
              <option value="all">All Months</option>
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((month) => (
                <option key={month} value={month.toLowerCase()}>
                  {month}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-sm text-black"
            >
              <option value="all">All Years</option>
              {[2022, 2023, 2024, 2025].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 relative">
          <ScrollAreaWithRail
            ref={scrollRef}
            heightClass="h-[calc(100vh-6rem)]" // adjust if your header area grows/shrinks
            railPosition="outside"
          >
            {/* Visual card container (no overflow here; sticky header needs it) */}
            <div className="rounded-xl shadow bg-white">
              <table className="w-full text-xs text-center divide-y divide-gray-100 table-auto">
                <thead className="font-semibold sticky top-0 z-10">
                  <tr>
                    {[
                      ["serial", "Serial No."],
                      ["firstName", "Name"],
                      ["lastName", "Last Name"],
                      ["phone", "Phone Number"],
                      ["designation", "Designation"],
                      ["branch", "Branch"],
                      ["baseSalary", "Base Salary"],
                      ["loans", "Loans"],
                      ["advances", "Advances"],
                      ["fines", "Fines"],
                      ["allowances", "Allowances"],
                      ["final", "Final Total Salary"],
                      ["actions", ""],
                    ].map(([key, label]) => (
                      <th
                        key={key}
                        className={cn(
                          "px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20",
                          key === "serial" && "rounded-tl-md",
                          key === "actions" && "rounded-tr-md"
                        )}
                      >
                        <div className="flex items-center justify-center">
                          {label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((item, index) => {
                      const final =
                        item.baseSalary +
                        item.allowances -
                        (item.loans + item.advances + item.fines);

                      return (
                        <tr
                          key={item.id}
                          className="text-gray-800 border-t hover:bg-[#891F1A]/5"
                        >
                          <td className="px-2 py-2 font-semibold">
                            {index + 1}
                          </td>
                          <td className="px-2 py-2">{item.firstName}</td>
                          <td className="px-2 py-2">{item.lastName}</td>
                          <td className="px-2 py-2">{item.phone}</td>
                          <td className="px-2 py-2">{item.designation}</td>
                          <td className="px-2 py-2">{item.branch}</td>
                          <td className="px-2 py-2">AED {item.baseSalary}</td>
                          <td className="px-2 py-2">AED {item.loans}</td>
                          <td className="px-2 py-2">AED {item.advances}</td>
                          <td className="px-2 py-2">AED {item.fines}</td>
                          <td className="px-2 py-2">AED {item.allowances}</td>
                          <td className="px-2 py-2 font-semibold text-green-600">
                            AED {final.toFixed(2)}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleDeleteClick(item.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600 hover:text-red-800" />
                              </button>
                              <button onClick={() => handleEditClick(item)}>
                                <Pencil className="w-4 h-4 text-gray-600 hover:text-[#891F1A]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={13}
                        className="text-center py-4 text-gray-500"
                      >
                        No records match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ScrollAreaWithRail>
        </div>

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-xl w-full max-w-xl shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  Edit Employee
                </h3>
                <button
                  onClick={handleModalClose}
                  className="text-gray-500 hover:text-red-500 text-xl font-bold"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["firstName", "First Name"],
                    ["lastName", "Last Name"],
                    ["phone", "Phone"],
                    ["designation", "Designation"],
                    ["branch", "Branch"],
                    ["baseSalary", "Base Salary"],
                    ["loans", "Loans"],
                    ["advances", "Advances"],
                    ["fines", "Fines"],
                    ["allowances", "Allowances"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600">
                        {label}
                      </label>
                      <input
                        type="text"
                        value={(formData as any)[key] || ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#891F1A] text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-4 gap-3">
                  <button
                    onClick={handleModalClose}
                    className="px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleModalClose}
                    className="px-4 py-2 bg-[#891F1A] text-white text-sm rounded-md hover:bg-[#6f1916]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
