"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { FaUserCircle } from "react-icons/fa";

type RoleKey = "sales" | "designer" | "production" | "admin" | "default";

export default function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<RoleKey>("default");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("admin_username");
    const r = (localStorage.getItem("admin_role") || "").toLowerCase();
    setUsername(u);
    const normalized: RoleKey =
      r === "sales" || r === "designer" || r === "production" || r === "admin"
        ? (r as RoleKey)
        : "default";
    setRole(normalized);
    setReady(true);
  }, []);

  const isActive = (route: string) =>
    pathname === route || pathname.startsWith(route + "/");

  const getLinkClass = (active: boolean) =>
    `px-2.5 py-1 rounded-full transition-all duration-200 whitespace-nowrap text-sm font-medium inline-block min-w-0 ${
      active ? "bg-white text-black shadow-inner" : "text-gray-200 hover:text-white font-normal"
    }`;

  // Role → Orders base URL
  const ordersUrlByRole: Record<RoleKey, string> = {
    designer: "/admin/order-lifecycle/table/designer",
    production: "/admin/order-lifecycle/table/production",
    sales: "/admin/order-lifecycle/table",
    admin: "/admin/orders/all", // ✅ updated for admin
    default: "/admin/order-lifecycle/table",
  };

  // Role → Visible nav links
  const ADMIN_LINKS = [
    { id: "dashboard", label: "Dashboard", href: "/admin/dashboard" },
    { id: "orders", label: "Orders", href: ordersUrlByRole.admin, isOrders: true },
    // Design Approvals moved to Orders page tab
    { id: "leads", label: "Leads", href: "/admin/leads" },
    { id: "clients", label: "Clients", href: "/admin/client" },
    { id: "attendance", label: "Attendance", href: "/admin/attendence" },
    { id: "monitoring", label: "Employee Monitoring", href: "/admin/monitoring-new" },
    { id: "employee-management", label: "Employee Management", href: "/admin/hr/employee-management" },
    { id: "salary", label: "Salary Builder", href: "/admin/hr/salary-builder" },
    { id: "activity", label: "Activity Logs", href: "/admin/activity-logs" },
    { id: "chat", label: "Chat", href: "/admin/chat" },
  ] as const;

  const SALES_LINKS = [
    { id: "dashboard", label: "Dashboard", href: "/admin/dashboard" },
    { id: "orders", label: "Orders", href: ordersUrlByRole.sales, isOrders: true },
    // Design Approvals moved to Orders page tab
    { id: "attendance", label: "Attendance", href: "/admin/attendence" },
  ] as const;

  const LIMITED_LINKS_FOR_DP = (r: RoleKey) => [
    { id: "dashboard", label: "Dashboard", href: "/admin/dashboard" },
    { id: "orders", label: "Orders", href: ordersUrlByRole[r] ?? ordersUrlByRole.default, isOrders: true },
    { id: "attendance", label: "Attendance", href: "/admin/attendence" },
  ] as const;

  const ROLE_NAV: Record<
    RoleKey,
    Array<{ id: string; label: string; href: string; isOrders?: boolean }>
  > = {
    admin: [...ADMIN_LINKS],
    sales: [...SALES_LINKS],
    designer: [...LIMITED_LINKS_FOR_DP("designer")],
    production: [...LIMITED_LINKS_FOR_DP("production")],
    default: [...LIMITED_LINKS_FOR_DP("sales")],
  };

  const navLinks = useMemo(() => ROLE_NAV[role] ?? ROLE_NAV.default, [role]);

  // Guard: wait until role is loaded; skip entirely for admin
  useEffect(() => {
    if (!ready) return;
    if (role === "admin") return; // admin can go anywhere
    if (!pathname) return;

    const allowed = navLinks.map((l) => l.href);
    const ok = allowed.some((p) => pathname === p || pathname.startsWith(p + "/"));

    if (!ok) {
      const target = navLinks[0]?.href || "/admin/dashboard";
      if (pathname !== target) router.replace(target);
    }
  }, [ready, role, pathname, navLinks, router]);

  const handleLogout = async () => {
    if (username) {
      try {
        const headers: Record<string, string> = {};
        try {
          const deviceId = typeof window !== 'undefined' ? (localStorage.getItem('attendance_device_id') || '') : '';
          const deviceName = typeof window !== 'undefined' ? (localStorage.getItem('attendance_device_name') || '') : '';
          if (deviceId) headers['X-Device-Id'] = deviceId;
          if (deviceName) headers['X-Device-Name'] = deviceName;
        } catch {}
        const device_id = typeof window !== 'undefined' ? (localStorage.getItem('attendance_device_id') || '') : '';
        const device_name = typeof window !== 'undefined' ? (localStorage.getItem('attendance_device_name') || '') : '';
        const ip = typeof window !== 'undefined' ? (localStorage.getItem('attendance_device_ip') || '') : '';
        await api.post('/api/auth/logout', { device_id, device_name, ip }, { headers });
      } catch (e) {
        // ignore logging errors
      }
      localStorage.removeItem("admin_username");
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_role");
      sessionStorage.setItem("logout_message", `${username} successfully logged out`);
    }
    router.push("/admin/login");
  };

  // Orders active check (now covers both /order-lifecycle and /orders/all)
  const isOrdersActive =
    pathname === "/admin/order-lifecycle/table" ||
    pathname.startsWith("/admin/order-lifecycle/table/") ||
    pathname.startsWith("/admin/orders/");

  return (
    <nav className="sticky top-0 z-50 bg-[#891F1A] text-white px-4 py-2 flex items-center justify-between gap-4 overflow-hidden whitespace-nowrap rounded-xl shadow-md mb-4 h-14">
      {/* Left: Logo + Brand */}
      <div className="flex items-center gap-2 shrink-0 h-full">
        <img src="/logo.jpg" alt="Romix Logo" className="w-6 h-6 flex-shrink-0" />
        <span className="font-semibold text-lg whitespace-nowrap">Creative-Connect</span>
      </div>

      {/* Center: Role-Based Nav (hide until ready to prevent flicker) */}
      <div className="flex gap-2 items-center justify-center text-sm font-medium shrink-0 flex-1">
        {ready &&
          navLinks.map((link) => {
            const active = link.isOrders ? isOrdersActive : isActive(link.href);
            return (
              <Link 
                key={link.id} 
                href={link.href} 
                className={getLinkClass(active)}
                style={{ lineHeight: '1.25rem' }}
              >
                {link.label}
              </Link>
            );
          })}
      </div>

      {/* Right: Profile + Logout */}
      <div className="flex items-center gap-2 shrink-0 h-full">
        <div className="flex items-center gap-1.5 h-full">
          <FaUserCircle className="text-white text-xl flex-shrink-0" />
          <span className="text-xs font-medium text-white whitespace-nowrap">{username || "Guest"}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs px-2.5 py-1 bg-red-500 hover:bg-red-600 rounded-full font-medium transition whitespace-nowrap"
          style={{ lineHeight: '1rem' }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
