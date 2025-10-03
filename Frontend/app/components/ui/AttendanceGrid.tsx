'use client';

import { useState, useEffect } from "react";
import { FaUserCircle, FaSearch, FaFileExport } from "react-icons/fa";
import { Tooltip } from "react-tooltip";
import { CSVLink } from "react-csv";

const today = new Date();
const monthName = today.toLocaleString("default", { month: "long" });
const year = today.getFullYear();

// 🧠 30 dummy Pakistani employee names
const mockData = [
  "Ahmed Khan", "Ayesha Malik", "Bilal Siddiqui", "Fatima Noor", "Hassan Raza",
  "Maria Javed", "Osman Iqbal", "Zainab Shah", "Ali Rafiq", "Hina Baig",
  "Tariq Mehmood", "Sana Qureshi", "Danish Ali", "Mehwish Bano", "Umar Asif",
  "Kiran Shahzad", "Shahid Nadeem", "Rabia Ahmed", "Noman Farooq", "Iqra Yousuf",
  "Hamza Tariq", "Lubna Akram", "Fahad Sultan", "Bushra Khalid", "Salman Irfan",
  "Nida Imran", "Asad Ullah", "Shanza Tariq", "Rashid Hussain", "Neha Zubair",
].map(name => ({
  name,
  avatar: "",
  days: Array.from({ length: 31 }, () => ["P", "L", "A"][Math.floor(Math.random() * 3)])
}));

const statusColors = {
  light: {
    P: "bg-green-100 text-green-700 hover:bg-green-200",
    L: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    A: "bg-red-100 text-red-700 hover:bg-red-200",
  },
  dark: {
    P: "bg-green-800 text-green-100 hover:bg-green-700",
    L: "bg-yellow-800 text-yellow-100 hover:bg-yellow-700",
    A: "bg-red-800 text-red-100 hover:bg-red-700",
  },
};

const statusLabel = {
  P: "Present",
  L: "Late",
  A: "Absent",
};

export default function AttendanceGrid() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(mockData);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: 1, end: 31 });
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Filter employees based on search term
    setFilteredData(
      mockData.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm]);

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [start, end] = e.target.value.split("-").map(Number);
    setDateRange({ start, end });
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const csvData = filteredData.map(emp => ({
    Employee: emp.name,
    ...emp.days.reduce((acc, status, i) => ({
      ...acc,
      [`Day ${i + 1}`]: statusLabel[status as keyof typeof statusLabel],
    }), {}),
  }));

  return (
    <div className={`p-6 rounded-2xl shadow-xl border w-full transition-colors duration-300 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
      {/* HEADER */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-2xl font-bold flex items-center gap-3">
          <span className="text-3xl">📅</span>
          Attendance Sheet – {monthName} {year}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <select
            onChange={handleDateRangeChange}
            className="p-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1-31">1–31</option>
            <option value="1-15">1–15</option>
            <option value="16-31">16–31</option>
          </select>
          <CSVLink
            data={csvData}
            filename={`attendance-${monthName}-${year}.csv`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FaFileExport /> Export
          </CSVLink>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-6 relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* LEGEND */}
      <div className="mb-6 flex items-center gap-6 text-sm font-medium">
        <div className="flex items-center gap-2">
          <span className={`w-4 h-4 rounded ${isDarkMode ? "bg-green-800 border-green-600" : "bg-green-100 border-green-400"} border`} /> Present
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-4 h-4 rounded ${isDarkMode ? "bg-yellow-800 border-yellow-600" : "bg-yellow-100 border-yellow-400"} border`} /> Late
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-4 h-4 rounded ${isDarkMode ? "bg-red-800 border-red-600" : "bg-red-100 border-red-400"} border`} /> Absent
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="overflow-y-auto max-h-[600px] rounded-xl border dark:border-gray-700">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className={`sticky top-0 z-10 shadow-sm ${isDarkMode ? "bg-gray-800" : "bg-gray-50"}`}>
              <tr>
                <th className={`px-4 py-3 text-left w-48 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>Employee</th>
                {Array.from({ length: dateRange.end - dateRange.start + 1 }, (_, i) => (
                  <th key={i} className={`px-2 py-3 text-center font-medium ${isDarkMode ? "text-gray-300 bg-gray-800" : "text-gray-700 bg-white"}`}>
                    {i + dateRange.start}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={isDarkMode ? "bg-gray-900" : "bg-white"}>
              {filteredData.map((emp, i) => (
                <tr key={i} className={`border-t group hover:${isDarkMode ? "bg-gray-800" : "bg-gray-50"} transition-all ${isDarkMode ? "border-gray-700" : ""}`}>
                  <td className="px-4 py-3 flex items-center gap-3 font-semibold">
                    <FaUserCircle className={`text-2xl ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
                    <span>{emp.name}</span>
                  </td>
                  {emp.days.slice(dateRange.start - 1, dateRange.end).map((status, j) => (
                    <td
                      key={j}
                      data-tooltip-id={`tooltip-${i}-${j}`}
                      data-tooltip-content={statusLabel[status as keyof typeof statusLabel]}
                      className={`px-2 py-2 text-center cursor-pointer rounded transition duration-200 ${isDarkMode ? statusColors.dark[status as keyof typeof statusColors.dark] : statusColors.light[status as keyof typeof statusColors.light]}`}
                    >
                      {status}
                      <Tooltip id={`tooltip-${i}-${j}`} place="top" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}