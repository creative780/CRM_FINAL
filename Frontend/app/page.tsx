'use client';
import React, { useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import DashboardNavbar from './components/navbar/DashboardNavbar';
import MiniCalendar from './components/MiniCalendar';


// ✅ Register all elements and plugins once
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Dynamically import patternomaly to avoid server-side issues
const getPattern = () => {
  const [pattern, setPattern] = useState<string | CanvasPattern>(() => '#d1d5db'); // Default to solid color if not loaded
  useEffect(() => {
    import('patternomaly').then((module) => {
      setPattern(module.default.draw('diagonal', '#d1d5db'));
    });
  }, []);
  return pattern;
};

export default function DashboardPage() {
  const patternColor = getPattern();

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
      <DashboardNavbar/>
      <br />
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
  <h2 className="text-2xl font-semibold text-gray-800">Revenue Amount</h2>
  <div className="flex gap-3 flex-wrap">
    <select className="border border-gray-300 rounded-md px-4 py-1.5 text-sm text-gray-700 bg-white shadow-sm focus:outline-none">
      <option>Weekly</option>
      <option>Monthly</option>
      <option>Yearly</option>
    </select>
    <button className="px-4 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-md bg-white hover:bg-gray-50 shadow-sm">
      Filter
    </button>
    <button className="px-4 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-md bg-white hover:bg-gray-50 shadow-sm flex items-center gap-1">
      Add Widget <span className="text-lg leading-none">＋</span>
    </button>
  </div>
</div>

     {/* Revenue Summary Section */}
<div className="mt-6 bg-white border rounded-xl shadow-sm px-6 py-5">
  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
    {/* Optional header row (empty for now) */}
  </div>

  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
    {/* Chart */}
    <div className="xl:col-span-8">
      <Bar
        data={{
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          datasets: [
            {
              label: 'Income',
              data: [10, 12, 8, 14, 10, 16, 13, 11, 15, 9, 12, 10],
              backgroundColor: '#A3E635',
              borderRadius: 6,
              barPercentage: 0.9,
              categoryPercentage: 0.9,
              order: 2,
            },
            {
              label: 'Expenses',
              data: [8, 10, 9, 8, 8, 8, 8, 8, 8, 8, 8, 7],
              backgroundColor: patternColor,
              borderRadius: 6,
              barPercentage: 0.9,
              categoryPercentage: 0.9,
              order: 1,
            }
          ]
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            datalabels: {
          display: false // 👈 disable for this chart
        },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += `$${Math.abs(context.parsed.y)}k`;
                  }
                  return label;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              min: 0,
              max: 20,
              ticks: {
                callback: (value) => `$${value}k`,
                stepSize: 10,
              },
              grid: { color: '#e5e7eb' },
              stacked: true,
            },
            x: {
              grid: { display: false },
              stacked: true,
            }
          }
        }}
        style={{ minHeight: '250px' }}
      />
    </div>

    {/* Divider */}
    <div className="hidden xl:flex justify-center items-center">
      <div className="w-[2px] h-4/5 bg-black rounded-full"></div>
    </div>

    {/* Stats */}
    <div className="xl:col-span-3 flex flex-col justify-between gap-6">
      {/* Total Income */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Total Income</p>
          <p className="text-[24px] font-bold text-black mt-1">$548,763.20</p>
        </div>
        <span className="text-sm text-green-600 font-semibold bg-green-100 px-3 py-1 rounded-full">
          +15%
        </span>
      </div>

      {/* Total Expenses */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-[24px] font-bold text-black mt-1">$426,813.46</p>
        </div>
        <span className="text-sm text-red-500 font-semibold bg-red-100 px-3 py-1 rounded-full">
          -12%
        </span>
      </div>

      {/* Total Net Income */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Total Net Income</p>
          <p className="text-[24px] font-bold text-black mt-1">$66,625.75</p>
        </div>
        <span className="text-sm text-green-600 font-semibold bg-green-100 px-3 py-1 rounded-full">
          +12%
        </span>
      </div>
    </div>
  </div>
</div>

{/* Data Report Header Section - Borderless */}
<div className="mt-6 px-2 md:px-0">
  <div className="flex flex-wrap items-center justify-between bg-gray-100 px-4 py-3 rounded-none">
    {/* Left: Title */}
    <h2 className="text-lg md:text-xl font-semibold text-gray-800">Data report</h2>

    {/* Center: Search bar */}
    <div className="flex-1 mx-4 max-w-sm">
      <div className="relative">
        <input
          type="text"
          placeholder="Search here..."
          className="w-full py-2 pl-10 pr-4 text-sm rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
          />
        </svg>
      </div>
    </div>

    {/* Right: Dropdown & Filter */}
    <div className="flex gap-3">
      <select className="border border-gray-300 rounded-md px-4 py-1.5 text-sm text-gray-700 bg-white focus:outline-none">
        <option>Monthly</option>
        <option>Weekly</option>
        <option>Yearly</option>
      </select>
      <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-black to-gray-800 rounded-md shadow hover:brightness-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 14.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 018 17v-2.586L3.293 6.707A1 1 0 013 6V4z" />
  </svg>
  Filter
</button>

    </div>
  </div>
</div>




     {/* Stats and Charts */}
<div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

  {/* Sales Statistics */}
  {/* Sales Statistics Section */}
<section className="bg-white rounded-2xl shadow-sm p-5 lg:col-span-2">
  {/* Header */}
  <div className="flex items-start justify-between mb-6">
    <h3 className="text-lg font-semibold text-gray-900">Sales statistic</h3>
    <button className="text-gray-400 hover:text-gray-600">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M12 12v.01M12 18v.01" />
      </svg>
    </button>
  </div>

  {/* Summary Stats */}
  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
    {/* Total Profit */}
    <div className="flex items-center gap-2">
      <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-lime-500 text-white text-sm font-bold">💰</span>
      <div>
        <p className="text-sm text-gray-500">Total profit</p>
        <p className="text-base font-bold text-gray-900">$ 372,3k</p>
      </div>
    </div>

    {/* Sales Revenue */}
    <div className="flex items-center gap-2">
      <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500 text-white text-sm font-bold">🏷️</span>
      <div>
        <p className="text-sm text-gray-500">Sales revenue</p>
        <p className="text-base font-bold text-gray-900">$ 123,1k</p>
      </div>
    </div>

    {/* Average Bill */}
    <div className="flex items-center gap-2">
      <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-black text-white text-sm font-bold">🧾</span>
      <div>
        <p className="text-sm text-gray-500">Average bill</p>
        <p className="text-base font-bold text-gray-900">$ 2,090</p>
      </div>
    </div>
  </div>

  {/* Chart Section */}
  <div className="h-[300px] relative">
    <Bar
      data={{
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: 'Previous Year',
            data: [20000, 18000, 22000, 16000, 30000, 40000, 25000, 21000, 27000, 23000, 20000, 19000],
            backgroundColor: '#000000',
            borderRadius: 6,
            barThickness: 18,
          },
          {
            label: 'This Year',
            data: [25000, 20000, 30000, 28000, 34000, 46000, 29000, 27000, 31000, 26000, 24000, 23000],
            backgroundColor: '#1E40AF',
            borderRadius: 6,
            barThickness: 18,
          },
          {
            label: 'Forecast',
            data: [5000, 4000, 6000, 3000, 8000, 9000, 7000, 5000, 6000, 7000, 8000, 6000],
            backgroundColor: patternColor,
            borderRadius: 6,
            barThickness: 18,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
          display: false // 👈 disable for this chart
        },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `$${((value as number) / 1000).toFixed(0)}k`,
              color: '#6B7280',
            },
            grid: {
              color: '#E5E7EB',
              lineWidth: 1,
            },
          },
          x: {
            stacked: false,
            ticks: { color: '#6B7280' },
            grid: { display: false },
          },
        },
      }}
    />
  </div>
</section>
{/* Web Traffic Pie Chart (Styled like image) */}
<div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col col-span-1">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900">Visitors By Web Traffic Sources</h3>
  </div>
  <div className="flex flex-col md:flex-row items-center justify-between">
    {/* Pie Chart */}
    <div className="w-full md:w-2/3 h-[260px]">
      <Pie
        data={{
          labels: ['Searches', 'Social Media', 'Links', 'Direct', 'Advertising'],
          datasets: [
            {
              label: 'Traffic Source',
              data: [40, 25, 15, 10, 10],
              backgroundColor: [
                '#3498DB', // Searches
                '#D988BC', // Social Media
                '#4BC0C0', // Links
                '#F39C12', // Direct
                '#F1C40F', // Advertising
              ],
              borderWidth: 0,
            },
          ],
        }}
        options={{
          plugins: {
            legend: { display: false },
            datalabels: {
              formatter: (value, ctx) => `${value}%`,
              color: '#fff',
              font: { weight: 'bold', size: 12 },
            },
          },
          responsive: true,
          maintainAspectRatio: false,
        }}
      />
    </div>

    {/* Custom Legend */}
    <div className="mt-4 md:mt-0 md:ml-6 space-y-2">
      {[
        ['#3498DB', 'Searches'],
        ['#D988BC', 'Social Media'],
        ['#4BC0C0', 'Links'],
        ['#F39C12', 'Direct'],
        ['#F1C40F', 'Advertising'],
      ].map(([color, label]) => (
        <div key={label} className="flex items-center gap-2 text-sm text-gray-700">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
          {label}
        </div>
      ))}
    </div>
  </div>
</div>








  {/* Visit Statistics */}
  <div className="bg-white p-5 rounded-2xl shadow-sm col-span-2">
    <h3 className="text-lg font-semibold mb-4 text-gray-900">Visit statistics</h3>
    <div className="h-48 relative">
      <Line
        data={{
          labels: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
          datasets: [
            {
              label: 'Visits',
              data: [120, 180, 240, 160, 140, 200, 220],
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              tension: 0.3,
              fill: true,
            }
          ]
        }}
        options={{ responsive: true, maintainAspectRatio: false }}
      />
    </div>
  </div>

{/* Top Products This Week – Modern UI */}
<div className="bg-white p-5 rounded-2xl shadow-sm col-span-1 flex flex-col">
  <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Products This Week</h3>

  <ul className="space-y-4">
    {[
      { name: "Canvas Print A3", sales: 124, trend: "+18%", image: "/products/canvas.jpg" },
      { name: "Custom Mug", sales: 98, trend: "+12%", image: "/products/mug.jpg" },
      { name: "Business Card Gold", sales: 85, trend: "+8%", image: "/products/card.jpg" }
    ].map((product, idx) => (
      <li key={idx} className="flex items-center justify-between group hover:bg-gray-50 px-2 py-2 rounded-lg transition">
        {/* Left - Image + Name */}
        <div className="flex items-center gap-3">
          <img
            src="https://tse4.mm.bing.net/th/id/OIP.FxK9eXf6-rwn6xmI7N1i-AHaI_?pid=Api&P=0&h=180"
            alt={product.name}
            className="w-10 h-10 object-cover rounded-lg border"
          />
          <div>
            <p className="text-sm font-medium text-gray-800 group-hover:text-black">{product.name}</p>
            <p className="text-xs text-gray-400">{product.sales} sold</p>
          </div>
        </div>

        {/* Right - Trend */}
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2"
            viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span className="text-xs text-green-600 font-semibold">{product.trend}</span>
        </div>
      </li>
    ))}
  </ul>
</div>


 





  {/* Employee Check-In Summary – Modern Version */}
{/* Employee Attendance – Enhanced Design */}
<div className="bg-white rounded-2xl shadow-sm col-span-2 overflow-hidden flex flex-col border border-gray-200">
  {/* Header */}
  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
    <div>
      <h3 className="text-lg font-semibold">Employee Attendance</h3>
      <p className="text-xs text-indigo-100">Summary for Today</p>
    </div>
    <span className="text-xs font-medium bg-white text-indigo-700 px-3 py-1 rounded-full shadow-sm">
      14 / 20 Checked-In
    </span>
  </div>

  {/* Body */}
  <div className="p-6 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6">
    {/* Left Side */}
    <div className="text-center sm:text-left">
      <p className="text-sm text-gray-500">Total Checked-In</p>
      <h2 className="text-4xl font-bold text-black mt-1">14 Employees</h2>
      <p className="text-xs text-gray-400 mt-1">Out of 20 Scheduled</p>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-indigo-600 h-2 rounded-full w-[70%] transition-all duration-500"></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">70% attendance rate</p>
      </div>
    </div>

    {/* Right Breakdown */}
    <div className="grid grid-cols-3 gap-6">
      {[
        { label: "On Time", value: "75%", color: "green", icon: "🟢", bg: "bg-green-100", text: "text-green-700" },
        { label: "Late", value: "15%", color: "yellow", icon: "🕒", bg: "bg-yellow-100", text: "text-yellow-700" },
        { label: "Absent", value: "10%", color: "red", icon: "❌", bg: "bg-red-100", text: "text-red-700" }
      ].map((item, idx) => (
        <div key={idx} className="flex flex-col items-center hover:scale-105 transition-transform">
          <div className={`w-11 h-11 ${item.bg} ${item.text} font-bold text-sm rounded-full flex items-center justify-center shadow`}>
            {item.icon}
          </div>
          <p className="mt-2 text-xs text-gray-500 font-medium">{item.label}</p>
          <p className="text-sm font-semibold text-gray-800">{item.value}</p>
        </div>
      ))}
    </div>
  </div>

  {/* Footer Legend */}
  <div className="px-6 py-3 bg-gray-50 flex items-center justify-center gap-6 border-t">
    {[
      { icon: '🟢', label: 'On Time' },
      { icon: '🕒', label: 'Late' },
      { icon: '❌', label: 'Absent' },
    ].map((item, idx) => (
      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
        <span>{item.icon}</span>
        <span>{item.label}</span>
      </div>
    ))}
  </div>
</div>



 {/* Low Stock Alert - Scrollable Version */}
<div className="bg-white p-5 rounded-2xl shadow-sm col-span-1 flex flex-col">
  {/* Header */}
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-800">Low Stock Alerts</h3>
    <span className="text-sm font-medium text-red-600 bg-red-100 px-3 py-1 rounded-full">
      12 Items Critical
    </span>
  </div>

  {/* Scrollable List */}
  <div className="overflow-y-auto max-h-[340px] pr-2 space-y-4">
    {[...Array(12)].map((_, idx) => (
      <div
        key={idx}
        className="bg-red-50 p-3 rounded-xl shadow-sm hover:shadow-md transition flex flex-col gap-2"
      >
        <div className="flex justify-between items-center">
          <p className="font-medium text-gray-800">Item #{idx + 1}</p>
          <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
            Stock: {Math.floor(Math.random() * 10) + 1}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          SKU: ITEM-{1000 + idx} / Last Restock: Jul {Math.floor(Math.random() * 28 + 1)}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-500 h-2 rounded-full"
            style={{ width: `${Math.floor(Math.random() * 20) + 5}%` }}
          ></div>
        </div>

        <button className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 transition w-full">
          Request Restock
        </button>
      </div>
    ))}
  </div>
</div>

{/* Employee Monitoring System - Premium Card */}
<div className="bg-white rounded-2xl shadow-md col-span-2 overflow-hidden flex flex-col border border-gray-200">
  {/* Header */}
  <div className="bg-gradient-to-r from-black to-gray-800 text-white px-6 py-4 flex justify-between items-center">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center text-lg">🧑‍💻</div>
      <div>
        <h3 className="text-lg font-semibold">Employee Monitoring System</h3>
        <p className="text-xs text-gray-300">Secure, accountable, and real-time tracking</p>
      </div>
    </div>
    <span className="text-xs font-semibold bg-red-800 text-white px-3 py-1 rounded-full">
      Admin Access
    </span>
  </div>

  {/* Body */}
  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50">
    {/* Device Monitoring */}
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🖥️</span>
        <h4 className="text-md font-semibold text-gray-800">PC & Device Monitoring</h4>
      </div>
      <ul className="text-sm text-gray-700 space-y-2 list-inside list-disc pl-2">
        <li><span className="font-medium">Keystroke Logs</span> (Admin-only)</li>
        <li><span className="font-medium">Screenshots</span> every 30s (configurable)</li>
        <li><span className="font-medium">Clipboard Tracking</span> and copy protection</li>
        <li><span className="font-medium">App Usage</span> with idle detection</li>
        <li><span className="font-medium">Live Sessions</span> (optional screen view)</li>
        <li><span className="font-medium">Enforced Restrictions</span> (e.g. social media block)</li>
      </ul>
    </div>

    {/* Mobile Monitoring */}
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📱</span>
        <h4 className="text-md font-semibold text-gray-800">Mobile Device Monitoring</h4>
      </div>
      <ul className="text-sm text-gray-700 space-y-2 list-inside list-disc pl-2">
        <li><span className="font-medium">CRM App:</span> sandboxed for work only</li>
        <li><span className="font-medium">Prevent Screenshots</span> & screen recording</li>
        <li><span className="font-medium">Block Contact Copying</span> from device</li>
        <li><span className="font-medium">GPS Tracking</span> during work hours</li>
        <li><span className="font-medium">Push Check-In/Out</span> for remote teams</li>
      </ul>
    </div>
  </div>

  {/* Footer */}
  <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-end">
    <button className="bg-black text-white px-5 py-2 rounded-md hover:bg-gray-900 transition text-sm font-medium">
      View Detailed Logs
    </button>
  </div>
</div>
  <MiniCalendar />




  

</div>

    </div>
  );
}