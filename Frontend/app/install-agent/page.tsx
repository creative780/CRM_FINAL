"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Download,
  Copy,
  CheckCircle,
  AlertTriangle,
  Monitor,
  Terminal,
  FileText,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface OSInfo {
  name: string;
  platform: string;
  installer: string;
  command: string;
}

const OS_DETECTION: Record<string, OSInfo> = {
  win: {
    name: "Windows",
    platform: "windows",
    installer: "crm-monitoring-agent.exe",
    command: "crm-monitoring-agent.exe --enroll-token",
  },
  mac: {
    name: "macOS",
    platform: "macos",
    installer: "agent-installer.pkg",
    command: "sudo installer -pkg agent-installer.pkg -target /",
  },
  linux: {
    name: "Linux",
    platform: "linux",
    installer: "agent-installer.sh",
    command: "chmod +x agent-installer.sh && ./agent-installer.sh",
  },
};

export default function InstallAgentPage() {
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
  const [enrollmentToken, setEnrollmentToken] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [installStep, setInstallStep] = useState<number>(0);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Detect OS from user agent
    const userAgent = navigator.userAgent.toLowerCase();
    let detectedOS: OSInfo | null = null;

    if (userAgent.includes("win")) {
      detectedOS = OS_DETECTION.win;
    } else if (userAgent.includes("mac")) {
      detectedOS = OS_DETECTION.mac;
    } else if (userAgent.includes("linux")) {
      detectedOS = OS_DETECTION.linux;
    }

    setOsInfo(detectedOS);

    // Get enrollment token from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token") || localStorage.getItem("enrollment_token");
    if (token) {
      setEnrollmentToken(token);
      localStorage.setItem("enrollment_token", token);
    }
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Install-agent page loaded');
    console.log('Current URL:', window.location.href);
    console.log('Enrollment token:', enrollmentToken);
  }, [enrollmentToken]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadInstaller = async () => {
    if (!osInfo) return;
    
    try {
      setError("");
      
      // Download from the backend API
      const downloadUrl = `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/agent/download${enrollmentToken ? `?token=${enrollmentToken}` : ''}`;
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'User-Agent': navigator.userAgent, // Send user agent for OS detection
        },
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      // Get the filename from the response headers or use the expected one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = osInfo.installer;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setInstallStep(1);
      
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const getInstallCommand = () => {
    if (!osInfo || !enrollmentToken) return "";
    return `${osInfo.command} "${enrollmentToken}"`;
  };

  const getInstallSteps = () => {
    if (!osInfo) return [];
    
    const steps = [
      {
        title: "Download Agent Installer",
        description: `Download the agent installer for ${osInfo.name}`,
        icon: Download,
        completed: installStep >= 1,
      },
      {
        title: "Run Installation Command",
        description: "Execute the installation command with your enrollment token",
        icon: Terminal,
        completed: installStep >= 2,
      },
      {
        title: "Agent Auto-Start",
        description: "The agent will automatically start and register with the server",
        icon: CheckCircle,
        completed: installStep >= 3,
      },
      {
        title: "Login Verification",
        description: "You can now log in to the web application",
        icon: Shield,
        completed: installStep >= 4,
      },
    ];
    
    return steps;
  };

  if (!osInfo) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unsupported Operating System</h2>
              <p className="text-gray-600">
                Your operating system is not currently supported. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple Header */}
      <div className="bg-[#891F1A] text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">CreativePrints</h1>
          <Button 
            variant="outline" 
            className="text-white border-white hover:bg-white hover:text-[#891F1A]"
            onClick={() => window.location.href = '/admin/login'}
          >
            Back to Login
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-[#891F1A]">Device Agent Installation</h1>
            <p className="text-gray-600">
              Install the monitoring agent to access the web application
            </p>
            <Badge variant="outline" className="text-sm">
              <Monitor className="h-4 w-4 mr-2" />
              Detected: {osInfo.name}
            </Badge>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}

          {/* Enrollment Token */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Enrollment Token
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={enrollmentToken}
                  onChange={(e) => setEnrollmentToken(e.target.value)}
                  placeholder="Your enrollment token will appear here..."
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(enrollmentToken)}
                  disabled={!enrollmentToken}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                This token is required to enroll your device with the monitoring system.
              </p>
            </CardContent>
          </Card>

          {/* Installation Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Installation Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getInstallSteps().map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      step.completed
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full ${
                        step.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Download Section */}
          <Card>
            <CardHeader>
              <CardTitle>Download Agent Installer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">{osInfo.installer}</h3>
                    <p className="text-sm text-gray-600">Agent installer for {osInfo.name}</p>
                  </div>
                </div>
                <Button onClick={downloadInstaller} className="bg-[#891F1A] hover:bg-[#6c1714]">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Command Line Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Command Line Installation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                For advanced users, you can install the agent using the command line:
              </p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Terminal</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(getInstallCommand())}
                    className="text-gray-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code>{getInstallCommand()}</code>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Installation Failed</h4>
                    <p className="text-sm text-gray-600">
                      Make sure you have administrator/sudo privileges and try running the installer again.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Agent Not Starting</h4>
                    <p className="text-sm text-gray-600">
                      The agent should start automatically. If it doesn't, restart your computer and try logging in again.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Still Can't Login</h4>
                    <p className="text-sm text-gray-600">
                      Contact your system administrator for assistance with device enrollment.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back to Login */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/admin/login"}
              className="bg-white border-[#891F1A] text-[#891F1A] hover:bg-[#891F1A]/10"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
