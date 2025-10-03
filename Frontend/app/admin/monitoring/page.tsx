"use client";

import type React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Monitor, Activity, Clock, Keyboard, MousePointer, Search, Filter,
  AlertTriangle, ChevronLeft, ChevronRight, Trash2, Lock
} from "lucide-react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_MONITORING_API_BASE || "http://localhost:8000";
const CAPTURE_EVERY_MS = 3000;
type CaptureMode = "all" | "custom";

interface DailySummary {
  date: string; keystrokes: number; clicks: number;
  activeTime: string; idleTime: string; productivity: number;
}
interface EmployeeActivity {
  id: string; name: string; email: string; department: string;
  status: "online" | "idle" | "offline";
  lastScreenshot: string; keystrokeCount: number; mouseClicks: number;
  activeTime: string; idleTime: string; productivity: number;
  screenshots: string[];
  videos?: string[]; // NEW
  activityTimeline: ("active" | "idle" | "offline")[];
  activities: { time: string; action: string; application: string }[];
  dailySummary: DailySummary[];
}

const nowHM = () => new Date().toTimeString().slice(0, 5);
const resolveURL = (s?: string) => {
  if (!s) return "/placeholder.svg";
  if (s.startsWith("data:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/uploads/")) return `${API_BASE}${s}`;
  return s;
};
function idleTimeToMinutes(time: string): number {
  const m = time.match(/(\d+)h\s*(\d+)m/); if (!m) return 0;
  return parseInt(m[1],10)*60 + parseInt(m[2],10);
}

// Helper function to generate consistent mock data based on device ID
function generateMockData(deviceId: string) {
  // Use device ID as seed for consistent "random" values
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    const char = deviceId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate consistent values based on hash
  const keystrokeCount = Math.abs(hash % 2000) + 500;
  const mouseClicks = Math.abs(hash % 1500) + 300;
  const activeHours = Math.abs(hash % 8) + 1;
  const activeMinutes = Math.abs(hash % 60);
  const idleHours = Math.abs(hash % 2);
  const idleMinutes = Math.abs(hash % 60);
  const productivity = Math.abs(hash % 40) + 60;
  
  return {
    keystrokeCount,
    mouseClicks,
    activeTime: `${activeHours}h ${activeMinutes}m`,
    idleTime: `${idleHours}h ${idleMinutes}m`,
    productivity
  };
}

/* ---- MOCK ---- */
const mockEmployees: EmployeeActivity[] = [
  { id: "1", name: "Alice Johnson", email: "alice@company.com", department: "Sales",
    status: "online", lastScreenshot: "2 min ago",
    keystrokeCount: 1247, mouseClicks: 892, activeTime: "7h 23m", idleTime: "0h 47m", productivity: 85,
    screenshots: ["/placeholder.svg?height=200&width=300"], videos: [],
    activityTimeline: new Array(24).fill("active"),
    activities: [
      { time: "14:30", action: "Application opened", application: "Salesforce" },
      { time: "14:25", action: "File accessed", application: "Excel" },
      { time: "14:20", action: "Email sent", application: "Outlook" },
    ],
    dailySummary: [],
  },
  { id: "2", name: "Bob Smith", email: "bob@company.com", department: "Marketing",
    status: "idle", lastScreenshot: "15 min ago",
    keystrokeCount: 892, mouseClicks: 634, activeTime: "6h 45m", idleTime: "1h 30m", productivity: 72,
    screenshots: ["/placeholder.svg?height=200&width=300"], videos: [],
    activityTimeline: new Array(24).fill("idle"),
    activities: [
      { time: "14:15", action: "Break started", application: "System" },
      { time: "14:00", action: "Document edited", application: "Google Docs" },
      { time: "13:45", action: "Meeting joined", application: "Zoom" },
    ],
    dailySummary: [],
  },
  { id: "3", name: "Carol Davis", email: "carol@company.com", department: "Development",
    status: "online", lastScreenshot: "1 min ago",
    keystrokeCount: 2156, mouseClicks: 1023, activeTime: "8h 12m", idleTime: "0h 35m", productivity: 92,
    screenshots: ["/placeholder.svg?height=200&width=300"], videos: [],
    activityTimeline: new Array(24).fill("active"),
    activities: [
      { time: "14:32", action: "Code committed", application: "Git" },
      { time: "14:28", action: "File saved", application: "VS Code" },
      { time: "14:20", action: "Debug session", application: "Chrome DevTools" },
    ],
    dailySummary: [],
  },
];

export default function EmployeeMonitoringWithLogin() {
  // ---------- HOOKS ----------
  const [authed, setAuthed] = useState(false);
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [loginErr, setLoginErr] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  const [employees, setEmployees] = useState<EmployeeActivity[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeActivity | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("today");
  const [activeModalTab, setActiveModalTab] = useState<"timeline" | "summary">("timeline");
  const [modalScreenshotIndex, setModalScreenshotIndex] = useState(0);

  const [connected, setConnected] = useState<boolean | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  const [isCapturing, setIsCapturing] = useState(false);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<number | null>(null);

  const [captureMode, setCaptureMode] = useState<CaptureMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastActivityRef = useRef<number>(Date.now());

  const [downloading, setDownloading] = useState(false);

  // ---------- helpers ----------
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    (async () => {
      try {
        const { login } = await import("@/lib/auth");
        const role = (localStorage.getItem("admin_role") as any) || "admin";
        await login(u, p, role);
        setAuthed(true);
        setLoginErr("");
      } catch (err: any) {
        setAuthed(false);
        if (err.message.startsWith("DEVICE_REQUIRED:")) {
          const enrollmentToken = err.message.split(":")[1];
          localStorage.setItem("enrollment_token", enrollmentToken);
          window.location.href = `/install-agent?token=${enrollmentToken}`;
          return;
        }
        setLoginErr(err?.message || "Invalid credentials");
      }
    })();
  }
  function getTargetIds(list: EmployeeActivity[]) {
    if (captureMode === "all") return list.map(e => e.id);
    const arr = Array.from(selectedIds);
    return arr.length ? arr : (list[0]?.id ? [list[0].id] : []);
  }
  function togglePick(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function pickAll() { setSelectedIds(new Set(employees.map(e=>e.id))); setCaptureMode("custom"); }
  function clearPick() { setSelectedIds(new Set()); setCaptureMode("custom"); }

  // ---------- effects ----------
  useEffect(() => {
    // Mark as hydrated to prevent SSR/client mismatches
    setIsHydrated(true);
    
    // Check if user is already authenticated
    if (typeof window !== "undefined" && localStorage.getItem("admin_token")) {
      console.log('Found existing admin token, setting authed to true');
      setAuthed(true);
    } else {
      console.log('No admin token found, user needs to login');
    }
  }, []);

  useEffect(() => {
    if (!authed) {
      console.log('User not authenticated, skipping data fetch');
      return;
    }
    
    let stop = false;
    const load = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
        console.log('Auth token:', token ? 'Present' : 'Missing');
        const params = new URLSearchParams({ q: searchTerm, status: statusFilter });
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        console.log('Fetching devices with headers:', headers);
        
        const res = await fetch(`${API_BASE}/api/admin/devices?${params.toString()}`, { cache: "no-store", headers });
        console.log('Response status:', res.status);
        
        if (!res.ok) { 
          console.error('API request failed with status:', res.status);
          setConnected(false); 
          setFetchErr(`HTTP ${res.status}`); 
          return; 
        }
        
        const data = await res.json();
        console.log('Raw API response:', data);
        
        if (!stop && Array.isArray(data?.devices)) {
          console.log('Raw device data:', data.devices);
          
          // Convert device data to employee format for compatibility
          const norm = data.devices.map((device: any) => {
            try {
              console.log('Processing device:', device);
              
              // Safe access to nested properties with null checks
              const userName = device.current_user_name || 
                             (device.user && device.user.name) || 
                             device.hostname || 
                             'Unknown User';
              
              const userEmail = (device.user && device.user.email) || 'No User';
              const orgName = (device.org && device.org.name) || 'Unknown Department';
              
              const lastScreenshotTime = device.latest_screenshot ? 
                `${Math.floor((Date.now() - new Date(device.latest_screenshot.taken_at).getTime()) / 60000)} min ago` : 
                'Never';
              
              const screenshots = device.latest_screenshot ? [device.latest_screenshot.thumb_url] : [];
              
              const activities = device.latest_heartbeat ? [
                { 
                  time: new Date(device.latest_heartbeat.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), 
                  action: `Active in ${device.latest_heartbeat.active_window || 'Unknown'}`, 
                  application: device.latest_heartbeat.active_window || 'Unknown' 
                },
              ] : [];
              
              // Generate consistent mock data based on device ID
              const mockData = generateMockData(device.id);
              
              const result = {
                id: device.id,
                name: userName,
                email: userEmail,
                department: orgName,
                status: device.status.toLowerCase(),
                lastScreenshot: lastScreenshotTime,
                keystrokeCount: mockData.keystrokeCount,
                mouseClicks: mockData.mouseClicks,
                activeTime: mockData.activeTime,
                idleTime: mockData.idleTime,
                productivity: mockData.productivity,
                screenshots: screenshots,
                videos: [], // No videos in new system
                activityTimeline: new Array(24).fill(device.status === 'ONLINE' ? 'active' : 'idle'),
                activities: activities,
                dailySummary: [],
              };
              
              console.log('Processed device result:', result);
              return result;
            } catch (error) {
              console.error('Error processing device:', device, error);
              return null;
            }
          }).filter(Boolean);
          
          console.log('Processed employees:', norm);
          console.log('Setting employees state with', norm.length, 'devices');
          setEmployees(norm); 
          setConnected(true); 
          setFetchErr(null);
        } else {
          console.warn('Invalid data format received:', data);
          setConnected(false);
          setFetchErr('Invalid data format');
        }
      } catch (e: any) { 
        console.error('Error in data fetch:', e);
        setConnected(false); 
        setFetchErr(e?.message || "Network error"); 
      }
    };
    
    console.log('Starting data fetch loop');
    load();
    const id = setInterval(load, 6000);
    return () => { 
      console.log('Cleaning up data fetch loop');
      stop = true; 
      clearInterval(id); 
    };
  }, [authed, searchTerm, departmentFilter, statusFilter, timeRange]);

  useEffect(() => {
    if (!selectedEmployee) return;
    const fresh = employees.find(e => e.id === selectedEmployee.id);
    if (fresh && fresh !== selectedEmployee) setSelectedEmployee(fresh);
  }, [employees, selectedEmployee?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (selectedEmployee) setActiveModalTab("timeline"); }, [selectedEmployee]);

  useEffect(() => {
    if (!authed || !tracking) return;
    const onClick = () => bumpLocalAndServer({ c: 1 }, "Mouse click", "Browser");
    const onKey = () => bumpLocalAndServer({ k: 1 }, "Key press", "Browser");
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);

    const idleTimer = window.setInterval(() => {
      const now = Date.now(); const idleMs = now - lastActivityRef.current;
      setEmployees(prev => prev.map(e => {
        const mins = Math.floor(idleMs/60000); const h = Math.floor(mins/60); const m = mins%60;
        const status: EmployeeActivity["status"] =
          idleMs < 5*60*1000 ? "online" : idleMs < 60*60*1000 ? "idle" : "offline";
        const [ah, am] = (e.activeTime || "0h 0m").split("h ").map(s => parseInt(s,10)) as [number, number];
        const total = (isNaN(ah)?0:ah)*60 + (isNaN(am)?0:am) + (status==="online"?1:0);
        return { ...e, status, idleTime: `${h}h ${m}m`, activeTime: `${Math.floor(total/60)}h ${total%60}m` };
      }));
    }, 15000);

    return () => { window.removeEventListener("click", onClick); window.removeEventListener("keydown", onKey); clearInterval(idleTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tracking]);

  // ---------- actions ----------
  function bumpLocalAndServer(delta: { k?: number; c?: number }, action: string, application: string) {
    lastActivityRef.current = Date.now();
    setEmployees(prev => {
      const ids = getTargetIds(prev);
      const nowTime = new Date().toTimeString().slice(0, 5);
      const upd = prev.map(e => {
        if (!ids.includes(e.id)) return e;
        const ke = e.keystrokeCount + (delta.k ?? 0);
        const cl = e.mouseClicks + (delta.c ?? 0);
        // Use a more predictable productivity change
        const prod = Math.min(99, Math.max(50, e.productivity + (e.id.charCodeAt(0) % 2 === 0 ? 1 : -1)));
        const activities = [{ time: nowTime, action, application }, ...e.activities].slice(0, 5000);
        return { ...e, keystrokeCount: ke, mouseClicks: cl, productivity: prod, lastScreenshot: e.lastScreenshot || "Just now", activities, status: "online" as const, idleTime: "0h 0m" };
      });

      fetch(`${API_BASE}/api/track`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(typeof window!=="undefined" && localStorage.getItem("admin_token") ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` } : {}) },
        body: JSON.stringify({
          employeeIds: ids,
          delta: { k: delta.k ?? 0, c: delta.c ?? 0 },
          action, application, when: new Date().toISOString(),
        }),
      }).catch(()=>{});
      return upd;
    });
  }

  const startConsentedCapture = async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { frameRate: 2 }, audio: false });
      captureStreamRef.current = stream; setIsCapturing(true);
      await grabOneFrameAndSave();
      captureTimerRef.current = window.setInterval(grabOneFrameAndSave, CAPTURE_EVERY_MS) as unknown as number;
      const track = stream.getVideoTracks()[0];
      track.addEventListener("ended", stopConsentedCapture);
    } catch {
      setIsCapturing(false); captureStreamRef.current = null;
      alert("Screen capture permission denied or cancelled.");
    }
  };

  const stopConsentedCapture = () => {
    if (captureTimerRef.current) { clearInterval(captureTimerRef.current); captureTimerRef.current = null; }
    if (captureStreamRef.current) { captureStreamRef.current.getTracks().forEach(t => t.stop()); captureStreamRef.current = null; }
    setIsCapturing(false);
  };

  async function grabOneFrameAndSave() {
    const stream = captureStreamRef.current;
    if (!stream) return;
    const video = document.createElement("video");
    video.srcObject = stream;
    await new Promise(r => (video.onloadedmetadata = () => r(null)));
    await video.play();
    await new Promise(r => setTimeout(r, 150));
    const vw = (video as any).videoWidth || 1366;
    const vh = (video as any).videoHeight || 768;

    const canvas = document.createElement("canvas");
    canvas.width = vw; canvas.height = vh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

    setEmployees(prev => {
      const ids = getTargetIds(prev);
      const upd = prev.map(e => ids.includes(e.id)
        ? { ...e, screenshots: [dataUrl, ...e.screenshots].slice(0, 100), lastScreenshot: "Just now" }
        : e
      );

      fetch(`${API_BASE}/api/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(typeof window!=="undefined" && localStorage.getItem("admin_token") ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` } : {}) },
        body: JSON.stringify({ employeeIds: ids, when: new Date().toISOString(), imageDataUrl: dataUrl }),
      }).catch(()=>{});
      return upd;
    });
  }

  async function deleteScreenshot(empId: string, shot: string, index: number) {
    setEmployees(prev => prev.map(e => e.id===empId ? ({ ...e, screenshots: e.screenshots.filter((_,i)=>i!==index) }) : e));
    try {
      let file = shot;
      if (file.startsWith(API_BASE)) file = file.replace(API_BASE, "");
      if (file.startsWith("/uploads/")) {
        await fetch(`${API_BASE}/api/screenshot/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(typeof window!=="undefined" && localStorage.getItem("admin_token") ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` } : {}) },
          body: JSON.stringify({ employeeId: empId, file }),
        });
      }
    } catch {}
  }

  // ---------- Download all activity as ZIP (screenshots + videos + CSV) ----------
  async function downloadAllActivity(emp: EmployeeActivity) {
    try {
      setDownloading(true);
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      // meta
      zip.file("meta.json", JSON.stringify({
        exportedAt: new Date().toISOString(),
        employee: { id: emp.id, name: emp.name, email: emp.email, department: emp.department },
        counts: { screenshots: emp.screenshots.length, videos: (emp.videos || []).length, activities: emp.activities.length, days: emp.dailySummary.length },
      }, null, 2));

      // CSV helpers
      const csvEscape = (s: any) => {
        const str = s == null ? "" : String(s);
        const esc = str.replace(/"/g, '""');
        return /[",\n]/.test(esc) ? `"${esc}"` : esc;
      };
      const toCSV = (rows: any[][]) => rows.map(r => r.map(csvEscape).join(",")).join("\n");

      // activity_log.csv
      const activityRows = [["Time","Action","Application"], ...emp.activities.map(a => [a.time, a.action, a.application])];
      zip.file("activity_log.csv", toCSV(activityRows));

      // daily_summary.csv
      const summaryRows = [["Date","Keystrokes","Clicks","Active Time","Idle Time","Productivity"],
        ...emp.dailySummary.map(d => [d.date, d.keystrokes, d.clicks, d.activeTime, d.idleTime, `${d.productivity}%`])];
      zip.file("daily_summary.csv", toCSV(summaryRows));

      // helper: dataURL -> Blob
      const dataURLtoBlob = (dataUrl: string) => {
        const [head, body] = dataUrl.split(",");
        const mime = (head.match(/:(.*?);/)?.[1]) || "application/octet-stream";
        const bstr = atob(body);
        const u8 = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
        return new Blob([u8], { type: mime });
      };

      // screenshots/
      const sFolder = zip.folder("screenshots");
      if (sFolder) {
        for (let i = 0; i < emp.screenshots.length; i++) {
          const s = emp.screenshots[i]; if (!s) continue;
          const url = resolveURL(s);
          if (url.includes("placeholder.svg")) continue;
          try {
            let blob: Blob;
            if (url.startsWith("data:")) blob = dataURLtoBlob(url);
            else { const resp = await fetch(url); blob = await resp.blob(); }
            const idx = String(i + 1).padStart(3, "0");
            sFolder.file(`screenshot_${idx}.jpg`, blob);
          } catch (e) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("Failed to fetch screenshot:", url, e);
            }
          }
        }
      }

      // videos/
      const vids = emp.videos || [];
      if (vids.length) {
        const vFolder = zip.folder("videos");
        for (let i = 0; i < vids.length; i++) {
          const vurl = resolveURL(vids[i]);
          try {
            const resp = await fetch(vurl);
            const blob = await resp.blob();
            const idx = String(i + 1).padStart(3, "0");
            const ext =
              blob.type.includes("mp4") ? "mp4" :
              blob.type.includes("webm") ? "webm" :
              blob.type.includes("avi") ? "avi" : "bin";
            vFolder!.file(`segment_${idx}.${ext}`, blob);
          } catch (e) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("Video fetch failed:", vurl, e);
            }
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      const safeName = emp.name.replace(/\s+/g, "_");
      a.href = URL.createObjectURL(content);
      a.download = `${safeName}_activity_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error(e);
      }
      alert("Failed to prepare archive. Make sure 'jszip' is installed.");
    } finally {
      setDownloading(false);
    }
  }

  // ---------- selectors ----------
  const filteredEmployees = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return employees.filter((emp) => {
      const s = emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q);
      const d = departmentFilter === "all" || emp.department === departmentFilter;
      const st = statusFilter === "all" || emp.status === statusFilter;
      return s && d && st;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const getStatusColor = (status: string) => status==="online"?"bg-green-500":status==="idle"?"bg-yellow-500":"bg-gray-500";
  const handleModalPrev = () => setModalScreenshotIndex((p) => Math.max(0, p - 3));
  const handleModalNext = () => selectedEmployee && setModalScreenshotIndex((p) => Math.min(p + 3, Math.max(0, selectedEmployee.screenshots.length - 3)));
  const handleExportCSV = () => {
    const header = ["Name","Email","Status","Department","Productivity","Keystrokes","Clicks"];
    const rows = filteredEmployees.map((emp) => [emp.name,emp.email,emp.status,emp.department,`${emp.productivity}%`,emp.keystrokeCount.toString(),emp.mouseClicks.toString()]);
    const csv = [header, ...rows].map(r => r.map(v => {
      const s = v==null?"":String(v); const e=s.replace(/"/g,'""'); return /[,"\n]/.test(e)?`"${e}"`:e;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "employees.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // ---------- render ----------
  // Prevent hydration mismatches by not rendering until hydrated
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#891F1A] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#891F1A]/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-[#891F1A]" />
              </div>
              <CardTitle className="mt-3">Super Admin Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input value={u} onChange={(e)=>setU(e.target.value)} placeholder="saim123" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input type="password" value={p} onChange={(e)=>setP(e.target.value)} placeholder="••••••••" />
                </div>
                {loginErr && <p className="text-sm text-red-600">{loginErr}</p>}
                <Button type="submit" className="w-full bg-[#891F1A] hover:bg-[#6c1714] text-white">Login</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DashboardNavbar />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-[#891F1A]">Employee Monitoring</h1>
          <p className="text-gray-600">Monitor employee activity and productivity</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {connected !== null && (
            <span className={`text-xs px-2 py-1 rounded-full border ${connected ? "text-green-700 border-green-300 bg-green-50" : "text-red-700 border-red-300 bg-red-50"}`}>
              {connected ? "Connected to API" : `Not connected${fetchErr?` — ${fetchErr}`:""}`}
            </span>
          )}
          {!isCapturing ? (
            <Button onClick={startConsentedCapture} className="bg-gray-800 hover:bg-gray-900 text-white">Start Screen Capture</Button>
          ) : (
            <Button onClick={stopConsentedCapture} className="bg-red-600 hover:bg-red-700 text-white">Stop Capture</Button>
          )}
          <Button
            variant={tracking ? ("destructive" as any) : "default"}
            className={tracking ? "bg-red-600 hover:bg-red-700" : "bg-[#891F1A] hover:bg-[#6c1714] text-white"}
            onClick={() => setTracking(s => !s)}
          >
            {tracking ? "Stop Tracking" : "Start Tracking"}
          </Button>
          <Button className="bg-[#891F1A] text-white hover:bg-[#6c1714]" onClick={handleExportCSV}>Export CSV</Button>
        </div>
      </div>

      {/* Capture target controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">Capture targets:</span>
              <Select value={captureMode} onValueChange={(v: CaptureMode)=>setCaptureMode(v)}>
                <SelectTrigger className="min-w-[160px]">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  <SelectItem value="custom">Custom selection</SelectItem>
                </SelectContent>
              </Select>
              {captureMode === "custom" && (
                <>
                  <Button size="sm" variant="outline" onClick={pickAll}>Select All</Button>
                  <Button size="sm" variant="outline" onClick={clearPick}>Clear</Button>
                  <span className="text-xs text-gray-600">{selectedIds.size} selected</span>
                </>
              )}
            </div>
            {captureMode === "custom" && (
              <div className="flex flex-wrap gap-2">
                {employees.map(e=>(
                  <label key={e.id} className="flex items-center gap-2 border rounded-lg px-3 py-1 text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={()=>togglePick(e.id)} />
                    <span>{e.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Employees</CardTitle><Monitor className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-[#891F1A]">{employees.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Online Now</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-[#891F1A]">{employees.filter(e => e.status==="online").length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Idle</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-[#891F1A]">{employees.filter(e => e.status==="idle").length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg Productivity</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-[#891F1A]">{Math.round(employees.reduce((a,e)=>a+e.productivity,0)/Math.max(1,employees.length))}%</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:w-[495px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-4">
          <div className="flex items-center space-x-2"><Filter className="h-5 w-5 text-muted-foreground" /><span className="font-medium text-sm text-muted-foreground">Filters</span></div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="min-w-[160px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Development">Development</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="Today" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="last7Days">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => {
          const idleMinutes = idleTimeToMinutes(employee.idleTime);
          const showIdleAlert = idleMinutes > 60;
          const currentScreenshot = resolveURL(employee.screenshots[0]);
          return (
            <Card key={employee.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={`/placeholder.svg?height=40&width=40&query=${employee.name}`} />
                        <AvatarFallback>{employee.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(employee.status)}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.department}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className={`text-white text-xs font-semibold px-2 py-1 rounded ${
                      employee.status === "online" ? "bg-[#891F1A]" : employee.status === "idle" ? "bg-[#891F1A]/70" : "bg-[#891F1A]/40"
                    }`}>{employee.status}</Badge>
                    {showIdleAlert && (
                      <span className="flex items-center text-xs text-yellow-600 mt-1 space-x-1">
                        <AlertTriangle className="h-3 w-3" /><span>Idle more than 1h</span>
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Latest Screenshot</span>
                    <span className="text-xs text-gray-500">{employee.lastScreenshot}</span>
                  </div>
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img src={currentScreenshot} alt="Latest screenshot" className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1"><Keyboard className="h-4 w-4 mr-1 text-blue-500" /><span className="text-sm font-medium">Keystrokes</span></div>
                    <div className="text-lg font-bold">{employee.keystrokeCount.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1"><MousePointer className="h-4 w-4 mr-1 text-green-500" /><span className="text-sm font-medium">Clicks</span></div>
                    <div className="text-lg font-bold">{employee.mouseClicks.toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Productivity</span><span className="text-sm font-bold text-[#891F1A]">{employee.productivity}%</span></div>
                  <Progress value={employee.productivity} className="h-2 bg-gray-200 [&>div]:bg-[#891F1A]" />
                </div>

                <div className="flex gap-3">
                  <div className="flex items-center justify-between flex-1 bg-blue-100 text-blue-800 text-sm font-semibold px-4 py-1 rounded-full">
                    <span className="flex items-center gap-2"><Clock className="h-4 w-4" />Active</span>
                    <span className="ml-auto">{employee.activeTime}</span>
                  </div>
                  <div className="flex items-center justify-between flex-1 bg-yellow-100 text-yellow-800 text-sm font-semibold px-4 py-1 rounded-full">
                    <span className="flex items-center gap-2"><Clock className="h-4 w-4" />Idle</span>
                    <span className="ml-auto">{employee.idleTime}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
                  <div className="space-y-1">
                    {employee.activities.slice(0, 3).map((activity, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{activity.time}</span>
                        <span className="font-medium">{activity.action}</span>
                        <span className="text-gray-500">{activity.application}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full bg-transparent" variant="outline" onClick={() => setSelectedEmployee(employee)}>View Details</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#891F1A]">{selectedEmployee.name} - Detailed View</h2>
                <Button onClick={() => setSelectedEmployee(null)} className="bg-white text-[#891F1A] border border-[#891F1A] hover:bg-[#891F1A]/10 font-medium">Close</Button>
              </div>

              <div className="border-b border-gray-200 mb-4">
                <button className={`px-4 py-2 mr-2 focus:outline-none ${activeModalTab==="timeline"?"border-b-2 border-[#891F1A] text-[#891F1A] font-semibold":"text-gray-500"}`} onClick={() => setActiveModalTab("timeline")}>Activity Timeline</button>
                <button className={`px-4 py-2 focus:outline-none ${activeModalTab==="summary"?"border-b-2 border-[#891F1A] text-[#891F1A] font-semibold":"text-gray-500"}`} onClick={() => setActiveModalTab("summary")}>Daily Summary</button>
              </div>

              {activeModalTab === "timeline" && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#891F1A]">Activity</h3>
                    <Button
                      onClick={() => selectedEmployee && downloadAllActivity(selectedEmployee)}
                      disabled={downloading}
                      className="bg-[#891F1A] text-white hover:bg-[#6c1714]"
                    >
                      {downloading ? "Preparing..." : "Download all activity"}
                    </Button>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold mb-3 text-[#891F1A]">Screenshot History</h3>
                    </div>
                    <div className="relative">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedEmployee.screenshots.slice(modalScreenshotIndex, modalScreenshotIndex + 3).map((s, idx) => {
                          const globalIdx = modalScreenshotIndex + idx;
                          const url = resolveURL(s);
                          return (
                            <div key={globalIdx} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">
                              <img src={url} alt={`Screenshot ${globalIdx + 1}`} className="w-full h-full object-cover" />
                              <button
                                title="Delete"
                                onClick={() => deleteScreenshot(selectedEmployee.id, url, globalIdx)}
                                className="absolute top-2 right-2 p-1.5 rounded bg-white/80 hover:bg-white text-red-600 shadow hidden group-hover:block"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {selectedEmployee.screenshots.length > 3 && (
                        <>
                          <Button variant="ghost" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-700" onClick={handleModalPrev} disabled={modalScreenshotIndex===0}><ChevronLeft className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-700" onClick={handleModalNext} disabled={modalScreenshotIndex>=selectedEmployee.screenshots.length-3}><ChevronRight className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* NEW: Video segments */}
                  {selectedEmployee.videos && selectedEmployee.videos.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-[#891F1A]">Video Segments</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedEmployee.videos.slice(0, 6).map((v, i) => {
                          const vurl = resolveURL(v);
                          return (
                            <div key={i} className="bg-gray-100 rounded-lg p-2">
                              <video src={vurl} controls className="w-full rounded" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[#891F1A]">Activity Timeline</h3>
                    <div className="space-y-3">
                      {selectedEmployee.activities.map((activity, index) => (
                        <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-600">{activity.time}</div>
                          <div className="flex-1">
                            <div className="font-medium text-[#891F1A]">{activity.action}</div>
                            <div className="text-sm text-gray-600 break-all">{activity.application}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeModalTab === "summary" && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-[#891F1A]">Daily Summary</h3>
                  <div className="space-y-3">
                    {selectedEmployee.dailySummary.map((s, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm font-semibold"><span>{s.date}</span><span>{s.productivity}% productivity</span></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex justify-between"><span>Keystrokes:</span><span>{s.keystrokes.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Mouse clicks:</span><span>{s.clicks.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Active time:</span><span>{s.activeTime}</span></div>
                          <div className="flex justify-between"><span>Idle time:</span><span>{s.idleTime}</span></div>
                          <div className="flex justify-between"><span>Productivity:</span><span>{s.productivity}%</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
