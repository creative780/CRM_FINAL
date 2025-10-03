"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  Monitor,
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
import { api } from "@/lib/api";

/** ------------------ Types ------------------ */
interface AttendanceRecord {
  id: string;
  employeeName: string;
  date: string; // yyyy-MM-dd
  checkIn: string; // HH:mm
  checkOut: string | null; // HH:mm or null
  duration: string; // "8h 30m" | "In Progress"
  location: { lat: number | null; lng: number | null; address: string };
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

/** ------------------ API Types & Helpers ------------------ */
interface AttendanceApiResponse {
  id: number | string;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  duration_display?: string | null;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
  location_address?: string | null;
  ip_address?: string | null;
  device_id?: string | null;
  device_info?: string | null;
  device_name?: string | null;
  status: string;
}

interface AttendanceContextResponse {
  ip: string;
  location: string;
  deviceId?: string | null;
  deviceName?: string | null;
}

const UNKNOWN_LOCATION = "Unknown location";
const UNKNOWN_IP = "Unknown IP";
const UNKNOWN_DEVICE = "Unknown device";
const DEVICE_ID_STORAGE_KEY = "attendance_device_id";
const DEVICE_NAME_STORAGE_KEY = "attendance_device_name";
const AGENT_URLS = [
  "http://127.0.0.1:47113/hostname",
  "http://localhost:47113/hostname",
];

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatTimeFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return null;
    return format(parsed, "HH:mm");
  }
}

function computeDurationFromIso(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): string {
  if (!checkIn || !checkOut) return "In Progress";
  try {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  } catch {
    return "In Progress";
  }
}

function mapAttendanceApiRecord(record: AttendanceApiResponse): AttendanceRecord {
  const lat = toNumber(record.location_lat);
  const lng = toNumber(record.location_lng);
  const address = (record.location_address || "").trim();
  const locationAddress =
    address || (lat !== null && lng !== null ? `${lat}, ${lng}` : "");

  const checkIn = formatTimeFromIso(record.check_in) || "--";
  const checkOut = formatTimeFromIso(record.check_out);
  const duration =
    (record.duration_display || "").trim() ||
    (checkOut ? computeDurationFromIso(record.check_in, record.check_out) : "In Progress");

  const ip = (record.ip_address || "").trim();
  const deviceName = (record.device_name || "").trim();
  const device =
    deviceName || (record.device_id || record.device_info || "").trim() || UNKNOWN_DEVICE;

  const status = record.status === "late" || record.status === "absent" ? record.status : "present";

  return {
    id: String(record.id),
    employeeName: record.employee_name || "",
    date: record.date,
    checkIn,
    checkOut: checkOut || null,
    duration,
    location: {
      lat,
      lng,
      address: locationAddress || UNKNOWN_LOCATION,
    },
    ipAddress: ip || UNKNOWN_IP,
    device,
    status,
  };
}

function upsertAttendanceRecord(
  records: AttendanceRecord[],
  nextRecord: AttendanceRecord
): AttendanceRecord[] {
  const index = records.findIndex((record) => record.id === nextRecord.id);
  if (index === -1) {
    return [nextRecord, ...records];
  }
  const updated = [...records];
  updated[index] = nextRecord;
  return updated;
}

function sortAttendanceRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  return [...records].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.checkIn || "").localeCompare(a.checkIn || "");
  });
}

/** ------------------ Seeds ------------------ */
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
  const [currentDevice, setCurrentDevice] = useState<string>("Detecting device...");
  // lat/lng for payload
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rules, setRules] = useState<AttendanceRules>(defaultRules);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [agentDeviceName, setAgentDeviceName] = useState<string | null>(null);

  // Payroll UI
  const [payrollMonth, setPayrollMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Create or restore unique device ID
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let stored = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (!stored) {
        const cryptoObj = window.crypto as Crypto & { randomUUID?: () => string };
        const generated =
          typeof cryptoObj?.randomUUID === "function"
            ? cryptoObj.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        stored = generated;
        localStorage.setItem(DEVICE_ID_STORAGE_KEY, stored);
      }
      setDeviceId(stored);
      // Also restore user provided device name if present
    } catch {
      setDeviceId(null);
    }
  }, []);

  // Try local HostAgent to get OS hostname automatically
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const url of AGENT_URLS) {
        try {
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 800);
          const resp = await fetch(url, { signal: ctrl.signal });
          clearTimeout(timeout);
          if (!resp.ok) continue;
          const data = await resp.json();
            const name = (data?.deviceName || '').toString().trim();
            if (name && !cancelled) {
              setAgentDeviceName(name);
              setCurrentDevice(name);
              try { localStorage.setItem(DEVICE_NAME_STORAGE_KEY, name); } catch {}
              break;
            }
        } catch (_) {
          // continue to next url
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Detect IP, location and device info on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const fetchMeta = async () => {
      try {
        

        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        const ip = ipData.ip as string;
        if (!cancelled) setCurrentIP(ip || UNKNOWN_IP);

        const locRes = await fetch(`https://ipapi.co/${ip}/json/`);
        const locData = await locRes.json();
        if (!cancelled) {
          const lat = Number(locData.latitude);
          const lng = Number(locData.longitude);
          setCurrentLat(Number.isFinite(lat) ? lat : null);
          setCurrentLng(Number.isFinite(lng) ? lng : null);
          const parts: string[] = [];
          if (locData.city) parts.push(locData.city);
          if (locData.region) parts.push(locData.region);
          if (locData.country_name) parts.push(locData.country_name);
          const addr = parts.join(", ");
          setCurrentLocation(addr || UNKNOWN_LOCATION);
        }
      } catch {
        // keep existing values; do not override with Unknown
      }
    };

    fetchMeta();

    return () => {
      cancelled = true;
    };
  }, []);
  // Prefer server-provided context (reverse DNS, then backend fallbacks).
  // Include local HostAgent device name when available.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = deviceId ? { "X-Device-Id": deviceId } : {};
        if (agentDeviceName) headers["X-Device-Name"] = agentDeviceName;
        const ctx = await api.get<AttendanceContextResponse>("/api/attendance/context/", { headers });
        if (cancelled) return;
        if (ctx.location) setCurrentLocation(ctx.location);
        if (ctx.ip) setCurrentIP(ctx.ip);
        if (ctx.deviceName) {
          setCurrentDevice(ctx.deviceName);
          try { localStorage.setItem(DEVICE_NAME_STORAGE_KEY, ctx.deviceName); } catch {}
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  
  }, [deviceId, agentDeviceName]);
  /** Load employees & rules from localStorage (seed on first run) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const empStr = localStorage.getItem(LS_KEYS.employees);
      const ruleStr = localStorage.getItem(LS_KEYS.rules);
      const initialEmps = empStr ? (JSON.parse(empStr) as Employee[]) : seedEmployees;
      const initialRules = ruleStr ? (JSON.parse(ruleStr) as AttendanceRules) : defaultRules;
      setEmployees(initialEmps);
      setRules(initialRules);
    } catch {
      setEmployees(seedEmployees);
      setRules(defaultRules);
    }
  }, []);

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

  const applyAttendanceRecord = useCallback(
    (apiRecord: AttendanceApiResponse) => {
      const mapped = mapAttendanceApiRecord(apiRecord);
      setAttendanceRecords((prev) => sortAttendanceRecords(upsertAttendanceRecord(prev, mapped)));
      setCurrentLocation(mapped.location.address || UNKNOWN_LOCATION);
      setCurrentIP(mapped.ipAddress || UNKNOWN_IP);
      setCurrentDevice(mapped.device || UNKNOWN_DEVICE);
      setStatusMessage(null);
      if (!mapped.checkOut) {
        setIsCheckedIn(true);
        setCheckInTime(mapped.checkIn);
      } else {
        setIsCheckedIn(false);
        setCheckInTime(null);
      }
      return mapped;
    },
    []
  );

  const loadCurrentAttendance = useCallback(async (): Promise<AttendanceRecord[]> => {
    try {
      const response = await api.get<AttendanceApiResponse[]>("/api/attendance/me/");
      const mapped = sortAttendanceRecords(response.map(mapAttendanceApiRecord));
      const latest = mapped[0];

      // Only update tiles with real values; keep detected/context values otherwise
      if (latest) {
        if (latest.location.address && latest.location.address !== UNKNOWN_LOCATION) {
          setCurrentLocation(latest.location.address);
        }
        if (latest.ipAddress && latest.ipAddress !== UNKNOWN_IP) {
          setCurrentIP(latest.ipAddress);
        }
        if (latest.device && latest.device !== UNKNOWN_DEVICE) {
          setCurrentDevice(latest.device);
        }
      }

      const today = format(new Date(), "yyyy-MM-dd");
      const openRecord = mapped.find(
        (record) => record.date === today && !record.checkOut && record.employeeName === user.name
      );
      if (openRecord) {
        setIsCheckedIn(true);
        setCheckInTime(openRecord.checkIn);
      } else {
        setIsCheckedIn(false);
        setCheckInTime(null);
      }

      setStatusMessage(null);
      return mapped;
    } catch (error) {
      // Keep existing detected/context values intact on error
      setIsCheckedIn(false);
      setCheckInTime(null);
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to load your attendance data. Please try again later."
      );
      return [];
    }
  }, [user.name]);

  const loadAdminAttendance = useCallback(async (): Promise<AttendanceRecord[]> => {
    const response = await api.get<AttendanceApiResponse[]>("/api/attendance/");
    return sortAttendanceRecords(response.map(mapAttendanceApiRecord));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!cancelled) {
        setStatusMessage(null);
      }
      try {
        const mine = await loadCurrentAttendance();
        if (!cancelled && !isAdminRole) {
          setAttendanceRecords(mine);
        }
      } catch (error) {
        if (!cancelled && !isAdminRole) {
          setAttendanceRecords([]);
          setStatusMessage(
            error instanceof Error ? error.message : "Failed to load your attendance data. Please try again later."
          );
        }
        console.error("Failed to load current attendance", error);
      }

      if (!isAdminRole) return;

      try {
        const all = await loadAdminAttendance();
        if (!cancelled) {
          setAttendanceRecords(all);
          setStatusMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAttendanceRecords([]);
          setStatusMessage(
            error instanceof Error ? error.message : "Failed to load attendance records. Please try again later."
          );
        }
        console.error("Failed to load attendance records", error);
      }
    };

   bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isAdminRole, loadAdminAttendance, loadCurrentAttendance]);

  // Restore today's check-in for the authenticated user using the /me endpoint
  // This avoids relying on UI name matching and works for admin role too.
  useEffect(() => {
    let cancelled = false;
    const updateMyState = async () => {
      try {
        const mine = await loadCurrentAttendance();
        const today = format(new Date(), "yyyy-MM-dd");
        const open = mine.find((r) => r.date === today && !r.checkOut);
        if (!cancelled) {
          setIsCheckedIn(!!open);
          setCheckInTime(open ? open.checkIn : null);
        }
      } catch {
        if (!cancelled) {
          setIsCheckedIn(false);
          setCheckInTime(null);
        }
      }
    };
    updateMyState();
    return () => {
      cancelled = true;
    };
  }, [attendanceRecords, loadCurrentAttendance]);

  /** Derived: filtered records */
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !selectedDate || record.date === format(selectedDate, "yyyy-MM-dd");
      return matchesSearch && matchesDate;
    });
  }, [attendanceRecords, searchTerm, selectedDate]);

  /** Attendance Actions */

  // Check in with metadata payload
  const handleCheckIn = async () => {
    setIsActionLoading(true);
    setStatusMessage(null);
    // Only include headers when values exist; never send empty strings
    const headers: Record<string, string> | undefined = (() => {
      const h: Record<string, string> = {};
      if (deviceId) h["X-Device-Id"] = deviceId;
      if (agentDeviceName) h["X-Device-Name"] = agentDeviceName;
      return Object.keys(h).length ? h : undefined;
    })();
    // Build payload and omit null/undefined values to satisfy backend validators
    const payload: Record<string, any> = {};
    if (currentIP && currentIP !== "Detecting IP...") payload.ip_address = currentIP;
    if (deviceId) payload.device_id = deviceId;
    if (currentDevice && currentDevice !== "Detecting device...") payload.device_info = currentDevice;
    if (typeof currentLat === "number") payload.location_lat = currentLat;
    if (typeof currentLng === "number") payload.location_lng = currentLng;
    if (currentLocation && currentLocation !== "Detecting location...") payload.location_address = currentLocation;
    if (agentDeviceName) payload.device_name = agentDeviceName;

    try {
      try {
        const record = await api.post<AttendanceApiResponse>("/api/attendance/check-in/", payload, { headers });
        applyAttendanceRecord(record);
      } catch (e1) {
        // Only force close if we specifically failed due to an existing open session today
        const msg = e1 instanceof Error ? e1.message || "" : "";
        const alreadyIn = /already checked in today/i.test(msg);
        if (!alreadyIn) throw e1;
        try {
          await api.post<AttendanceApiResponse>("/api/attendance/check-out/", payload, { headers });
        } catch (_) {
          // Ignore if no active session was found; we'll retry check-in anyway
        }
        const record = await api.post<AttendanceApiResponse>("/api/attendance/check-in/", payload, { headers });
        applyAttendanceRecord(record);
      }
      if (isAdminRole) {
        try {
          const refreshed = await loadAdminAttendance();
          setAttendanceRecords(refreshed);
        } catch (error) {
          console.error("Failed to refresh attendance list after check-in", error);
        }
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to check in. Please try again later."
      );
      console.error("Failed to check in", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Check out with metadata payload
  const handleCheckOut = async () => {
    setIsActionLoading(true);
    setStatusMessage(null);
    try {
      const headers: Record<string, string> | undefined = (() => {
        const h: Record<string, string> = {};
        if (deviceId) h["X-Device-Id"] = deviceId;
        if (agentDeviceName) h["X-Device-Name"] = agentDeviceName;
        return Object.keys(h).length ? h : undefined;
      })();
      const payload: Record<string, any> = {};
      if (currentIP && currentIP !== "Detecting IP...") payload.ip_address = currentIP;
      if (deviceId) payload.device_id = deviceId;
      if (currentDevice && currentDevice !== "Detecting device...") payload.device_info = currentDevice;
      if (typeof currentLat === "number") payload.location_lat = currentLat;
      if (typeof currentLng === "number") payload.location_lng = currentLng;
      if (currentLocation && currentLocation !== "Detecting location...") payload.location_address = currentLocation;
      if (agentDeviceName) payload.device_name = agentDeviceName;

      const record = await api.post<AttendanceApiResponse>(
        "/api/attendance/check-out/",
        payload,
        { headers }
      );
      applyAttendanceRecord(record);
      if (isAdminRole) {
        try {
          const refreshed = await loadAdminAttendance();
          setAttendanceRecords(refreshed);
        } catch (error) {
          console.error("Failed to refresh attendance list after check-out", error);
        }
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to check out. Please try again later."
      );
      console.error("Failed to check out", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  /** Export CSV (admin only) */
  const exportToCSV = () => {
    const headers = [
      "Device",
      "Employee",
      "Date",
      "Check In",
      "Check Out",
      "Duration",
      "Location",
      "IP Address",
      "Status",
    ];

    const escapeCSV = (value: string) => `"${(value ?? "").toString().replace(/"/g, '""')}"`;

    const recordsToExport = filteredRecords.filter(
      (r) => isAdminRole || r.employeeName === user.name
    );

    const rows = recordsToExport.map((record) =>
      [
        escapeCSV(record.device),
        escapeCSV(record.employeeName),
        escapeCSV(new Date(record.date).toLocaleDateString("en-GB")),
        escapeCSV(record.checkIn),
        escapeCSV(record.checkOut || "N/A"),
        escapeCSV(record.duration),
        escapeCSV(record.location.address),
        escapeCSV(record.ipAddress),
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
      try {
        win.print();
      } catch {}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-start space-x-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                    <MapPin className="h-4 w-4 text-[#891F1A]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Location
                    </p>
                    <p className="text-sm font-medium text-gray-700">{currentLocation}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                    <Wifi className="h-4 w-4 text-[#891F1A]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      IP Address
                    </p>
                    <p className="text-sm font-medium text-gray-700">{currentIP}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                    <Monitor className="h-4 w-4 text-[#891F1A]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Device
                    </p>
                    <p className="text-sm font-medium text-gray-700">{currentDevice}</p>
                  </div>
                </div>
              </div>
            </div>

            {statusMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {statusMessage}
              </div>
            )}

            <div className="pt-4">
              {!isCheckedIn ? (
                <Button
                  onClick={handleCheckIn}
                  className="w-full bg-[#891F1A] text-white hover:bg-[#A23E37] active:bg-[#751713]"
                  size="lg"
                  disabled={isActionLoading || currentLocation === "Detecting location..."}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {isActionLoading ? "Processing..." : "Check In"}
                </Button>
              ) : (
                <Button
                  onClick={handleCheckOut}
                  className="w-full bg-[#891F1A] text-white hover:bg-[#A23E37] active:bg-[#751713]"
                  size="lg"
                  disabled={isActionLoading}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  {isActionLoading ? "Processing..." : "Check Out"}
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
                    setRules({
                      ...rules,
                      standardWorkMinutes: safeParseInt(e.target.value, 480),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Overtime After Minutes</label>
                <Input
                  type="number"
                  value={rules.overtimeAfterMinutes}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      overtimeAfterMinutes: safeParseInt(e.target.value, 480),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Late Penalty (AED/min)</label>
                <Input
                  type="number"
                  value={rules.latePenaltyPerMinute}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      latePenaltyPerMinute: Number(e.target.value) || 0,
                    })
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
                <p className="text-xs text-gray-500 mt-1">
                  Example: UAE (Fri, Sat) → 5,6
                </p>
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
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {selectedDate && (
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedDate(undefined)}
                    className="text-[#891F1A]"
                  >
                    Clear Date
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="relative">
              <ScrollAreaWithRail
                heightClass="max-h-[29rem]"
                railPosition="outside"
              >
                <div className="rounded-md border bg-white">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center rounded-tl-md">
                          Device
                        </TableHead>
                        {isAdminRole && (
                          <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                            Employee
                          </TableHead>
                        )}
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                          Date
                        </TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                          Check In
                        </TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                          Check Out
                        </TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                          Duration
                        </TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                          Location
                        </TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                          IP Address
                        </TableHead>
                        <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center rounded-tr-md">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="text-center font-medium">
                              {record.device}
                            </TableCell>
                            {isAdminRole && (
                              <TableCell className="font-medium text-center">
                                {record.employeeName}
                              </TableCell>
                            )}
                            <TableCell className="text-center">{record.date}</TableCell>
                            <TableCell className="text-center">{record.checkIn}</TableCell>
                            <TableCell className="text-center">
                              {record.checkOut || "In Progress"}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.duration}
                            </TableCell>
                            <TableCell className="text-center max-w-xs truncate">
                              {record.location.address}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.ipAddress}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-[#891F1A] text-white">{record.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollAreaWithRail>

              {filteredRecords.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No records found
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || selectedDate
                      ? "Try adjusting your search criteria"
                      : "No attendance records available"}
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
            <CardTitle className="text-[#891F1A]">
              Payroll Summary — {payrollMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white overflow-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Employee
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Working Days
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Present
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Absent
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Late (min)
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      OT (min)
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Base (AED)
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Absent Ded. (AED)
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Late Ded. (AED)
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      OT Pay (AED)
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Net Pay (AED)
                    </TableHead>
                    <TableHead className="bg-[#891F1A] text-white text-center">
                      Payslip
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRows
                    .filter((r) => isAdminRole || r.employee.name === user.name)
                    .map((row) => (
                      <TableRow key={row.employee.id}>
                        <TableCell className="text-center">
                          {row.employee.name}
                        </TableCell>
                        <TableCell className="text-center">{row.workingDays}</TableCell>
                        <TableCell className="text-center">{row.presentDays}</TableCell>
                        <TableCell className="text-center">{row.absentDays}</TableCell>
                        <TableCell className="text-center">{row.totalLateMinutes}</TableCell>
                        <TableCell className="text-center">{row.totalOvertimeMinutes}</TableCell>
                        <TableCell className="text-center">{row.baseSalary.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          {row.absentDeduction.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.lateDeduction.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.overtimePay.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {row.netPay.toFixed(2)}
                        </TableCell>
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
