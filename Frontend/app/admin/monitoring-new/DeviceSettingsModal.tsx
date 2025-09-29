"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  Monitor, 
  Clock, 
  Camera, 
  Activity, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { getToken } from "@/lib/auth";

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
  current_user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

interface DeviceSettingsModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (deviceId: string, settings: any) => void;
}

export default function DeviceSettingsModal({ 
  device, 
  isOpen, 
  onClose, 
  onSave 
}: DeviceSettingsModalProps) {
  const [settings, setSettings] = useState({
    screenshot_freq_sec: 15,
    heartbeat_freq_sec: 20,
    auto_start: true,
    debug_mode: false,
    pause_monitoring: false,
    max_screenshot_storage_days: 30,
    keystroke_monitoring: true,
    mouse_click_monitoring: true,
    productivity_tracking: true,
    idle_detection: true,
    idle_threshold_minutes: 30,
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load device settings when modal opens
  useEffect(() => {
    if (isOpen && device) {
      loadDeviceSettings();
    }
  }, [isOpen, device]);

  const loadDeviceSettings = async () => {
    if (!device) return;

    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(`${API_BASE}/api/admin/devices/${device.id}/config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setSettings({
        screenshot_freq_sec: getNumericValue(data.screenshot_freq_sec, 15),
        heartbeat_freq_sec: getNumericValue(data.heartbeat_freq_sec, 20),
        auto_start: data.auto_start ?? true,
        debug_mode: data.debug_mode ?? false,
        pause_monitoring: data.pause_monitoring ?? false,
        max_screenshot_storage_days: getNumericValue(data.max_screenshot_storage_days, 30),
        keystroke_monitoring: data.keystroke_monitoring ?? true,
        mouse_click_monitoring: data.mouse_click_monitoring ?? true,
        productivity_tracking: data.productivity_tracking ?? true,
        idle_detection: data.idle_detection ?? true,
        idle_threshold_minutes: getNumericValue(data.idle_threshold_minutes, 30),
      });
    } catch (err) {
      console.error("Failed to load device settings:", err);
      setError("Failed to load device settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!device) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(`${API_BASE}/api/admin/devices/${device.id}/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setSuccess("Settings saved successfully");
      onSave(device.id, settings);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to save device settings:", err);
      setError("Failed to save device settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Helper function to safely get numeric values
  const getNumericValue = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || isNaN(value)) {
      return defaultValue;
    }
    return Number(value);
  };

  if (!device) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Device Settings - {device.hostname}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#891F1A] mx-auto mb-4" />
              <p className="text-gray-600">Loading settings...</p>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!loading && (
          <div className="space-y-6">
            {/* Device Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Device Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Hostname</Label>
                    <p className="text-sm text-gray-600">{device.hostname}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">OS</Label>
                    <p className="text-sm text-gray-600">{device.os}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Agent Version</Label>
                    <p className="text-sm text-gray-600">{device.agent_version}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={device.status === 'ONLINE' ? 'default' : 'secondary'}>
                      {device.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monitoring Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Monitoring Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="screenshot_freq">Screenshot Frequency (seconds)</Label>
                    <Input
                      id="screenshot_freq"
                      type="number"
                      min="5"
                      max="300"
                      value={getNumericValue(settings.screenshot_freq_sec, 15)}
                      onChange={(e) => handleSettingChange('screenshot_freq_sec', parseInt(e.target.value) || 15)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="heartbeat_freq">Heartbeat Frequency (seconds)</Label>
                    <Input
                      id="heartbeat_freq"
                      type="number"
                      min="10"
                      max="300"
                      value={getNumericValue(settings.heartbeat_freq_sec, 20)}
                      onChange={(e) => handleSettingChange('heartbeat_freq_sec', parseInt(e.target.value) || 20)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Keystroke Monitoring</Label>
                      <p className="text-sm text-gray-600">Track keyboard activity</p>
                    </div>
                    <Switch
                      checked={settings.keystroke_monitoring}
                      onCheckedChange={(checked) => handleSettingChange('keystroke_monitoring', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mouse Click Monitoring</Label>
                      <p className="text-sm text-gray-600">Track mouse activity</p>
                    </div>
                    <Switch
                      checked={settings.mouse_click_monitoring}
                      onCheckedChange={(checked) => handleSettingChange('mouse_click_monitoring', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Productivity Tracking</Label>
                      <p className="text-sm text-gray-600">Calculate productivity scores</p>
                    </div>
                    <Switch
                      checked={settings.productivity_tracking}
                      onCheckedChange={(checked) => handleSettingChange('productivity_tracking', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Idle Detection</Label>
                      <p className="text-sm text-gray-600">Detect and alert on idle periods</p>
                    </div>
                    <Switch
                      checked={settings.idle_detection}
                      onCheckedChange={(checked) => handleSettingChange('idle_detection', checked)}
                    />
                  </div>
                </div>

                {settings.idle_detection && (
                  <div>
                    <Label htmlFor="idle_threshold">Idle Threshold (minutes)</Label>
                    <Input
                      id="idle_threshold"
                      type="number"
                      min="5"
                      max="120"
                      value={getNumericValue(settings.idle_threshold_minutes, 30)}
                      onChange={(e) => handleSettingChange('idle_threshold_minutes', parseInt(e.target.value) || 30)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Start</Label>
                      <p className="text-sm text-gray-600">Start agent automatically on system boot</p>
                    </div>
                    <Switch
                      checked={settings.auto_start}
                      onCheckedChange={(checked) => handleSettingChange('auto_start', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Debug Mode</Label>
                      <p className="text-sm text-gray-600">Enable detailed logging</p>
                    </div>
                    <Switch
                      checked={settings.debug_mode}
                      onCheckedChange={(checked) => handleSettingChange('debug_mode', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Pause Monitoring</Label>
                      <p className="text-sm text-gray-600">Temporarily stop all monitoring</p>
                    </div>
                    <Switch
                      checked={settings.pause_monitoring}
                      onCheckedChange={(checked) => handleSettingChange('pause_monitoring', checked)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="storage_days">Screenshot Storage (days)</Label>
                  <Input
                    id="storage_days"
                    type="number"
                    min="1"
                    max="365"
                    value={getNumericValue(settings.max_screenshot_storage_days, 30)}
                    onChange={(e) => handleSettingChange('max_screenshot_storage_days', parseInt(e.target.value) || 30)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

