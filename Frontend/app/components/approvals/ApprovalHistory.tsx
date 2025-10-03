"use client";

import React from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  User,
  FileText,
  Eye,
  Download
} from "lucide-react";

interface ApprovalHistoryItem {
  id: number;
  order_code: string;
  client_name: string;
  designer: string;
  approval_status: 'approved' | 'rejected';
  approved_at?: string;
  rejection_reason?: string;
  design_files_count: number;
  design_files_manifest: any[];
}

interface ApprovalHistoryProps {
  approvals: ApprovalHistoryItem[];
  onViewDetails?: (approval: ApprovalHistoryItem) => void;
  onViewFiles?: (approval: ApprovalHistoryItem) => void;
}

export default function ApprovalHistory({ 
  approvals, 
  onViewDetails, 
  onViewFiles 
}: ApprovalHistoryProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: 'approved' | 'rejected') => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full border border-green-200">
          <CheckCircle2 className="w-4 h-4" />
          Approved
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full border border-red-200">
          <XCircle className="w-4 h-4" />
          Rejected
        </span>
      );
    }
  };

  const getFileIcons = (files: any[]) => {
    const icons = files.slice(0, 4).map((file: any, index: number) => {
      const name = file.name?.toLowerCase() || '';
      if (name.includes('pdf')) return '📄';
      if (name.includes('jpg') || name.includes('jpeg') || name.includes('png')) return '🖼️';
      if (name.includes('doc') || name.includes('docx')) return '📝';
      if (name.includes('ai')) return '🎨';
      if (name.includes('psd')) return '🖌️';
      return '📁';
    });
    
    return (
      <div className="flex gap-1">
        {icons.map((icon, index) => (
          <span key={index} className="text-lg" title={files[index]?.name}>
            {icon}
          </span>
        ))}
        {files.length > 4 && (
          <span className="text-sm text-gray-500">+{files.length - 4}</span>
        )}
      </div>
    );
  };

  if (approvals.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Approval History</h3>
        <p className="text-gray-600">You haven't reviewed any designs yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Recent Approval History
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {approvals.map((approval) => (
            <div key={approval.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {approval.order_code}
                  </h4>
                  {getStatusBadge(approval.approval_status)}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {approval.approved_at && formatDate(approval.approved_at)}
                  </span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500">Client:</span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{approval.client_name}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500">Designer:</span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{approval.designer}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500">Files:</span>
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {approval.design_files_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* File Icons */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-gray-500">Files:</span>
                {getFileIcons(approval.design_files_manifest)}
              </div>

              {/* Rejection Reason */}
              {approval.approval_status === 'rejected' && approval.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <h5 className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</h5>
                  <p className="text-sm text-red-700 line-clamp-2">
                    {approval.rejection_reason}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(approval)}
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                )}
                
                {onViewFiles && (
                  <button
                    onClick={() => onViewFiles(approval)}
                    className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Preview Files
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {approvals.filter(a => a.approval_status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {approvals.filter(a => a.approval_status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {approvals.length}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((approvals.filter(a => a.approval_status === 'approved').length / approvals.length) * 100)}%
            </div>
            <div className="text-sm text-gray-600">Approval Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
