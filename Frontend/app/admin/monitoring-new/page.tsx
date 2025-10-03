"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Monitor, Activity, Clock, Search, Filter, AlertTriangle,
  ChevronLeft, ChevronRight, Trash2, Lock, Eye, Settings,
  RefreshCw, Pause, Play, Download, MoreHorizontal, TrendingUp,
  BarChart3, PieChart
} from "lucide-react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { getToken } from "@/lib/auth";
import { useMonitoringWebSocket } from "@/lib/websocket";
import DeviceSettingsModal from "./DeviceSettingsModal";
import AnalyticsDashboard from "./AnalyticsDashboard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

interface Device {
  id: string;
  hostname: string;
  os: string;
  agent_version: string;
  status: 'ONLINE' | 'OFFLINE' | 'IDLE' | 'PAUSED';
  ip?: string;
  enrolled_at: string;
  last_heartbeat?: string;
  screenshot_freq_sec: number;
  user: {
    id: string;
    email: string;
    name: string;
  };
  org?: {
    id: string;
    name: string;
  };
  // Current user binding
  current_user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  current_user_name?: string;
  current_user_role?: string;
  last_user_bind_at?: string;
  latest_thumb?: string;
  latest_heartbeat?: {
    cpu_percent: number;
    mem_percent: number;
    active_window?: string;
    is_locked: boolean;
    created_at: string;
  };
  latest_screenshot?: {
    thumb_url: string;
    taken_at: string;
  };
}

export default function MonitoringDashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [osFilter, setOsFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [dateRange, setDateRange] = useState("24h");
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [selectedScreenshots, setSelectedScreenshots] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsDevice, setSettingsDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState<'devices' | 'analytics'>('devices');

  // WebSocket connection for real-time updates
  const { ws, isConnected, error: wsError } = useMonitoringWebSocket();

  // Fetch devices with enhanced data
  const fetchDevices = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (osFilter !== "all") params.append("os", osFilter);
      if (orgFilter !== "all") params.append("org", orgFilter);
      if (searchTerm) params.append("q", searchTerm);

      // Fetch devices
      const devicesResponse = await fetch(`${API_BASE}/api/admin/devices?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!devicesResponse.ok) {
        throw new Error(`HTTP ${devicesResponse.status}`);
      }

      const devicesData = await devicesResponse.json();
      setDevices(devicesData.devices || []);

      // Fetch activity data
      const activityResponse = await fetch(`${API_BASE}/api/admin/employee-activity`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivityData(activityData.employees || []);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch devices");
    } finally {
      setLoading(false);
    }
  };

  // Fetch device details
  const fetchDeviceDetails = async (deviceId: string) => {
    try {
      const token = getToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE}/api/admin/devices/${deviceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error("Failed to fetch device details:", err);
      return null;
    }
  };

  // Fetch screenshots for a device
  const fetchScreenshots = async (deviceId: string) => {
    try {
      const token = getToken();
      if (!token) return [];

      const params = new URLSearchParams();
      params.append("device_id", deviceId);
      params.append("limit", "50");

      const response = await fetch(`${API_BASE}/api/admin/screenshots?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.screenshots || [];
    } catch (err) {
      console.error("Failed to fetch screenshots:", err);
      return [];
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [statusFilter, osFilter, orgFilter, searchTerm, dateRange]);

  // WebSocket event handlers for real-time updates
  useEffect(() => {
    if (!ws) return;

    const unsubscribeHeartbeat = ws.subscribe('heartbeat_update', (data) => {
      setDevices(prevDevices => 
        prevDevices.map(device => 
          device.id === data.device_id 
            ? {
                ...device,
                latest_heartbeat: {
                  ...device.latest_heartbeat,
                  cpu_percent: data.heartbeat.cpu_percent,
                  mem_percent: data.heartbeat.mem_percent,
                  active_window: data.heartbeat.active_window,
                  is_locked: data.heartbeat.is_locked,
                  created_at: data.heartbeat.timestamp,
                }
              }
            : device
        )
      );
    });

    const unsubscribeScreenshot = ws.subscribe('screenshot_update', (data) => {
      setDevices(prevDevices => 
        prevDevices.map(device => 
          device.id === data.device_id 
            ? {
                ...device,
                latest_screenshot: {
                  thumb_url: data.screenshot.thumb_url,
                  taken_at: data.screenshot.taken_at,
                }
              }
            : device
        )
      );
    });

    const unsubscribeStatusChange = ws.subscribe('device_status_change', (data) => {
      setDevices(prevDevices => 
        prevDevices.map(device => 
          device.id === data.device_id 
            ? { ...device, status: data.status }
            : device
        )
      );
    });

    return () => {
      unsubscribeHeartbeat();
      unsubscribeScreenshot();
      unsubscribeStatusChange();
    };
  }, [ws]);

  // Handle device selection and fetch details
  const handleDeviceSelect = async (device: Device) => {
    setSelectedDevice(device);
    const details = await fetchDeviceDetails(device.id);
    if (details) {
      setSelectedDevice({ ...device, ...details });
    }
  };

  // Handle screenshot gallery
  const handleViewScreenshots = async (deviceId: string) => {
    const screenshots = await fetchScreenshots(deviceId);
    setSelectedScreenshots(screenshots);
    setShowScreenshotModal(true);
  };

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesSearch = 
        device.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.user?.email && device.user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (device.user?.name && device.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (device.current_user_name && device.current_user_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  }, [devices, searchTerm]);

  // Device settings handlers
  const handleOpenSettings = (device: Device) => {
    setSettingsDevice(device);
    setShowSettingsModal(true);
  };

  const handleCloseSettings = () => {
    setShowSettingsModal(false);
    setSettingsDevice(null);
  };

  const handleSaveSettings = (deviceId: string, settings: any) => {
    // Update device in the list with new settings
    setDevices(prevDevices =>
      prevDevices.map(device =>
        device.id === deviceId
          ? { ...device, ...settings }
          : device
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-500';
      case 'IDLE': return 'bg-yellow-500';
      case 'OFFLINE': return 'bg-gray-500';
      case 'PAUSED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'Online';
      case 'IDLE': return 'Idle';
      case 'OFFLINE': return 'Offline';
      case 'PAUSED': return 'Paused';
      default: return status;
    }
  };

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return "Never";
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#891F1A]" />
            <p className="text-gray-600">Loading devices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#891F1A]">Device Monitoring</h1>
            <p className="text-gray-600">Monitor connected devices and their activity</p>
          </div>
          <div className="flex items-center gap-2">
            {/* WebSocket connection status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={fetchDevices}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'devices' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('devices')}
            className="flex items-center gap-2"
          >
            <Monitor className="h-4 w-4" />
            Devices
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('analytics')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Enhanced Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#891F1A]">{devices.length}</div>
              <p className="text-xs text-muted-foreground">
                {activityData.length} active in last 24h
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {devices.filter(d => d.status === 'ONLINE').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((devices.filter(d => d.status === 'ONLINE').length / Math.max(1, devices.length)) * 100)}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Idle</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {devices.filter(d => d.status === 'IDLE').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Screen locked or inactive
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CPU Usage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {devices.length > 0 
                  ? Math.round(devices.reduce((sum, d) => sum + (d.latest_heartbeat?.cpu_percent || 0), 0) / devices.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Across all devices
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Productivity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {devices.length > 0 
                  ? Math.round(devices.reduce((sum, d) => sum + ((d.latest_heartbeat as any)?.productivity_score || 0), 0) / devices.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Across all devices
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Overview Charts */}
        {activityData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  24h Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityData.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {activity.user_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{activity.user_name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500">{activity.device_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{activity.total_heartbeats_24h} heartbeats</p>
                        <p className="text-xs text-gray-500">{activity.total_screenshots_24h} screenshots</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {devices.filter(d => d.latest_heartbeat).slice(0, 5).map((device, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{device.hostname}</span>
                        <span className="text-gray-500">
                          CPU: {device.latest_heartbeat?.cpu_percent.toFixed(1)}% | 
                          RAM: {device.latest_heartbeat?.mem_percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-8">CPU</span>
                          <Progress 
                            value={device.latest_heartbeat?.cpu_percent || 0} 
                            className="flex-1 h-2"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-8">RAM</span>
                          <Progress 
                            value={device.latest_heartbeat?.mem_percent || 0} 
                            className="flex-1 h-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search devices, users, or hostnames..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="IDLE">Idle</SelectItem>
                <SelectItem value="OFFLINE">Offline</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={osFilter} onValueChange={setOsFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="OS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OS</SelectItem>
                <SelectItem value="Windows">Windows</SelectItem>
                <SelectItem value="macOS">macOS</SelectItem>
                <SelectItem value="Linux">Linux</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'devices' && (
          <>
            {/* Device Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDevices.map((device) => (
            <Card key={device.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={`/placeholder.svg?height=40&width=40&query=${device.user?.name || 'Unknown'}`} />
                        <AvatarFallback>
                          {device.user?.name ? device.user.name.split(' ').map(n => n[0]).join('') : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(device.status)}`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{device.hostname}</h3>
                        {/* Phase 2: Idle Alert Indicator */}
                        {(device.latest_heartbeat as any)?.idle_alert && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-xs text-orange-600 font-medium">IDLE</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {device.current_user_name || device.user?.name || 'No User'}
                      </p>
                      {device.current_user_role && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {device.current_user_role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-white text-xs ${
                    device.status === 'ONLINE' ? 'bg-green-500' :
                    device.status === 'IDLE' ? 'bg-yellow-500' :
                    device.status === 'OFFLINE' ? 'bg-gray-500' : 'bg-red-500'
                  }`}>
                    {getStatusText(device.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Screenshot */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Latest Screenshot</span>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(device.latest_screenshot?.taken_at)}
                    </span>
                  </div>
                          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            {device.latest_thumb ? (
                              <img
                                src={`${API_BASE}/api/files/${device.latest_thumb}`}
                                alt="Latest screenshot"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Monitor className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                </div>

                {/* System Info */}
                {device.latest_heartbeat && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">CPU Usage</span>
                      <span className="text-sm font-bold">{device.latest_heartbeat.cpu_percent.toFixed(1)}%</span>
                    </div>
                    <Progress value={device.latest_heartbeat.cpu_percent} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm font-bold">{device.latest_heartbeat.mem_percent.toFixed(1)}%</span>
                    </div>
                    <Progress value={device.latest_heartbeat.mem_percent} className="h-2" />
                  </div>
                )}

                {/* Phase 2: Productivity Metrics */}
                {device.latest_heartbeat && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Productivity Score</span>
                      <span className="text-sm font-bold text-green-600">
                        {(device.latest_heartbeat as any).productivity_score?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                    <Progress 
                      value={(device.latest_heartbeat as any).productivity_score || 0} 
                      className="h-2" 
                    />
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Keystrokes:</span>
                        <span className="font-medium">{(device.latest_heartbeat as any).keystroke_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clicks:</span>
                        <span className="font-medium">{(device.latest_heartbeat as any).mouse_click_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Time:</span>
                        <span className="font-medium">{(device.latest_heartbeat as any).active_time_minutes?.toFixed(1) || '0.0'}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Session:</span>
                        <span className="font-medium">{(device.latest_heartbeat as any).session_duration_minutes?.toFixed(1) || '0.0'}m</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Device Info */}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>OS:</span>
                    <span>{device.os}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Agent:</span>
                    <span>{device.agent_version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IP:</span>
                    <span>{device.ip || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Heartbeat:</span>
                    <span>{formatTimeAgo(device.last_heartbeat)}</span>
                  </div>
                </div>

                {/* Active Window */}
                {device.latest_heartbeat && (
                  <div className="bg-gray-50 p-2 rounded text-xs">
                    <span className="text-gray-500">Active:</span> {device.latest_heartbeat.active_window || 'Unknown'}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDeviceSelect(device)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewScreenshots(device.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenSettings(device)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

            {filteredDevices.length === 0 && (
              <div className="text-center py-12">
                <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No devices found</h3>
                <p className="text-gray-500">
                  {devices.length === 0 
                    ? "No devices have been enrolled yet."
                    : "Try adjusting your search filters."
                  }
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}

        {/* Device Detail Modal */}
        {selectedDevice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#891F1A]">
                    {selectedDevice.hostname} - Device Details
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDevice(null)}
                  >
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Device Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Hostname:</span>
                        <span>{selectedDevice.hostname}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">OS:</span>
                        <span>{selectedDevice.os}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Agent Version:</span>
                        <span>{selectedDevice.agent_version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">IP Address:</span>
                        <span>{selectedDevice.ip || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        <Badge className={`text-white ${
                          selectedDevice.status === 'ONLINE' ? 'bg-green-500' :
                          selectedDevice.status === 'IDLE' ? 'bg-yellow-500' :
                          selectedDevice.status === 'OFFLINE' ? 'bg-gray-500' : 'bg-red-500'
                        }`}>
                          {getStatusText(selectedDevice.status)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* User Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Current User</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Name:</span>
                        <span>{selectedDevice.current_user?.name || selectedDevice.current_user_name || selectedDevice.user?.name || 'No User'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Email:</span>
                        <span>{selectedDevice.current_user?.email || selectedDevice.user?.email || 'No Email'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Role:</span>
                        <span>{selectedDevice.current_user?.role || selectedDevice.current_user_role || 'No Role'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Last Heartbeat:</span>
                        <span>{formatTimeAgo(selectedDevice.last_heartbeat)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                {(selectedDevice as any).heartbeats && (selectedDevice as any).heartbeats.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Recent Activity (Last 10 Heartbeats)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(selectedDevice as any).heartbeats.slice(0, 10).map((heartbeat: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <span className="text-sm font-medium">
                                {new Date(heartbeat.created_at).toLocaleTimeString()}
                              </span>
                              {heartbeat.active_window && (
                                <div className="text-xs text-gray-600">
                                  {heartbeat.active_window}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span>CPU: {heartbeat.cpu_percent.toFixed(1)}%</span>
                              <span>RAM: {heartbeat.mem_percent.toFixed(1)}%</span>
                              {heartbeat.is_locked && (
                                <Badge variant="outline" className="text-xs">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Locked
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Screenshot Gallery Modal */}
        {showScreenshotModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#891F1A]">
                    Screenshot Gallery
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setShowScreenshotModal(false)}
                  >
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedScreenshots.map((screenshot: any, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={`${API_BASE}/api/files/${screenshot.thumb_key}`}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(`${API_BASE}/api/files/${screenshot.blob_key}`, '_blank')}
                      />
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {new Date(screenshot.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedScreenshots.length === 0 && (
                  <div className="text-center py-12">
                    <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No screenshots available for this device.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Device Settings Modal */}
        <DeviceSettingsModal
          device={settingsDevice}
          isOpen={showSettingsModal}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
        />
      </div>
    </div>
  );
}


