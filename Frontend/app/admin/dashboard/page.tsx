'use client';
import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
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
import DashboardNavbar from '../../components/navbar/DashboardNavbar';
import MiniCalendar from '../../components/MiniCalendar';
import { useUser } from '@/contexts/user-context';
import { dashboardApi, DashboardKPIs, RecentActivity } from '@/lib/dashboard';

// ✅ Register once
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

// Lazy pattern background for "Expenses" bars you already use
const getPattern = () => {
  const [pattern, setPattern] = useState<CanvasPattern | string>(() => '#d1d5db');
  useEffect(() => {
    import('patternomaly').then((m) => {
      setPattern(m.default.draw('diagonal', '#d1d5db'));
    });
  }, []);
  return pattern;
};

export default function DashboardPage() {
  const patternColor = getPattern();
  const { user } = useUser();

  // ------- Resolve role (localStorage first, fallback to user.role) -------
  type Role = 'admin' | 'sales' | 'designer' | 'production';
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let r: Role | null = null;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_role') as Role | null;
      if (stored) r = stored;
    }
    if (!r && (user as any)?.role) r = (user as any).role as Role;
    setRole(r);
  }, [user]);

  const isAdmin = role === 'admin';
  const isSales = role === 'sales';
  const isDesigner = role === 'designer';
  const isProduction = role === 'production';

  // ------- Dashboard data from API -------
  const [dashboardData, setDashboardData] = useState<{
    kpis: DashboardKPIs | null;
    recentActivity: RecentActivity | null;
    loading: boolean;
    error: string | null;
  }>({
    kpis: null,
    recentActivity: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setDashboardData(prev => ({ ...prev, loading: true, error: null }));
        
        const [kpis, recentActivity] = await Promise.all([
          dashboardApi.getKPIs(),
          dashboardApi.getRecentActivity(),
        ]);
        
        setDashboardData({
          kpis,
          recentActivity,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setDashboardData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load dashboard data',
        }));
      }
    };

    loadDashboardData();
  }, []);

  if (role === null || dashboardData.loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
        <DashboardNavbar />
        <br />
        <div className="text-gray-600">Loading your dashboard…</div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
        <DashboardNavbar />
        <br />
        <div className="text-red-600">Error: {dashboardData.error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
      <DashboardNavbar />
      <br />

      {/* ======= Top Area under shared header ======= */}
      {(isDesigner || isProduction) && !isAdmin ? (
  // Data Report + Search (unchanged)
  <div className="mb-6">
    <h2 className="text-2xl font-semibold text-gray-800">Data Report</h2>
    <div className="mt-3 max-w-md">
      <div className="relative">
        <input
          type="text"
          placeholder="Search here..."
          className="w-full py-2 pl-10 pr-4 text-sm rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black border border-gray-300"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4"
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
        </svg>
      </div>
    </div>
  </div>
) : (
  // Revenue Amount (unchanged)
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
)}


      {/* ======= Revenue Summary (Admin + Sales) ======= */}
      {(isAdmin || isSales) && (
        <div className="mt-6 bg-white border rounded-xl shadow-sm px-6 py-5">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Chart column */}
            <div className="xl:col-span-8">
              <div className="h-[260px] md:h-[280px] xl:h-[260px]">
                <Bar
                  data={{
                    labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
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
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      datalabels: { display: false },
                      tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                          label: (ctx) => {
                            const lbl = ctx.dataset.label ? `${ctx.dataset.label}: ` : '';
                            return `${lbl}$${Math.abs(ctx.parsed.y)}k`;
                          },
                        },
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        min: 0,
                        max: 20,
                        ticks: { callback: (v) => `$${v}k`, stepSize: 10 },
                        grid: { color: '#e5e7eb' },
                        stacked: true,
                      },
                      x: { grid: { display: false }, stacked: true },
                    },
                  }}
                />
              </div>
            </div>

            {/* Right panel */}
            <div className="xl:col-span-4 xl:border-l xl:pl-6 flex flex-col justify-between gap-6">
              {isAdmin ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Leads</p>
                      <p className="text-[24px] font-bold text-black mt-1">{dashboardData.kpis?.leads.total || 0}</p>
                    </div>
                    <span className="text-sm text-green-600 font-semibold bg-green-100 px-3 py-1 rounded-full">
                      +{dashboardData.kpis?.leads.growth_rate || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Orders</p>
                      <p className="text-[24px] font-bold text-black mt-1">{dashboardData.kpis?.orders.total || 0}</p>
                    </div>
                    <span className="text-sm text-blue-600 font-semibold bg-blue-100 px-3 py-1 rounded-full">
                      +{dashboardData.kpis?.orders.growth_rate || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Revenue This Month</p>
                      <p className="text-[24px] font-bold text-black mt-1">
                        ${dashboardData.kpis?.revenue.this_month.toLocaleString() || '0'}
                      </p>
                    </div>
                    <span className="text-sm text-green-600 font-semibold bg-green-100 px-3 py-1 rounded-full">
                      +{dashboardData.kpis?.revenue.growth_rate || 0}%
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Your Total Orders</p>
                      <p className="text-[24px] font-bold text-black mt-1">{dashboardData.kpis?.orders.total || 0}</p>
                    </div>
                    <span className="text-sm text-blue-700 font-semibold bg-blue-100 px-3 py-1 rounded-full">My Orders</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">New Leads Today</p>
                      <p className="text-[24px] font-bold text-black mt-1">{dashboardData.kpis?.leads.new_today || 0}</p>
                    </div>
                    <span className="text-sm text-amber-700 font-semibold bg-amber-100 px-3 py-1 rounded-full">Today</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Won This Month</p>
                      <p className="text-[24px] font-bold text-black mt-1">{dashboardData.kpis?.leads.won_this_month || 0}</p>
                    </div>
                    <span className="text-sm text-green-700 font-semibold bg-green-100 px-3 py-1 rounded-full">Wins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Revenue This Month</p>
                      <p className="text-[24px] font-bold text-black mt-1">
                        ${dashboardData.kpis?.revenue.this_month.toLocaleString() || '0'}
                      </p>
                    </div>
                    <span className="text-sm text-gray-700 font-semibold bg-gray-100 px-3 py-1 rounded-full">USD</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Designers do NOT see the neutral toolbar below; others do */}
      {!isDesigner && (
        <div className="mt-6 px-2 md:px-0">
          <div className="flex flex-wrap items-center justify-between bg-gray-100 px-4 py-3 rounded-none mb-2">
            <div className="flex-1 mx-4 max-w-sm">
              {/* <div className="relative">
                <input
                  type="text"
                  placeholder="Search here..."
                  className="w-full py-2 pl-10 pr-4 text-sm rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4"
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
              </div> */}
            </div>
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
      )}

      {/* ======= PRODUCTION ENHANCEMENTS (Admin + Production only) ======= */}
      {(isAdmin || isProduction) && (
        <>
          {/* Production KPIs */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Jobs in WIP', value: '27', sub: '↑ 4 vs yesterday', pill: 'WIP' },
              { label: 'Avg. Turnaround', value: '2.7d', sub: 'last 7 days', pill: 'SLA' },
              { label: 'Machine Utilization', value: '81%', sub: 'peak 92% today', pill: 'Util' },
              { label: 'Reprint Rate', value: '1.8%', sub: '↓ 0.5% WoW', pill: 'QA' },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-5 border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{k.label}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{k.pill}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* WIP Queue + Machine Utilization */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* WIP Queue Table */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Production Queue (WIP)</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">Auto-sorted</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3">Job</th>
                      <th className="py-2 pr-3">Machine</th>
                      <th className="py-2 pr-3">ETA</th>
                      <th className="py-2">Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'CP-2041', job: 'Retail Signage', machine: 'HP Latex 570', eta: 'Today 15:30', stage: 'Printing' },
                      { id: 'CP-2037', job: 'POS Kit', machine: 'Summa Cutter', eta: 'Today 17:10', stage: 'Cutting' },
                      { id: 'CP-2033', job: 'Backdrop', machine: 'Epson S80600', eta: 'Tomorrow 09:00', stage: 'Lamination' },
                      { id: 'CP-2029', job: 'Vehicle Wrap', machine: 'HP Latex 800W', eta: 'Tomorrow 13:00', stage: 'Mounting' },
                      { id: 'CP-2026', job: 'Outdoor Banners', machine: 'Mimaki JV150', eta: 'Tomorrow 16:45', stage: 'QA' },
                    ].map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium text-gray-800">{r.id}</td>
                        <td className="py-2 pr-3">{r.job}</td>
                        <td className="py-2 pr-3">{r.machine}</td>
                        <td className="py-2 pr-3">{r.eta}</td>
                        <td className="py-2">
                          <span className="text-xs bg-white border rounded-full px-2 py-0.5">{r.stage}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Machine Utilization Bar */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Machine Utilization (Today)</h3>
              <div className="h-64">
                <Bar
                  data={{
                    labels: ['HP L570', 'HP 800W', 'Mimaki JV150', 'Epson S80600', 'Summa Cutter', 'Laminator'],
                    datasets: [
                      { label: 'Utilization %', data: [86, 78, 64, 72, 58, 49], backgroundColor: '#1E40AF', borderRadius: 6, barThickness: 28 },
                      { label: 'Target %', data: [85, 85, 85, 85, 85, 85], backgroundColor: '#10B981', borderRadius: 6, barThickness: 28 },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: true, position: 'bottom' },
                      datalabels: { display: false },
                      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } },
                    },
                    scales: {
                      y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%`, color: '#6B7280' }, grid: { color: '#E5E7EB' } },
                      x: { grid: { display: false }, ticks: { color: '#6B7280' } },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stage Mix + Shift Throughput */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Job Stage Distribution */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Jobs by Stage</h3>
              <div className="h-64">
                <Doughnut
                  data={{
                    labels: ['Printing', 'Cutting', 'Lamination', 'Mounting', 'QA'],
                    datasets: [{ data: [9, 6, 4, 5, 3], backgroundColor: ['#60A5FA', '#34D399', '#F59E0B', '#A78BFA', '#F87171'], borderWidth: 0 }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom' }, datalabels: { display: false } },
                  }}
                />
              </div>
            </div>

            {/* Shift Throughput */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Shift Throughput (Jobs Completed)</h3>
              <div className="h-64">
                <Line
                  data={{
                    labels: ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00'],
                    datasets: [
                      { label: 'Morning Shift', data: [2, 4, 7, 9, 11, 12, 12, 12], borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.15)', tension: 0.35, fill: true },
                      { label: 'Evening Shift', data: [0, 1, 2, 4, 6, 8, 10, 12], borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.15)', tension: 0.35, fill: true },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom' }, datalabels: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { color: '#6B7280' }, grid: { color: '#E5E7EB' } },
                      x: { ticks: { color: '#6B7280' }, grid: { display: false } },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* QA Progress + Material Usage + Delivery Handoff */}
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* QA Checklist Progress */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">QA Checklist Progress</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">Today</span>
              </div>
              <ul className="space-y-3">
                {[
                  { name: 'Color Calibration', pct: 100 },
                  { name: 'Edge Trim Accuracy', pct: 82 },
                  { name: 'Lamination Bubbles', pct: 91 },
                  { name: 'Mounting Alignment', pct: 74 },
                  { name: 'Packaging & Labels', pct: 88 },
                ].map((q, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-800">{q.name}</span>
                      <span className="text-gray-600">{q.pct}%</span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${q.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Material Usage (last 7 days) */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Material Usage (Last 7 days)</h3>
              <div className="h-64">
                <Bar
                  data={{
                    labels: ['Vinyl','Fabric','Paper','Ink CMYK','Lamination'],
                    datasets: [
                      { label: 'Used', data: [320, 210, 450, 180, 240], backgroundColor: '#111827', borderRadius: 6 },
                      { label: 'Reorder Threshold', data: [250, 200, 400, 220, 220], backgroundColor: '#EF4444', borderRadius: 6 },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom' }, datalabels: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { color: '#6B7280' }, grid: { color: '#E5E7EB' } },
                      x: { ticks: { color: '#6B7280' }, grid: { display: false } },
                    },
                  }}
                />
              </div>
            </div>

            {/* Delivery Handoff */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Ready for Delivery</h3>
                <button
                  onClick={() => (window.location.href = '/delivery/manifest')}
                  className="text-xs px-3 py-1 rounded-md border bg-white hover:bg-gray-50"
                >
                  Open Manifest
                </button>
              </div>
              <ul className="space-y-3">
                {[
                  { id: 'CP-2033', title: 'Event Backdrop', pkg: '2 tubes + 1 crate', code: '#DLV-558921' },
                  { id: 'CP-2026', title: 'Outdoor Banners', pkg: '5 rolls', code: '#DLV-558774' },
                  { id: 'CP-2018', title: 'Window Decals', pkg: '1 box', code: '#DLV-558623' },
                ].map((d, i) => (
                  <li key={i} className="bg-gray-50 rounded-xl px-4 py-3 border flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {d.id} • {d.title}
                      </p>
                      <p className="text-xs text-gray-600">{d.pkg}</p>
                    </div>
                    <span className="text-xs text-gray-700 bg-white border rounded-full px-2 py-0.5">
                      {d.code}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* ======= SALES ENHANCEMENTS (Admin + Sales only) ======= */}
      {(isAdmin || isSales) && (
        <>
          {/* KPIs row (concise) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Leads this month', value: dashboardData.kpis?.leads.won_this_month || 0, sub: `+${dashboardData.kpis?.leads.growth_rate || 0}% vs last mo`, pill: 'Hot' },
              { label: 'Total Orders', value: dashboardData.kpis?.orders.total || 0, sub: `+${dashboardData.kpis?.orders.growth_rate || 0}% WoW`, pill: '↑' },
              { label: 'Revenue this month', value: `$${dashboardData.kpis?.revenue.this_month.toLocaleString() || '0'}`, sub: `+${dashboardData.kpis?.revenue.growth_rate || 0}% vs last mo`, pill: '$' },
              { label: 'Active Employees', value: dashboardData.kpis?.employees.active || 0, sub: `of ${dashboardData.kpis?.employees.total || 0} total`, pill: 'Team' },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-5 border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{k.label}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{k.pill}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Forecast vs Target (combo chart) */}
          <div className="mt-4 bg-white rounded-2xl shadow-sm p-5 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quarter Forecast vs Target</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: ['Q1','Q2','Q3','Q4'],
                  datasets: [
                    { type: 'bar' as const, label: 'Bookings', data: [180, 220, 260, 300], backgroundColor: '#1E40AF', borderRadius: 6, barThickness: 38 },
                    { label: 'Target', data: [200, 240, 280, 320], backgroundColor: '#10B981', borderRadius: 6, barThickness: 38 },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true, position: 'bottom' },
                    datalabels: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y}k` } },
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { callback: (v) => `$${v}k`, color: '#6B7280' }, grid: { color: '#E5E7EB' } },
                    x: { grid: { display: false }, ticks: { color: '#6B7280' } },
                  },
                }}
              />
            </div>
          </div>

          {/* Lead Source Performance + Sales Funnel */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-5 border">
  <h3 className="text-lg font-semibold text-gray-900 mb-3">Lead Source Performance</h3>
  <div className="h-64">
    <Bar
      data={{
        labels: ['Google Ads', 'Organic', 'Referrals', 'Social', 'Email'],
        datasets: [
          { label: 'MQL (Marketing Qualified Leads)', data: [120, 90, 60, 55, 40], backgroundColor: '#93C5FD', borderRadius: 4 },
          { label: 'SQL (Sales Qualified Leads)', data: [80, 60, 42, 33, 25], backgroundColor: '#60A5FA', borderRadius: 4 },
          { label: 'Won (Closed Deals)', data: [36, 28, 18, 12, 9], backgroundColor: '#1D4ED8', borderRadius: 4 },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: true, position: 'bottom' }, 
          datalabels: { display: false } 
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#E5E7EB' }, ticks: { color: '#6B7280' } },
          x: { grid: { display: false }, ticks: { color: '#6B7280' }, stacked: true },
        },
      }}
    />
  </div>
</div>


            <div className="bg-white rounded-2xl shadow-sm p-5 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Sales Funnel</h3>
              <div className="h-64">
                <Bar
                  data={{
                    labels: ['Prospects', 'Qualified', 'Proposal', 'Negotiation', 'Won'],
                    datasets: [
                      {
                        label: 'Count',
                        data: [420, 260, 140, 80, 38],
                        backgroundColor: ['#0EA5E9', '#38BDF8', '#60A5FA', '#93C5FD', '#BFDBFE'],
                        borderRadius: 8,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y' as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      datalabels: {
                        color: '#111',
                        anchor: 'end',
                        align: 'right',
                        formatter: (v) => v,
                        clamp: true,
                      },
                    },
                    scales: {
                      x: { beginAtZero: true, grid: { color: '#E5E7EB' }, ticks: { color: '#6B7280' } },
                      y: { grid: { display: false }, ticks: { color: '#6B7280' } },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Win/Loss by Segment + Leaderboard */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-5 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Win/Loss by Segment</h3>
              <div className="h-56">
                <Doughnut
                  data={{
                    labels: ['SMB Win', 'SMB Loss', 'Enterprise Win', 'Enterprise Loss'],
                    datasets: [{ data: [44, 18, 22, 16], backgroundColor: ['#10B981', '#FCA5A5', '#3B82F6', '#F59E0B'], borderWidth: 0 }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom' }, datalabels: { display: false } },
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 border lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Reps Leaderboard</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Rep</th>
                      <th className="py-2 pr-4">Won Deals</th>
                      <th className="py-2 pr-4">Revenue</th>
                      <th className="py-2">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { rep: 'Aisha K.', won: 18, rev: 92.4, win: '31%' },
                      { rep: 'Bilal R.', won: 15, rev: 78.1, win: '28%' },
                      { rep: 'Sana M.', won: 12, rev: 64.7, win: '26%' },
                      { rep: 'Omar H.', won: 10, rev: 51.2, win: '23%' },
                    ].map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium text-gray-800">{r.rep}</td>
                        <td className="py-2 pr-4">{r.won}</td>
                        <td className="py-2 pr-4">${r.rev.toFixed(1)}k</td>
                        <td className="py-2">{r.win}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Opportunities */}
          <div className="mt-4 bg-white rounded-2xl shadow-sm p-5 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Opportunities</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dashboardData.recentActivity?.leads.slice(0, 6).map((lead, i) => (
                <li key={i} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {lead.title || `Lead #${lead.id}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {lead.stage} • {lead.org_name || 'No Organization'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-700 bg-white border rounded-full px-2 py-0.5">
                    ${lead.value.toLocaleString()}
                  </span>
                </li>
              )) || []}
            </ul>
          </div>
        </>
      )}

      {/* ======= DESIGNER ENHANCEMENTS (Admin + Designer only) ======= */}
      {(isAdmin || isDesigner) && (
        <>
          {/* Designer KPIs */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Active projects', value: '12', sub: '3 due this week', pill: 'Focus' },
              { label: 'Pending feedback', value: '7', sub: 'Clients to review', pill: 'Review' },
              { label: 'Avg. revisions / project', value: '2.4', sub: '↓ 0.3 vs last mo', pill: 'Quality' },
              { label: 'On-time delivery', value: '92%', sub: '+4% vs last mo', pill: 'SLA' },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-5 border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{k.label}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{k.pill}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Designer charts: Time Spent, Revisions Trend, Task Status */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-5 border lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Time Spent by Project (hrs)</h3>
              <div className="h-64">
                <Bar
                  data={{
                    labels: ['Brand Redesign', 'E-commerce UI', 'Packaging Set', 'Brochure A4', 'Event Booth'],
                    datasets: [
                      { label: 'Design', data: [34, 28, 22, 12, 16], backgroundColor: '#818CF8', borderRadius: 6 },
                      { label: 'Review', data: [8, 6, 4, 3, 2], backgroundColor: '#C7D2FE', borderRadius: 6 },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom' }, datalabels: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: '#E5E7EB' }, ticks: { color: '#6B7280' } },
                      x: { grid: { display: false }, ticks: { color: '#6B7280' }, stacked: true },
                    },
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Task Status</h3>
              <div className="h-64">
                <Doughnut
                  data={{
                    labels: ['In Progress', 'Awaiting Feedback', 'Revisions', 'Completed'],
                    datasets: [{ data: [10, 7, 4, 21], backgroundColor: ['#60A5FA', '#FBBF24', '#F87171', '#34D399'], borderWidth: 0 }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom' }, datalabels: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-2xl shadow-sm p-5 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Revisions Trend (last 8 weeks)</h3>
            <div className="h-64">
              <Line
                data={{
                  labels: ['W1','W2','W3','W4','W5','W6','W7','W8'],
                  datasets: [
                    { label: 'Revisions', data: [18, 16, 20, 15, 14, 13, 12, 11], borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.15)', tension: 0.35, fill: true },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false }, datalabels: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: '#E5E7EB' }, ticks: { color: '#6B7280' } },
                    x: { grid: { display: false }, ticks: { color: '#6B7280' } },
                  },
                }}
              />
            </div>
          </div>

          {/* Designer workspace: Kanban + Assets + Feedback + Moodboard */}
         <div className="mt-6 grid grid-cols-1 2xl:grid-cols-3 gap-6">
  {/* Kanban */}
  <div className="bg-white rounded-2xl shadow-sm p-5 border 2xl:col-span-2">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">My Projects (Kanban)</h3>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[
        { title: 'To Do', color: 'indigo', items: ['Logo pack – “Aurora”', 'Landing page hero – CP', 'Social set – Q4 campaign'] },
        { title: 'In Progress', color: 'blue', items: ['Packaging dieline – “ZenTea”', 'Mobile UI – checkout flow'] },
        { title: 'Review', color: 'orange', items: ['Retail poster A1 – “Weekend Sale”'] },
        { title: 'Completed', color: 'green', items: ['Brochure A4 – CP', 'Business cards – “City Café”'] },
      ].map((col, i) => (
        <div key={i} className="bg-gray-50 border rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-semibold text-${col.color}-600`}>{col.title}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white border">{col.items.length}</span>
          </div>
          <div className="space-y-2">
            {col.items.map((it, idx) => (
              <div key={idx} className="bg-white border rounded-lg p-3 hover:shadow-sm transition">
                <p className={`text-sm text-${col.color}-600`}>{it}</p>
                <div className="mt-2 h-1 bg-gray-200 rounded">
                  <div
                    className={`h-1 bg-${col.color}-500 rounded`}
                    style={{ width: `${40 + ((idx * 20) % 60)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Asset Shelf */}
  <div className="bg-white rounded-2xl shadow-sm p-5 border">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold text-gray-900">Asset Shelf</h3>
      <button className="text-xs px-3 py-1 rounded-md border bg-white hover:bg-gray-50">Upload</button>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-1">
      {[
        'https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=400',
        'https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=400',
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400',
        'https://images.unsplash.com/photo-1517816428104-797678c7cf0d?q=80&w=400',
        'https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?q=80&w=400',
      ].map((src, i) => (
        <img key={i} src={src} alt={`asset-${i}`} className="h-24 w-24 rounded-lg object-cover border" />
      ))}
    </div>
  </div>
</div>


          {/* Feedback Hub + Moodboard */}
<div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Feedback Hub */}
  <div className="bg-white rounded-2xl shadow-sm p-5 border lg:col-span-2">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">Feedback Hub</h3>
    <ul className="space-y-3">
      {[
        { client: 'Sunrise Retail', note: 'Please reduce headline size by 10% and try a warmer palette.', tag: 'Awaiting Reply', color: 'yellow' },
        { client: 'ZenTea', note: 'Love the dieline; can we try matte finish preview?', tag: 'Approved', color: 'green' },
        { client: 'City Café', note: 'Add QR on back; crop mark bleeds missing on pg.3.', tag: 'Changes', color: 'red' },
      ].map((f, i) => (
        <li key={i} className="bg-gray-50 rounded-xl px-4 py-3 border flex items-start justify-between">
          <div>
            <p className={`text-sm font-medium text-${f.color}-700`}>{f.client}</p>
            <p className="text-xs text-gray-600 mt-1">{f.note}</p>
          </div>
          <span
            className={`
              text-xs font-medium px-2 py-0.5 rounded-full border
              bg-${f.color}-50 text-${f.color}-700 border-${f.color}-200
            `}
          >
            {f.tag}
          </span>
        </li>
      ))}
    </ul>
  </div>

  {/* Inspiration Moodboard */}
  <div className="bg-white rounded-2xl shadow-sm p-5 border">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">Inspiration Moodboard</h3>
    <div className="grid grid-cols-3 gap-2">
      {[
        'https://images.unsplash.com/photo-1535905496755-26ae35d0ae54?q=80&w=300',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=300',
        'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?q=80&w=300',
        'https://images.unsplash.com/photo-1545235617-9465d2a55698?q=80&w=300',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=300',
        'https://images.unsplash.com/photo-1517816428104-797678c7cf0d?q=80&w=300',
      ].map((src, i) => (
        <img key={i} src={src} alt={`mood-${i}`} className="h-20 w-full object-cover rounded-lg border" />
      ))}
    </div>
  </div>
</div>

        </>
      )}

      {/* ======= Your existing mixed sections ======= */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(isAdmin || isSales) && (
          <section className="bg-white rounded-2xl shadow-sm p-5 lg:col-span-2">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Sales statistic</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M12 12v.01M12 18v.01" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-lime-500 text-white text-sm font-bold">💰</span>
                <div>
                  <p className="text-sm text-gray-500">Total profit</p>
                  <p className="text-base font-bold text-gray-900">$ 372,3k</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500 text-white text-sm font-bold">🏷️</span>
                <div>
                  <p className="text-sm text-gray-500">Sales revenue</p>
                  <p className="text-base font-bold text-gray-900">$ 123,1k</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-black text-white text-sm font-bold">🧾</span>
                <div>
                  <p className="text-sm text-gray-500">Average bill</p>
                  <p className="text-base font-bold text-gray-900">$ 2,090</p>
                </div>
              </div>
            </div>
            <div className="h-[300px] relative">
              <Bar
                data={{
                  labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                  datasets: [
                    { label: 'Previous Year', data: [20000, 18000, 22000, 16000, 30000, 40000, 25000, 21000, 27000, 23000, 20000, 19000], backgroundColor: '#000000', borderRadius: 6, barThickness: 18 },
                    { label: 'This Year', data: [25000, 20000, 30000, 28000, 34000, 46000, 29000, 27000, 31000, 26000, 24000, 23000], backgroundColor: '#1E40AF', borderRadius: 6, barThickness: 18 },
                    { label: 'Forecast', data: [5000, 4000, 6000, 3000, 8000, 9000, 7000, 5000, 6000, 7000, 8000, 6000], backgroundColor: patternColor, borderRadius: 6, barThickness: 18 },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    datalabels: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}` } },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { callback: (v) => `$${(v as number / 1000).toFixed(0)}k`, color: '#6B7280' },
                      grid: { color: '#E5E7EB', lineWidth: 1 },
                    },
                    x: { stacked: false, ticks: { color: '#6B7280' }, grid: { display: false } },
                  },
                }}
              />
            </div>
          </section>
        )}

        {/* Employee Attendance — Admin + Production */}
        {(isAdmin || isProduction) && (
          <div className="bg-white rounded-2xl shadow-sm col-span-2 overflow-hidden flex flex-col border border-gray-200">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Employee Attendance</h3>
                <p className="text-xs text-indigo-100">Summary for Today</p>
              </div>
              <span className="text-xs font-medium bg-white text-indigo-700 px-3 py-1 rounded-full shadow-sm">
                14 / 20 Checked-In
              </span>
            </div>
            <div className="p-6 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6">
              <div className="text-center sm:text-left">
                <p className="text-sm text-gray-500">Total Checked-In</p>
                <h2 className="text-4xl font-bold text-black mt-1">14 Employees</h2>
                <p className="text-xs text-gray-400 mt-1">Out of 20 Scheduled</p>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full w-[70%] transition-all duration-500"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">70% attendance rate</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: 'On Time', value: '75%', icon: '🟢', bg: 'bg-green-100', text: 'text-green-700' },
                  { label: 'Late', value: '15%', icon: '🕒', bg: 'bg-yellow-100', text: 'text-yellow-700' },
                  { label: 'Absent', value: '10%', icon: '❌', bg: 'bg-red-100', text: 'text-red-700' },
                ].map((it, i) => (
                  <div key={i} className="flex flex-col items-center hover:scale-105 transition-transform">
                    <div className={`w-11 h-11 ${it.bg} ${it.text} font-bold text-sm rounded-full flex items-center justify-center shadow`}>{it.icon}</div>
                    <p className="mt-2 text-xs text-gray-500 font-medium">{it.label}</p>
                    <p className="text-sm font-semibold text-gray-800">{it.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 flex items-center justify-center gap-6 border-t">
              {[{ icon: '🟢', label: 'On Time' }, { icon: '🕒', label: 'Late' }, { icon: '❌', label: 'Absent' }].map(
                (it, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{it.icon}</span>
                    <span>{it.label}</span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Low Stock — Admin + Production */}
        {(isAdmin || isProduction) && (
          <div className="bg-white p-5 rounded-2xl shadow-sm col-span-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Low Stock Alerts</h3>
              <span className="text-sm font-medium text-red-600 bg-red-100 px-3 py-1 rounded-full">12 Items Critical</span>
            </div>
            <div className="overflow-y-auto max-h-[340px] pr-2 space-y-4">
              {[...Array(12)].map((_, idx) => (
                <div key={idx} className="bg-red-50 p-3 rounded-xl shadow-sm hover:shadow-md transition flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-800">Item #{idx + 1}</p>
                    <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Stock: {Math.floor(Math.random() * 10) + 1}</span>
                  </div>
                  <p className="text-xs text-gray-500">SKU: ITEM-{1000 + idx} / Last Restock: Jul {Math.floor(Math.random() * 28 + 1)}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.floor(Math.random() * 20) + 5}%` }} />
                  </div>
                  <button className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 transition w-full">
                    Request Restock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin-only monitoring */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-md col-span-2 overflow-hidden flex flex-col border border-gray-200">
            <div className="bg-gradient-to-r from-black to-gray-800 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center text-lg">🧑‍💻</div>
                <div>
                  <h3 className="text-lg font-semibold">Employee Monitoring System</h3>
                  <p className="text-xs text-gray-300">Secure, accountable, and real-time tracking</p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-red-800 text-white px-3 py-1 rounded-full">Admin Access</span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50">
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
            <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => (window.location.href = '/admin/monitoring')}
                className="bg-black text-white px-5 py-2 rounded-md hover:bg-gray-900 transition text-sm font-medium"
              >
                View Detailed Logs
              </button>
            </div>
          </div>
        )}

        {/* Calendar (all roles) */}
        <MiniCalendar />
      </div>
    </div>
  );
}
