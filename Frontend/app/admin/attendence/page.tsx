"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@/contexts/user-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clock,
  MapPin,
  Wifi,
  Calendar as CalendarIcon,
  Download,
  CheckCircle,
  XCircle,
  Search,
  Settings,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import ScrollAreaWithRail from "@/app/components/ScrollAreaWithRail";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";

/** ------------------ Types ------------------ */
interface AttendanceRecord {
  id: string;
  employeeName: string;
  date: string; // yyyy-MM-dd
  checkIn: string; // HH:mm
  checkOut: string | null; // HH:mm or null
  duration: string; // "8h 30m" | "In Progress"
  location: { lat: number; lng: number; address: string };
  ipAddress: string;
  device: string;
  status: "present" | "late" | "absent";
}

interface Employee {
  id: string;
  name: string;
  baseSalary: number; // monthly
}

interface AttendanceRules {
  workStart: string; // "09:00"
  workEnd: string; // "17:30"
  graceMinutes: number; // allowed before 'late'
  standardWorkMinutes: number; // e.g. 510 (8h30m)
  overtimeAfterMinutes: number; // minutes after which OT counts
  latePenaltyPerMinute: number; // AED/min late
  perDayDeduction: number; // AED/day absent
  overtimeRatePerMinute: number; // AED/min OT
  weekendDays: number[]; // 0=Sun ... 6=Sat
}

/** ------------------ Seeds ------------------ */
const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: "1",
    employeeName: "Alice Johnson",
    date: "2024-01-22",
    checkIn: "09:00",
    checkOut: "17:30",
    duration: "8h 30m",
    location: { lat: 25.2048, lng: 55.2708, address: "Dubai Marina, Dubai, UAE" },
    ipAddress: "192.168.1.100",
    device: "Windows Desktop",
    status: "present",
  },
  {
    id: "2",
    employeeName: "Bob Smith",
    date: "2024-01-22",
    checkIn: "09:15",
    checkOut: "17:45",
    duration: "8h 30m",
    location: { lat: 25.2048, lng: 55.2708, address: "Dubai Marina, Dubai, UAE" },
    ipAddress: "192.168.1.101",
    device: "MacBook Pro",
    status: "late",
  },
  {
    id: "3",
    employeeName: "Carol Davis",
    date: "2024-01-22",
    checkIn: "08:45",
    checkOut: null,
    duration: "In Progress",
    location: { lat: 25.2048, lng: 55.2708, address: "Dubai Marina, Dubai, UAE" },
    ipAddress: "192.168.1.102",
    device: "iPhone 15",
    status: "present",
  },
  {
    id: "4",
    employeeName: "David Lee",
    date: "2024-01-22",
    checkIn: "09:05",
    checkOut: "17:15",
    duration: "8h 10m",
    location: { lat: 25.276987, lng: 55.296249, address: "Business Bay, Dubai, UAE" },
    ipAddress: "192.168.1.104",
    device: "Dell Laptop",
    status: "late",
  },
  {
    id: "5",
    employeeName: "Eva Green",
    date: "2024-01-22",
    checkIn: "08:55",
    checkOut: "17:25",
    duration: "8h 30m",
    location: { lat: 25.197197, lng: 55.274376, address: "Jumeirah Lakes Towers, Dubai, UAE" },
    ipAddress: "192.168.1.105",
    device: "iMac",
    status: "present",
  },
  {
    id: "6",
    employeeName: "Frank Thomas",
    date: "2024-01-22",
    checkIn: "09:20",
    checkOut: "17:50",
    duration: "8h 30m",
    location: { lat: 25.094735, lng: 55.161278, address: "Palm Jumeirah, Dubai, UAE" },
    ipAddress: "192.168.1.106",
    device: "Android Tablet",
    status: "late",
  },
  {
    id: "7",
    employeeName: "Grace Kim",
    date: "2024-01-22",
    checkIn: "08:50",
    checkOut: "17:10",
    duration: "8h 20m",
    location: { lat: 25.1011, lng: 55.1602, address: "JBR, Dubai, UAE" },
    ipAddress: "192.168.1.107",
    device: "Surface Pro",
    status: "present",
  },
  {
    id: "8",
    employeeName: "Henry Clark",
    date: "2024-01-22",
    checkIn: "09:35",
    checkOut: null,
    duration: "In Progress",
    location: { lat: 25.276987, lng: 55.296249, address: "Business Bay, Dubai, UAE" },
    ipAddress: "192.168.1.108",
    device: "Windows Laptop",
    status: "late",
  },
  {
    id: "9",
    employeeName: "Isla Morgan",
    date: "2024-01-22",
    checkIn: "09:00",
    checkOut: "17:30",
    duration: "8h 30m",
    location: { lat: 25.2048, lng: 55.2708, address: "Dubai Marina, Dubai, UAE" },
    ipAddress: "192.168.1.109",
    device: "MacBook Air",
    status: "present",
  },
  {
    id: "10",
    employeeName: "Jack Wilson",
    date: "2024-01-22",
    checkIn: "08:40",
    checkOut: "17:20",
    duration: "8h 40m",
    location: { lat: 25.276987, lng: 55.296249, address: "Business Bay, Dubai, UAE" },
    ipAddress: "192.168.1.110",
    device: "Lenovo ThinkPad",
    status: "present",
  },
  {
    id: "11",
    employeeName: "Kylie Adams",
    date: "2024-01-22",
    checkIn: "09:10",
    checkOut: "17:40",
    duration: "8h 30m",
    location: { lat: 25.197197, lng: 55.274376, address: "JLT, Dubai, UAE" },
    ipAddress: "192.168.1.111",
    device: "iPhone 14",
    status: "late",
  },
  {
    id: "12",
    employeeName: "Liam Brown",
    date: "2024-01-22",
    checkIn: "09:00",
    checkOut: null,
    duration: "In Progress",
    location: { lat: 25.276987, lng: 55.296249, address: "Downtown Dubai, UAE" },
    ipAddress: "192.168.1.112",
    device: "iPad Pro",
    status: "present",
  },
  {
    id: "13",
    employeeName: "Maya Patel",
    date: "2024-01-22",
    checkIn: "09:30",
    checkOut: null,
    duration: "In Progress",
    location: { lat: 25.276987, lng: 55.296249, address: "Business Bay, Dubai, UAE" },
    ipAddress: "192.168.1.113",
    device: "Samsung Galaxy Tab",
    status: "late",
  },
];

const seedEmployees: Employee[] = [
  { id: "e1", name: "Alice Johnson", baseSalary: 6000 },
  { id: "e2", name: "Bob Smith", baseSalary: 6500 },
  { id: "e3", name: "Carol Davis", baseSalary: 5500 },
  { id: "e4", name: "David Lee", baseSalary: 6200 },
  { id: "e5", name: "Eva Green", baseSalary: 5800 },
  { id: "e6", name: "Frank Thomas", baseSalary: 5700 },
  { id: "e7", name: "Grace Kim", baseSalary: 5900 },
  { id: "e8", name: "Henry Clark", baseSalary: 5600 },
  { id: "e9", name: "Isla Morgan", baseSalary: 6100 },
  { id: "e10", name: "Jack Wilson", baseSalary: 6000 },
  { id: "e11", name: "Kylie Adams", baseSalary: 5400 },
  { id: "e12", name: "Liam Brown", baseSalary: 5300 },
  { id: "e13", name: "Maya Patel", baseSalary: 5200 },
];

const defaultRules: AttendanceRules = {
  workStart: "09:00",
  workEnd: "17:30",
  graceMinutes: 5,
  standardWorkMinutes: 8 * 60 + 30,
  overtimeAfterMinutes: 8 * 60 + 30,
  latePenaltyPerMinute: 1.5,
  perDayDeduction: 200,
  overtimeRatePerMinute: 2.0,
  weekendDays: [5, 6], // Fri, Sat
};

/** ------------------ Helpers ------------------ */
const LS_KEYS = {
  records: "attendanceRecords",
  rules: "attendanceRules",
  employees: "attendanceEmployees",
};

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}

function isWeekendDate(dateISO: string, weekendDays: number[]) {
  const d = new Date(dateISO + "T00:00:00");
  return weekendDays.includes(d.getDay());
}

function dayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function monthRange(year: number, monthIndex0: number) {
  const from = new Date(year, monthIndex0, 1);
  const to = new Date(year, monthIndex0 + 1, 0);
  return { from, to };
}

function eachDay(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cur = new Date(from.getTime());
  while (cur <= to) {
    days.push(dayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function safeParseInt(v: string, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** ------------------ Component ------------------ */
export default function Attendance() {
  const { user } = useUser();

  /** Resolve role robustly */
  type Role = "admin" | "sales" | "designer" | "production";
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let r: Role | null = null;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin_role") as Role | null;
      if (stored) r = stored;
    }
    if (!r && user?.role) r = user.role as Role;
    setRole(r);
  }, [user?.role]);

  const isAdminRole = role === "admin";

  // ---- UI State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>("Detecting location...");
  const [currentIP, setCurrentIP] = useState<string>("Detecting IP...");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rules, setRules] = useState<AttendanceRules>(defaultRules);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // Payroll UI
  const [payrollMonth, setPayrollMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  /** Load from localStorage (seed on first run) */
  useEffect(() => {
    try {
      const recStr = localStorage.getItem(LS_KEYS.records);
      const empStr = localStorage.getItem(LS_KEYS.employees);
      const ruleStr = localStorage.getItem(LS_KEYS.rules);

      const initialRecs = recStr ? (JSON.parse(recStr) as AttendanceRecord[]) : mockAttendanceRecords;
      const initialEmps = empStr ? (JSON.parse(empStr) as Employee[]) : seedEmployees;
      const initialRules = ruleStr ? (JSON.parse(ruleStr) as AttendanceRules) : defaultRules;

      setAttendanceRecords(initialRecs);
      setEmployees(initialEmps);
      setRules(initialRules);
    } catch {
      setAttendanceRecords(mockAttendanceRecords);
      setEmployees(seedEmployees);
      setRules(defaultRules);
    }
  }, []);

  /** Persist */
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.records, JSON.stringify(attendanceRecords));
    } catch {}
  }, [attendanceRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.employees, JSON.stringify(employees));
    } catch {}
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.rules, JSON.stringify(rules));
    } catch {}
  }, [rules]);

  // Simulated geo/IP & restore today's check-in
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentLocation("Dubai Marina, Dubai, UAE");
      setCurrentIP("192.168.1.103");
    }, 800);

    const today = format(new Date(), "yyyy-MM-dd");
    const todayRecord = attendanceRecords.find(
      (r) => r.employeeName === user.name && r.date === today && !r.checkOut
    );
    if (todayRecord) {
      setIsCheckedIn(true);
      setCheckInTime(todayRecord.checkIn);
    }
    return () => clearTimeout(t);
  }, [user.name, attendanceRecords]);

  /** Derived: filtered records */
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !selectedDate || record.date === format(selectedDate, "yyyy-MM-dd");
      return matchesSearch && matchesDate;
    });
  }, [attendanceRecords, searchTerm, selectedDate]);

  /** Attendance Actions */
  const handleCheckIn = () => {
    const now = new Date();
    const timeString = format(now, "HH:mm");
    const dateString = format(now, "yyyy-MM-dd");

    const startPlusGrace = timeToMinutes(rules.workStart) + rules.graceMinutes;
    const currentMins = timeToMinutes(timeString);
    const status: AttendanceRecord["status"] = currentMins > startPlusGrace ? "late" : "present";

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      employeeName: user.name,
      date: dateString,
      checkIn: timeString,
      checkOut: null,
      duration: "In Progress",
      location: { lat: 25.2048, lng: 55.2708, address: currentLocation },
      ipAddress: currentIP,
      device: "Web Browser",
      status,
    };

    setAttendanceRecords((prev) => [newRecord, ...prev]);
    setIsCheckedIn(true);
    setCheckInTime(timeString);
  };

  const handleCheckOut = () => {
    const now = new Date();
    const timeString = format(now, "HH:mm");
    const dateString = format(now, "yyyy-MM-dd");

    setAttendanceRecords((prev) =>
      prev.map((record) => {
        if (record.employeeName === user.name && record.date === dateString && !record.checkOut) {
          const inDt = new Date(`${dateString}T${record.checkIn}:00`);
          const outDt = new Date(`${dateString}T${timeString}:00`);
          const diffMs = outDt.getTime() - inDt.getTime();
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          return { ...record, checkOut: timeString, duration: `${hours}h ${minutes}m` };
        }
        return record;
      })
    );

    setIsCheckedIn(false);
    setCheckInTime(null);
  };

  /** Export CSV (admin only) */
  const exportToCSV = () => {
    const headers = [
      "Employee",
      "Date",
      "Check In",
      "Check Out",
      "Duration",
      "Location",
      "IP Address",
      "Device",
      "Status",
    ];

    const escapeCSV = (value: string) => `"${(value ?? "").toString().replace(/"/g, '""')}"`;

    const recordsToExport = filteredRecords.filter((r) => isAdminRole || r.employeeName === user.name);

    const rows = recordsToExport.map((record) =>
      [
        escapeCSV(record.employeeName),
        escapeCSV(new Date(record.date).toLocaleDateString("en-GB")),
        escapeCSV(record.checkIn),
        escapeCSV(record.checkOut || "N/A"),
        escapeCSV(record.duration),
        escapeCSV(record.location.address),
        escapeCSV(record.ipAddress),
        escapeCSV(record.device),
        escapeCSV(record.status),
      ].join(",")
    );

    const csvContent = [headers.map(escapeCSV).join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "attendance_records.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /** ------------------ Payroll Logic ------------------ */
  type PayrollRow = {
    employee: Employee;
    month: string; // yyyy-MM
    workingDays: number;
    presentDays: number;
    absentDays: number;
    totalLateMinutes: number;
    totalOvertimeMinutes: number;
    baseSalary: number;
    absentDeduction: number;
    lateDeduction: number;
    overtimePay: number;
    netPay: number;
  };

  function calcDailyMinutes(checkIn: string, checkOut: string | null): number {
    if (!checkOut) return 0;
    const base = "1970-01-01";
    const inDt = new Date(`${base}T${checkIn}:00`);
    const outDt = new Date(`${base}T${checkOut}:00`);
    return Math.max(0, Math.floor((outDt.getTime() - inDt.getTime()) / (1000 * 60)));
  }

  function buildPayroll(year: number, monthIndex0: number): PayrollRow[] {
    const { from, to } = monthRange(year, monthIndex0);
    const days = eachDay(from, to);
    const workingDaysList = days.filter((d) => !isWeekendDate(d, rules.weekendDays));

    const rows: PayrollRow[] = employees.map((emp) => {
      let presentDays = 0;
      let absentDays = 0;
      let totalLateMinutes = 0;
      let totalOvertimeMinutes = 0;

      for (const d of workingDaysList) {
        const recs = attendanceRecords.filter((r) => r.employeeName === emp.name && r.date === d);

        if (recs.length === 0) {
          absentDays += 1;
          continue;
        }

        const completed = recs
          .filter((r) => !!r.checkOut)
          .sort((a, b) => (a.checkOut! > b.checkOut! ? 1 : -1));
        const record = completed[completed.length - 1] || recs[0];

        presentDays += 1;

        const startMins = timeToMinutes(rules.workStart);
        const inMins = timeToMinutes(record.checkIn);
        const late = Math.max(0, inMins - (startMins + rules.graceMinutes));
        totalLateMinutes += late;

        const workedMins = calcDailyMinutes(record.checkIn, record.checkOut);
        const over = Math.max(0, workedMins - rules.overtimeAfterMinutes);
        totalOvertimeMinutes += over;
      }

      const workingDays = workingDaysList.length;
      const absentDeduction = absentDays * rules.perDayDeduction;
      const lateDeduction = totalLateMinutes * rules.latePenaltyPerMinute;
      const overtimePay = totalOvertimeMinutes * rules.overtimeRatePerMinute;
      const baseSalary = emp.baseSalary;
      const netPay = Math.max(0, baseSalary - absentDeduction - lateDeduction + overtimePay);

      return {
        employee: emp,
        month: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
        workingDays,
        presentDays,
        absentDays,
        totalLateMinutes,
        totalOvertimeMinutes,
        baseSalary,
        absentDeduction,
        lateDeduction,
        overtimePay,
        netPay,
      };
    });

    return rows;
  }

  const [payrollRows, setPayrollRows] = useState<PayrollRow[]>([]);

  const handleGeneratePayroll = () => {
    const [y, m] = payrollMonth.split("-").map((n) => parseInt(n, 10));
    const rows = buildPayroll(y, m - 1);
    setPayrollRows(rows);
  };

  /** Payslip (Print-to-PDF) */
  const openPayslipWindow = (row: PayrollRow) => {
    const payslipHtml = `
      <html>
      <head>
        <title>Payslip - ${row.employee.name} - ${row.month}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          .header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; }
          .brand { color:#891F1A; font-weight:700; font-size:20px; }
          .box { border:1px solid #ddd; border-radius:12px; padding:16px; margin-top:12px; }
          .grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px 24px; }
          .row { display:flex; justify-content:space-between; margin:6px 0; }
          .muted { color:#666; }
          .total { font-weight:700; }
          .tag { background:#891F1A; color:#fff; padding:2px 8px; border-radius:999px; font-size:12px; }
          hr { border: none; height:1px; background:#eee; margin:16px 0; }
          @media print { .no-print { display:none; } }
          .small { font-size:12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">CreativePrints — Payslip</div>
          <div><span class="tag">${row.month}</span></div>
        </div>
        <div class="box">
          <div class="grid">
            <div><b>Employee:</b> ${row.employee.name}</div>
            <div><b>Month:</b> ${row.month}</div>
            <div><span class="muted small">Working days:</span> ${row.workingDays}</div>
            <div><span class="muted small">Present:</span> ${row.presentDays} &nbsp; <span class="muted small">Absent:</span> ${row.absentDays}</div>
            <div><span class="muted small">Late Minutes:</span> ${row.totalLateMinutes}m</div>
            <div><span class="muted small">Overtime Minutes:</span> ${row.totalOvertimeMinutes}m</div>
          </div>
          <hr />
          <div class="row"><span>Base Salary</span><span>AED ${row.baseSalary.toFixed(2)}</span></div>
          <div class="row"><span>Absent Deduction</span><span>- AED ${row.absentDeduction.toFixed(2)}</span></div>
          <div class="row"><span>Late Deduction</span><span>- AED ${row.lateDeduction.toFixed(2)}</span></div>
          <div class="row"><span>Overtime Pay</span><span>+ AED ${row.overtimePay.toFixed(2)}</span></div>
          <hr />
          <div class="row total"><span>Net Pay</span><span>AED ${row.netPay.toFixed(2)}</span></div>
        </div>
        <p class="small muted">This is a system-generated payslip. For queries contact HR.</p>
        <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(payslipHtml);
    win.document.close();
    setTimeout(() => {
      try { win.print(); } catch {}
    }, 400);
  };

  /** ------------------ UI ------------------ */
  return (
    <div className="p-6 space-y-6">
      <DashboardNavbar />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#891F1A]">Attendance Management</h1>
          <p className="text-gray-600">Track employee check-ins and check-outs</p>
        </div>
      </div>

      {/* Check-in/Check-out + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[#891F1A]">
              <Clock className="h-5 w-5 mr-2" />
              Time Tracking
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-4">
            <div className="text-center py-6">
              <div className="text-4xl font-bold mb-2">{format(new Date(), "HH:mm:ss")}</div>
              <div className="text-gray-600">{format(new Date(), "EEEE, MMMM d, yyyy")}</div>
            </div>

            {checkInTime && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Checked in at:</span>
                  <span className="font-bold text-blue-600">{checkInTime}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{currentLocation}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{currentIP}</span>
              </div>
            </div>

            <div className="pt-4">
              {!isCheckedIn ? (
                <Button
                  onClick={handleCheckIn}
                  className="w-full bg-[#891F1A] text-white hover:bg-[#A23E37] active:bg-[#751713]"
                  size="lg"
                  disabled={currentLocation === "Detecting location..."}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Check In
                </Button>
              ) : (
                <Button
                  onClick={handleCheckOut}
                  className="w-full bg-[#891F1A] text-white hover:bg-[#A23E37] active:bg-[#751713]"
                  size="lg"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Check Out
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#891F1A]">Location Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Map Preview</p>
                <p className="text-sm text-gray-500">{currentLocation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules + Payroll Controls (admin only) */}
      {role !== null && isAdminRole && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rules */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-[#891F1A]">
                <Settings className="h-5 w-5 mr-2" />
                Attendance & Payroll Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Work Start (HH:mm)</label>
                <Input
                  value={rules.workStart}
                  onChange={(e) => setRules({ ...rules, workStart: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Work End (HH:mm)</label>
                <Input
                  value={rules.workEnd}
                  onChange={(e) => setRules({ ...rules, workEnd: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Grace Minutes</label>
                <Input
                  type="number"
                  value={rules.graceMinutes}
                  onChange={(e) =>
                    setRules({ ...rules, graceMinutes: safeParseInt(e.target.value, 0) })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Standard Work Minutes</label>
                <Input
                  type="number"
                  value={rules.standardWorkMinutes}
                  onChange={(e) =>
                    setRules({ ...rules, standardWorkMinutes: safeParseInt(e.target.value, 480) })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Overtime After Minutes</label>
                <Input
                  type="number"
                  value={rules.overtimeAfterMinutes}
                  onChange={(e) =>
                    setRules({ ...rules, overtimeAfterMinutes: safeParseInt(e.target.value, 480) })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Late Penalty (AED/min)</label>
                <Input
                  type="number"
                  value={rules.latePenaltyPerMinute}
                  onChange={(e) =>
                    setRules({ ...rules, latePenaltyPerMinute: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Absent Deduction (AED/day)</label>
                <Input
                  type="number"
                  value={rules.perDayDeduction}
                  onChange={(e) =>
                    setRules({ ...rules, perDayDeduction: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">OT Rate (AED/min)</label>
                <Input
                  type="number"
                  value={rules.overtimeRatePerMinute}
                  onChange={(e) =>
                    setRules({ ...rules, overtimeRatePerMinute: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-600">Weekend Days (0=Sun ... 6=Sat)</label>
                <Input
                  value={rules.weekendDays.join(",")}
                  onChange={(e) => {
                    const arr = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((n) => safeParseInt(n, -1))
                      .filter((n) => n >= 0 && n <= 6);
                    setRules({ ...rules, weekendDays: arr });
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Example: UAE (Fri, Sat) → 5,6</p>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-[#891F1A]">
                <FileText className="h-5 w-5 mr-2" />
                Payroll
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Payroll Month</label>
                <Input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                />
              </div>
              <Button
                onClick={handleGeneratePayroll}
                className="w-full bg-[#891F1A] text-white hover:bg-[#A23E37]"
              >
                Generate Payroll
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Records */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4">
            <CardTitle className="text-[#891F1A] text-lg">
              {isAdminRole ? "All Employee Records" : "My Attendance Records"}
            </CardTitle>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={isAdminRole ? "Search employees..." : "Search records..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                {isAdminRole && (
                  <Button
                    onClick={exportToCSV}
                    className="bg-[#891F1A] text-white border border-[#891F1A] hover:bg-[#891F1A]/90"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`bg-[#891F1A] text-white border border-[#891F1A] hover:bg-[#A23E37] hover:text-white hover:border-[#A23E37] ${
                        !selectedDate ? "me-3" : ""
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>

                {selectedDate && (
                  <Button variant="ghost" onClick={() => setSelectedDate(undefined)} className="text-[#891F1A]">
                    Clear Date
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="relative">
              <ScrollAreaWithRail heightClass="max-h-[29rem]" railPosition="outside" contentRightGap={12}>
                <div className="rounded-md border bg-white">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        {isAdminRole && (
                          <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center rounded-tl-md">
                            Employee
                          </TableHead>
                        )}
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">Date</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">Check In</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">Check Out</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">Duration</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">Location</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">IP Address</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">Device</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center rounded-tr-md">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords
                        .filter((r) => isAdminRole || r.employeeName === user.name)
                        .map((record) => (
                          <TableRow key={record.id}>
                            {isAdminRole && <TableCell className="font-medium text-center">{record.employeeName}</TableCell>}
                            <TableCell className="text-center">{record.date}</TableCell>
                            <TableCell className="text-center">{record.checkIn}</TableCell>
                            <TableCell className="text-center">{record.checkOut || "In Progress"}</TableCell>
                            <TableCell className="text-center">{record.duration}</TableCell>
                            <TableCell className="text-center max-w-xs truncate">{record.location.address}</TableCell>
                            <TableCell className="text-center">{record.ipAddress}</TableCell>
                            <TableCell className="text-center">{record.device}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-[#891F1A] text-white">{record.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollAreaWithRail>

              {filteredRecords.filter((r) => isAdminRole || r.employeeName === user.name).length === 0 && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No records found</h3>
                  <p className="text-gray-600">
                    {searchTerm || selectedDate ? "Try adjusting your search criteria" : "No attendance records available"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Results */}
      {payrollRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#891F1A]">Payroll Summary — {payrollMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white overflow-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-[#891F1A] text-white text-center">Employee</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">Working Days</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">Present</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">Absent</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">Late (min)</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">OT (min)</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">Base (AED)</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">Absent Ded. (AED)</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">Late Ded. (AED)</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">OT Pay (AED)</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">Net Pay (AED)</TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">Payslip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRows
                    .filter((r) => isAdminRole || r.employee.name === user.name)
                    .map((row) => (
                      <TableRow key={row.employee.id}>
                        <TableCell className="text-center">{row.employee.name}</TableCell>
                        <TableCell className="text-center">{row.workingDays}</TableCell>
                        <TableCell className="text-center">{row.presentDays}</TableCell>
                        <TableCell className="text-center">{row.absentDays}</TableCell>
                        <TableCell className="text-center">{row.totalLateMinutes}</TableCell>
                        <TableCell className="text-center">{row.totalOvertimeMinutes}</TableCell>
                        <TableCell className="text-center">{row.baseSalary.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{row.absentDeduction.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{row.lateDeduction.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{row.overtimePay.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-semibold">{row.netPay.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            className="bg-[#891F1A] text-white hover:bg-[#A23E37]"
                            onClick={() => openPayslipWindow(row)}
                          >
                            Generate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
