"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useMemo, useRef, useEffect } from "react";
import { useUser } from "@/contexts/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Download,
  Calendar as CalendarIcon,
  User,
  FileText,
  Shield,
  Monitor,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import DetachedScrollbar from "@/app/components/DetachedScrollbar";
import ScrollAreaWithRail from "@/app/components/ScrollAreaWithRail";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { listActivityLogs, type ActivityEvent as BEActivityEvent } from "@/lib/activity-logs";
import { api } from "@/lib/api";

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  device: string;
  details: string;
  category:
    | "auth"
    | "file"
    | "system"
    | "security"
    | "monitoring"
    | "communication"
    | "network";
  severity: "low" | "medium" | "high";
  /** Whether the user was active (online) at the time of this event */
  isActive: boolean;
}

const mockActivityLogs: ActivityLog[] = [
  {
    id: "1",
    user: "Alice Johnson",
    action: "User Login",
    timestamp: "2024-01-22 14:30:15",
    ipAddress: "192.168.1.100",
    device: "Windows Desktop",
    details: "Successful login from office location",
    category: "auth",
    severity: "low",
    isActive: true,
  },
  {
    id: "2",
    user: "Bob Smith",
    action: "File Upload",
    timestamp: "2024-01-22 14:25:42",
    ipAddress: "192.168.1.101",
    device: "MacBook Pro",
    details: "Uploaded client_proposal.pdf to Documents folder",
    category: "file",
    severity: "low",
    isActive: true,
  },
  {
    id: "3",
    user: "System",
    action: "Screenshot Taken",
    timestamp: "2024-01-22 14:20:00",
    ipAddress: "192.168.1.102",
    device: "iPhone 15",
    details: "Automated screenshot captured for Carol Davis",
    category: "monitoring",
    severity: "low",
    isActive: true,
  },
  {
    id: "4",
    user: "Carol Davis",
    action: "Failed Login Attempt",
    timestamp: "2024-01-22 14:15:33",
    ipAddress: "203.0.113.45",
    device: "Unknown Device",
    details: "Multiple failed login attempts detected",
    category: "security",
    severity: "high",
    isActive: false,
  },
  {
    id: "5",
    user: "Admin",
    action: "User Role Changed",
    timestamp: "2024-01-22 14:10:18",
    ipAddress: "192.168.1.1",
    device: "Admin Console",
    details: "Changed Bob Smith role from Sales to Manager",
    category: "system",
    severity: "medium",
    isActive: true,
  },
  {
    id: "6",
    user: "Alice Johnson",
    action: "Client Data Export",
    timestamp: "2024-01-22 14:05:27",
    ipAddress: "192.168.1.100",
    device: "Windows Desktop",
    details: "Exported client directory to CSV format",
    category: "file",
    severity: "medium",
    isActive: true,
  },
  {
    id: "7",
    user: "System",
    action: "Database Backup",
    timestamp: "2024-01-22 14:00:00",
    ipAddress: "192.168.1.200",
    device: "Server",
    details: "Automated daily database backup completed",
    category: "system",
    severity: "low",
    isActive: true,
  },
  {
    id: "8",
    user: "Bob Smith",
    action: "Lead Converted",
    timestamp: "2024-01-22 13:55:14",
    ipAddress: "192.168.1.101",
    device: "MacBook Pro",
    details: "Converted lead Sarah Johnson to client",
    category: "system",
    severity: "low",
    isActive: true,
  },
  {
    id: "9",
    user: "Carol Davis",
    action: "Password Changed",
    timestamp: "2024-01-22 13:50:08",
    ipAddress: "192.168.1.102",
    device: "iPhone 15",
    details: "User changed password successfully",
    category: "auth",
    severity: "low",
    isActive: true,
  },
  {
    id: "10",
    user: "System",
    action: "Security Alert",
    timestamp: "2024-01-22 13:45:22",
    ipAddress: "198.51.100.42",
    device: "Unknown",
    details: "Suspicious activity detected from external IP",
    category: "security",
    severity: "high",
    isActive: true,
  },
  {
    id: "11",
    user: "Ethan Williams",
    action: "VPN Connected",
    timestamp: "2024-01-22 13:40:10",
    ipAddress: "172.16.0.5",
    device: "Windows Laptop",
    details: "Connected to corporate VPN from remote location",
    category: "network",
    severity: "low",
    isActive: true,
  },
  {
    id: "12",
    user: "System",
    action: "Antivirus Scan Completed",
    timestamp: "2024-01-22 13:35:47",
    ipAddress: "192.168.1.201",
    device: "Server",
    details: "No threats found during scheduled scan",
    category: "security",
    severity: "low",
    isActive: true,
  },
  {
    id: "13",
    user: "Alice Johnson",
    action: "Unauthorized File Access",
    timestamp: "2024-01-22 13:30:12",
    ipAddress: "192.168.1.100",
    device: "Windows Desktop",
    details: "Attempted to open restricted HR folder",
    category: "security",
    severity: "medium",
    isActive: true,
  },
  {
    id: "14",
    user: "Bob Smith",
    action: "Email Sent",
    timestamp: "2024-01-22 13:25:55",
    ipAddress: "192.168.1.101",
    device: "MacBook Pro",
    details: "Sent contract to client with attachment",
    category: "communication",
    severity: "low",
    isActive: true,
  },
  {
    id: "15",
    user: "System",
    action: "Server Restarted",
    timestamp: "2024-01-22 13:20:00",
    ipAddress: "192.168.1.200",
    device: "Server",
    details: "Scheduled maintenance restart completed successfully",
    category: "system",
    severity: "low",
    isActive: true,
  },
  {
    id: "16",
    user: "Carol Davis",
    action: "Two-Factor Authentication Enabled",
    timestamp: "2024-01-22 13:15:36",
    ipAddress: "203.0.113.45",
    device: "Android Tablet",
    details: "Enabled 2FA using Google Authenticator",
    category: "security",
    severity: "low",
    isActive: false,
  },
  {
    id: "17",
    user: "System",
    action: "High CPU Usage Alert",
    timestamp: "2024-01-22 13:10:44",
    ipAddress: "192.168.1.202",
    device: "Server",
    details: "CPU usage exceeded 90% for 5 minutes",
    category: "monitoring",
    severity: "medium",
    isActive: true,
  },
  {
    id: "18",
    user: "Ethan Williams",
    action: "Project File Edited",
    timestamp: "2024-01-22 13:05:21",
    ipAddress: "172.16.0.5",
    device: "Windows Laptop",
    details: "Updated Q1 report draft",
    category: "file",
    severity: "low",
    isActive: true,
  },
  {
    id: "19",
    user: "System",
    action: "Email Delivery Failure",
    timestamp: "2024-01-22 13:00:09",
    ipAddress: "192.168.1.203",
    device: "Mail Server",
    details: "Email to client@example.com could not be delivered",
    category: "communication",
    severity: "low",
    isActive: true,
  },
  {
    id: "20",
    user: "Admin",
    action: "Account Locked",
    timestamp: "2024-01-22 12:55:48",
    ipAddress: "192.168.1.1",
    device: "Admin Console",
    details: "Locked user account after multiple failed login attempts",
    category: "security",
    severity: "high",
    isActive: true,
  },
];

function mapVerbToAction(verb: string): string {
  switch (verb) {
    case "LOGIN":
      return "User Login";
    case "LOGOUT":
      return "User Logout";
    case "UPLOAD":
      return "File Upload";
    case "SCREENSHOT":
      return "Screenshot Taken";
    case "CREATE":
      return "Created";
    case "UPDATE":
      return "Updated";
    case "DELETE":
      return "Deleted";
    case "ASSIGN":
      return "Assigned";
    case "APPROVE":
      return "Approved";
    case "REJECT":
      return "Rejected";
    case "STATUS_CHANGE":
      return "Status Change";
    case "COMMENT":
      return "Comment";
    default:
      return verb;
  }
}

function mapSeverity(sev?: string | null): "low" | "medium" | "high" {
  const s = (sev || "").toLowerCase();
  if (s === "critical" || s === "error" || s === "high") return "high";
  if (s === "warn" || s === "warning" || s === "medium") return "medium";
  return "low";
}

function mapCategory(ev: BEActivityEvent): ActivityLog["category"] {
  if (ev.verb === "LOGIN" || ev.verb === "LOGOUT") return "auth";
  if (ev.verb === "UPLOAD") return "file";
  if (ev.verb === "SCREENSHOT") return "monitoring";
  if (ev.verb === "COMMENT") return "communication";
  // Heuristic: security if tags include 'security' or source is WEBHOOK and verb not in common list
  const tags = (ev.context?.tags as string[] | undefined) || [];
  if (tags.includes("security")) return "security";
  return "system";
}

function mapEventToLog(ev: BEActivityEvent): ActivityLog {
  const ts = new Date(ev.timestamp);
  const filename = (ev.context?.filename as string | undefined) || "";
  const details = filename
    ? `${mapVerbToAction(ev.verb)} ${ev.target?.type}:${ev.target?.id} (${filename})`
    : `${mapVerbToAction(ev.verb)} ${ev.target?.type}:${ev.target?.id}`;
  return {
    id: ev.id,
    user: ev.actor?.name || ev.actor?.id || "System",
    action: mapVerbToAction(ev.verb),
    timestamp: isNaN(ts.getTime()) ? ev.timestamp : `${format(ts, "yyyy-MM-dd HH:mm:ss")}`,
    ipAddress: (ev.context?.ip_address as string | undefined)
      || (ev.context?.ip as string | undefined)
      || "-",
    device: (ev.context?.device_name as string | undefined)
      || (ev.context?.device_id as string | undefined)
      || (ev.context?.device_info as string | undefined)
      || (ev.context?.user_agent as string | undefined)
      || ev.source,
    details,
    category: mapCategory(ev),
    severity: mapSeverity((ev.context?.severity as string | undefined) || null),
    // isActive will be derived based on auth events sequence
    isActive: false,
  };
}

export default function ActivityLogs() {
  const { isAdmin } = useUser();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [deviceId, setDeviceId] = useState<string>("");
  const [currentDeviceName, setCurrentDeviceName] = useState<string>("");
  const [currentIP, setCurrentIP] = useState<string>("");
  const logsScrollRef = useRef<HTMLDivElement>(null);

  // Load from backend (no UI changes)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listActivityLogs({});
        const mapped = res.results.map(mapEventToLog);
        // Derive per-user active status from login/logout sequence within the loaded page
        const deriveStatuses = (rows: ActivityLog[]): ActivityLog[] => {
          // Work from oldest to newest so state carries forward correctly
          const asc = [...rows].reverse();
          const activeByUser = new Map<string, boolean>();
          for (const r of asc) {
            if (r.category === 'auth') {
              if (/logout/i.test(r.action)) {
                activeByUser.set(r.user, false);
                (r as any).isActive = false;
              } else if (/login/i.test(r.action)) {
                activeByUser.set(r.user, true);
                (r as any).isActive = true;
              } else {
                (r as any).isActive = activeByUser.get(r.user) ?? false;
              }
            } else {
              (r as any).isActive = activeByUser.get(r.user) ?? false;
            }
          }
          return asc.reverse();
        };
        const withStatus = deriveStatuses(mapped);
        if (mounted) setLogs(withStatus);
      } catch (e) {
        // keep empty/mocked logs on failure
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Note: Do not mutate stored values after fetch — display only what is recorded per event

  // Borrow device/IP resolution logic from Attendance for display fallbacks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      let stored = localStorage.getItem('attendance_device_id');
      if (!stored) {
        const cryptoObj = window.crypto as Crypto & { randomUUID?: () => string };
        const generated = (cryptoObj.randomUUID && cryptoObj.randomUUID())
          ? cryptoObj.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        stored = generated;
        localStorage.setItem('attendance_device_id', stored);
      }
      setDeviceId(stored);
    } catch {}

    (async () => {
      try {
        const existing = localStorage.getItem('attendance_device_name') || '';
        if (existing) {
          setCurrentDeviceName(existing);
        } else {
          const AGENT_URLS = [
            'http://127.0.0.1:47113/hostname',
            'http://localhost:47113/hostname',
          ];
          for (const u of AGENT_URLS) {
            try {
              const r = await fetch(u, { cache: 'no-store' });
              if (r.ok) {
                const name = (await r.text()).trim();
                if (name) {
                  localStorage.setItem('attendance_device_name', name);
                  setCurrentDeviceName(name);
                  break;
                }
              }
            } catch {}
          }
        }
      } catch {}
    })();
  }, []);

  // Ask backend for context (IP/deviceName) using the same endpoint Attendance uses
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        const did = typeof window !== 'undefined' ? (localStorage.getItem('attendance_device_id') || '') : '';
        const dname = typeof window !== 'undefined' ? (localStorage.getItem('attendance_device_name') || '') : '';
        if (did) headers['X-Device-Id'] = did;
        if (dname) headers['X-Device-Name'] = dname;
        const ctx = await api.get<{ ip: string; deviceName?: string }>("/api/attendance/context/", { headers });
        if (cancelled) return;
        if (ctx?.ip) setCurrentIP(ctx.ip);
        if (ctx?.deviceName) setCurrentDeviceName(ctx.deviceName);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Replace masked or UA-based device/IP with attendance-derived values for display
  // Do not mutate the recorded device/IP after fetch; display as stored per event

  // ✅ Base filtered logs that IGNORE activeFilter (used for Active Users count)
  const baseFilteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesUser = userFilter === "all" || log.user === userFilter;
      const matchesCategory =
        categoryFilter === "all" || log.category === categoryFilter;
      const matchesSeverity =
        severityFilter === "all" || log.severity === severityFilter;
      const matchesDate =
        !selectedDate ||
        log.timestamp.startsWith(format(selectedDate, "yyyy-MM-dd"));

      return (
        matchesSearch &&
        matchesUser &&
        matchesCategory &&
        matchesSeverity &&
        matchesDate
      );
    });
  }, [
    logs,
    searchTerm,
    userFilter,
    categoryFilter,
    severityFilter,
    selectedDate,
  ]);

  // Existing filtered logs (includes activeFilter for the table)
  const filteredLogs = useMemo(() => {
    return baseFilteredLogs.filter((log) => {
      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && log.isActive) ||
        (activeFilter === "inactive" && !log.isActive);

      return matchesActive;
    });
  }, [baseFilteredLogs, activeFilter]);

  const uniqueUsers = Array.from(new Set(logs.map((log) => log.user)));

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "auth":
        return <User className="h-4 w-4" />;
      case "file":
        return <FileText className="h-4 w-4" />;
      case "system":
        return <Monitor className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      case "monitoring":
        return <Monitor className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "auth":
        return "bg-blue-100 text-blue-800";
      case "file":
        return "bg-green-100 text-green-800";
      case "system":
        return "bg-purple-100 text-purple-800";
      case "security":
        return "bg-red-100 text-red-800";
      case "monitoring":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "default";
      case "medium":
        return "secondary";
      case "high":
        return "destructive";
      default:
        return "outline";
    }
  };

  const exportToCSV = () => {
    const headers = [
      "User",
      "Action",
      "Timestamp",
      "IP Address",
      "Device",
      "Category",
      "Severity",
      "Active",
      "Details",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          log.user,
          log.action,
          log.timestamp,
          log.ipAddress,
          log.device,
          log.category,
          log.severity,
          log.isActive ? "true" : "false",
          `"${log.details.replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity-logs.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600">
            Only administrators can access activity logs.
          </p>
        </div>
      </div>
    );
  }

  // ✅ Count active unique users from BASE filtered logs (ignores activeFilter)
  // Compute Active Users using only the latest AUTH event per user within a recent window
  const activeUniqueUsers = useMemo(() => {
    const WINDOW_MINUTES = 120; // consider a user active only if last login is within 2 hours
    const now = new Date();
    const threshold = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

    const seen = new Set<string>();
    let count = 0;
    for (const row of baseFilteredLogs) {
      const user = row.user;
      if (user === "System" || seen.has(user)) continue;
      if (row.category !== "auth") continue; // we only decide on auth events
      seen.add(user);
      const isLogin = /login/i.test(row.action) && !/logout/i.test(row.action);
      const ts = new Date(row.timestamp);
      if (isLogin && ts >= threshold) count++;
    }
    return count;
  }, [baseFilteredLogs]);

return (
  <div className="px-4 py-6 md:px-8 lg:px-12 space-y-6">
  <DashboardNavbar/>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#891F1A]">Activity Logs</h1>
          <p className="text-gray-600">
            Monitor system activities and user actions
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#891F1A]">
              Total Activities
            </CardTitle>
            <FileText className="h-4 w-4 text-[#891F1A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#891F1A]">
              Security Events
            </CardTitle>
            <Shield className="h-4 w-4 text-[#891F1A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredLogs.filter((log) => log.category === "security").length}
            </div>
          </CardContent>
        </Card>

        {/* High Severity (hover zoom + click applies severity=high) */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="cursor-pointer w-full"
          onClick={() => setSeverityFilter("high")}
          role="button"
          tabIndex={0}
          aria-label="Filter high severity events"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSeverityFilter("high");
            }
          }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#891F1A]">
                High Severity
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-[#891F1A]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {filteredLogs.filter((log) => log.severity === "high").length}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Users (hover zoom + click applies activeFilter=active) */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="cursor-pointer w-full"
          onClick={() => setActiveFilter("active")}
          role="button"
          tabIndex={0}
          aria-label="Filter active users"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveFilter("active");
            }
          }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#891F1A]">
                Active Users
              </CardTitle>
              <User className="h-4 w-4 text-[#891F1A]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUniqueUsers}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active filter chips */}
      {(searchTerm ||
        userFilter !== "all" ||
        categoryFilter !== "all" ||
        severityFilter !== "all" ||
        activeFilter !== "all" ||
        selectedDate) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base text-gray-600">Active filters:</span>

          {searchTerm && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 border-0 text-base px-3 py-1"
              onClick={() => setSearchTerm("")}
            >
              Search: {searchTerm} ×
            </Badge>
          )}

          {userFilter !== "all" && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 border-0 text-base px-3 py-1"
              onClick={() => setUserFilter("all")}
            >
              User: {userFilter} ×
            </Badge>
          )}

          {categoryFilter !== "all" && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 border-0 text-base px-3 py-1"
              onClick={() => setCategoryFilter("all")}
            >
              Category: {categoryFilter} ×
            </Badge>
          )}

          {severityFilter !== "all" && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 border-0 text-base px-3 py-1"
              onClick={() => setSeverityFilter("all")}
            >
              Severity: {severityFilter} ×
            </Badge>
          )}

          {activeFilter !== "all" && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 border-0 text-base px-3 py-1"
              onClick={() => setActiveFilter("all")}
            >
              Status: {activeFilter} ×
            </Badge>
          )}

          {selectedDate && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 border-0 text-base px-3 py-1"
              onClick={() => setSelectedDate(undefined)}
            >
              Date: {format(selectedDate, "PPP")} ×
            </Badge>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: Search */}
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Right: Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto flex-nowrap">
          {/* ... your Selects, Popover, Clear button (unchanged) ... */}
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="relative">
        <Card className="flex-1 relative z-10 w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[#891F1A] text-sm">
              Activity Logs ({filteredLogs.length})
            </CardTitle>
            <Button
              onClick={exportToCSV}
              className="ml-4 bg-[#891F1A] text-white border border-[#891F1A] hover:bg-[#A23E37] hover:border-[#A23E37] active:bg-[#751713] px-2 py-1 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Export CSV
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {/* The scroll area + rail live here. Rail is OUTSIDE the card with a consistent gap */}
            <ScrollAreaWithRail
              ref={logsScrollRef}
              heightClass="h-[440px]"
              railPosition="outside"
              containerHasCard={true}
              visualGap={12}
            >
              <div className="rounded-md border">
                <Table className="w-full table-fixed [border-collapse:separate] [border-spacing:0] text-xs">
                  {/* STICKY HEADER - no hover */}
                  <TableHeader className="sticky top-0 z-30 bg-[#891F1A]">
                    <TableRow>
                      <TableHead className="text-white text-center rounded-tl-md w-[5%] px-1 py-0.5">
                        User
                      </TableHead>
                      <TableHead className="text-white text-center w-[9%] px-1 py-0.5">
                        Action
                      </TableHead>
                      <TableHead className="text-white text-center w-[10%] px-1 py-0.5">
                        Time
                      </TableHead>
                      <TableHead className="text-white text-center w-[8%] px-1 py-0.5">
                        IP
                      </TableHead>
                      <TableHead className="text-white text-center w-[7%] px-1 py-0.5">
                        Device
                      </TableHead>
                      <TableHead className="text-white text-center w-[9%] px-1 py-0.5">
                        Category
                      </TableHead>
                      <TableHead className="text-white text-center w-[7%] px-1 py-0.5">
                        Severity
                      </TableHead>
                      <TableHead className="text-white text-center w-[7%] px-1 py-0.5">
                        Status
                      </TableHead>
                      <TableHead className="text-white text-center rounded-tr-md w-[18%] px-1 py-0.5">
                        Details
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="h-6">
                        <TableCell className="font-medium text-center px-1 py-0.5 truncate">
                          {log.user}
                        </TableCell>
                        <TableCell className="text-center px-1 py-0.5 truncate">
                          {log.action}
                        </TableCell>
                        <TableCell className="text-[10px] text-center px-1 py-0.5 truncate">
                          {log.timestamp}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-center px-1 py-0.5 truncate">
                          {log.ipAddress}
                        </TableCell>
                        <TableCell className="text-center px-1 py-0.5 truncate">
                          {log.device}
                        </TableCell>
                        <TableCell className="text-center px-1 py-0.5">
                          <div
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getCategoryColor(
                              log.category
                            )}`}
                          >
                            {getCategoryIcon(log.category)}
                            <span className="ml-1 capitalize">
                              {log.category}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-1 py-0.5">
                          <Badge
                            className="px-1 py-0.5 text-[10px]"
                            variant={getSeverityColor(log.severity)}
                          >
                            {log.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center px-1 py-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              log.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                log.isActive ? "bg-emerald-500" : "bg-gray-400"
                              }`}
                            />
                            {log.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-center px-1 py-0.5">
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollAreaWithRail>

            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  No logs found
                </h3>
                <p className="text-gray-600 text-xs">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);
}


