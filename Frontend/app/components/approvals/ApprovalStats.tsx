"use client";

import React from "react";
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  TrendingUp,
  Calendar
} from "lucide-react";

interface ApprovalStatsProps {
  total: number;
  normal: number;
  urgent: number;
  overdue: number;
  completionRate?: number;
  avgResponseTime?: string;
}

export default function ApprovalStats({
  total,
  normal,
  urgent,
  overdue,
  completionRate = 89,
  avgResponseTime = "2.3h"
}: ApprovalStatsProps) {
  const getProgressWidth = (value: number, total: number) => {
    return total === 0 ? 0 : (value / total) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Pending</p>
              <p className="text-3xl font-bold">{total}</p>
            </div>
          </div>
          <div className="mt-4 text-blue-100 text-xs">
            Waiting for review
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="privileges-green-100 text-sm font-medium">Normal</p>
              <p className="text-3xl font-bold">{normal}</p>
            </div>
          </div>
          <div className="mt-4 text-green-100 text-xs">
            &lt; 24 hours old
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="privileges-yellow-100 text-sm font-medium">Urgent</p>
              <p className="text-3xl font-bold">{urgent}</p>
            </div>
          </div>
          <div className="mt-4 text-yellow-100 text-xs">
            24-48 hours old
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="privileges-red-100 text-sm font-medium">Overdue</p>
              <p className="text-3xl font-bold">{overdue}</p>
            </div>
          </div>
          <div className="mt-4 text-red-100 text-xs">
            &gt; 48 hours old
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Completion Rate */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Completion Rate</h3>
                <p className="text-sm text-gray-600">This month</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-blue-600">{completionRate}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Excellent</span>
            <span>Target: 85%</span>
          </div>
        </div>

        {/* Average Response Time */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Avg Response Time</h3>
                <p className="text-sm text-gray-600">&lt; 2.5h target</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-green-600">{avgResponseTime}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Target</span>
              <span className="font-medium">2.5h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `85%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Fast</span>
              <span>Perfect</span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Distribution */}
      {total > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <div className="space-y-3">
            {/* Normal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Normal</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressWidth(normal, total)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">{normal}</span>
              </div>
            </div>

            {/* Urgent */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Urgent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressWidth(urgent, total)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">{urgent}</span>
              </div>
            </div>

            {/* Overdue */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Overdue</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressWidth(overdue, total)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">{overdue}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

