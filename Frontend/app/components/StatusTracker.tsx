"use client";

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Calendar,
  User,
  Package,
  Truck,
  CheckSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StatusTrackingData {
  order_id: number;
  order_code: string;
  current_status: string;
  current_stage: string;
  progress: {
    percentage: number;
    stage: string;
    status: string;
  };
  next_actions: Array<{
    action: string;
    label: string;
    description: string;
    required_role: string;
  }>;
  timeline: Array<{
    status: string;
    label: string;
    timestamp: string | null;
    completed: boolean;
    current: boolean;
  }>;
  last_updated: string;
  estimated_completion: string | null;
}

interface StatusTrackerProps {
  orderId: number;
  className?: string;
}

const StatusTracker: React.FC<StatusTrackerProps> = ({ orderId, className = "" }) => {
  const [trackingData, setTrackingData] = useState<StatusTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatusTracking();
  }, [orderId]);

  const fetchStatusTracking = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`http://127.0.0.1:8000/api/orders/${orderId}/status-tracking/`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status tracking data');
      }

      const data = await response.json();
      setTrackingData(data);
    } catch (err: any) {
      console.error('Failed to fetch status tracking:', err);
      setError(err.message);
      toast.error('Failed to load status tracking');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string, completed: boolean, current: boolean) => {
    if (completed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (current) {
      return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
    } else {
      return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: string, completed: boolean, current: boolean) => {
    if (completed) {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (current) {
      return 'text-blue-600 bg-blue-50 border-blue-200';
    } else {
      return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not started';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstimatedTime = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `In ${diffDays} days`;
    }
  };

  if (loading) {
    return (
      <div className={`p-6 border rounded-lg bg-white ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className={`p-6 border rounded-lg bg-white ${className}`}>
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>Failed to load status tracking</p>
          <button 
            onClick={fetchStatusTracking}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 border rounded-lg bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Order Status Tracking
          </h3>
          <p className="text-sm text-gray-500">
            {trackingData.order_code} • Last updated: {formatDate(trackingData.last_updated)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {trackingData.progress.percentage}%
          </div>
          <div className="text-sm text-gray-500">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${trackingData.progress.percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Started</span>
          <span>Completed</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Order Timeline</h4>
        <div className="space-y-3">
          {trackingData.timeline.map((item, index) => (
            <div key={item.status} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(item.status, item.completed, item.current)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${getStatusColor(item.status, item.completed, item.current)}`}>
                  {item.label}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(item.timestamp)}
                </div>
              </div>
              {index < trackingData.timeline.length - 1 && (
                <div className="flex-shrink-0 ml-2">
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Next Actions */}
      {trackingData.next_actions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Next Actions</h4>
          <div className="space-y-2">
            {trackingData.next_actions.map((action, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0">
                  <CheckSquare className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-900">
                    {action.label}
                  </div>
                  <div className="text-xs text-blue-700">
                    {action.description}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {action.required_role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estimated Completion */}
      {trackingData.estimated_completion && (
        <div className="border-t pt-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Estimated completion: {getEstimatedTime(trackingData.estimated_completion)}</span>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-4 text-center">
        <button
          onClick={fetchStatusTracking}
          className="text-sm text-blue-600 hover:underline"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default StatusTracker;


