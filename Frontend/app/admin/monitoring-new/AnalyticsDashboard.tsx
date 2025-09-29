"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, TrendingUp, Users, Activity, Clock, 
  Monitor, MousePointer, Keyboard, PieChart, 
  Calendar, RefreshCw, Download, Filter
} from "lucide-react";
import { getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

interface AnalyticsData {
  overview: {
    total_devices: number;
    active_devices: number;
    online_devices: number;
    idle_devices: number;
    offline_devices: number;
  };
  activity_24h: {
    total_keystrokes: number;
    total_clicks: number;
    avg_productivity: number;
    total_screenshots: number;
  };
  top_applications: Array<{
    active_window: string;
    count: number;
  }>;
  productivity_trends: Array<{
    day: string;
    avg_productivity: number;
    total_keystrokes: number;
    total_clicks: number;
  }>;
}

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("24h");
  const [selectedMetric, setSelectedMetric] = useState("productivity");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(`${API_BASE}/api/admin/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getProductivityBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    if (score >= 40) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#891F1A]" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="text-red-500">⚠️</div>
          <p className="text-red-700">{error}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchAnalytics}
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#891F1A]">Analytics Dashboard</h2>
          <p className="text-gray-600">Monitor system performance and usage patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.total_devices}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.overview.active_devices} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.overview.online_devices}
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.overview.idle_devices} idle, {analyticsData.overview.offline_devices} offline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keystrokes</CardTitle>
            <Keyboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(analyticsData.activity_24h.total_keystrokes)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(analyticsData.activity_24h.total_clicks)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Productivity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getProductivityColor(analyticsData.activity_24h.avg_productivity)}`}>
                {analyticsData.activity_24h.avg_productivity.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Average Productivity</p>
              <Badge className={getProductivityBadgeColor(analyticsData.activity_24h.avg_productivity)}>
                {analyticsData.activity_24h.avg_productivity >= 80 ? 'Excellent' : 
                 analyticsData.activity_24h.avg_productivity >= 60 ? 'Good' : 
                 analyticsData.activity_24h.avg_productivity >= 40 ? 'Fair' : 'Poor'}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {analyticsData.activity_24h.total_screenshots}
              </div>
              <p className="text-sm text-gray-600">Screenshots Captured</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {analyticsData.overview.active_devices}
              </div>
              <p className="text-sm text-gray-600">Active Devices</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Top Applications (Last 24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.top_applications.slice(0, 10).map((app, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{app.active_window}</p>
                    <p className="text-sm text-gray-600">{app.count} sessions</p>
                  </div>
                </div>
                <Badge variant="secondary">{app.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Productivity Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Productivity Trends (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.productivity_trends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">
                    {new Date(trend.day).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {trend.avg_productivity.toFixed(1)}% productivity
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatNumber(trend.total_keystrokes)} keystrokes, {formatNumber(trend.total_clicks)} clicks
                    </p>
                  </div>
                  <div className="w-20">
                    <Progress 
                      value={trend.avg_productivity} 
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

