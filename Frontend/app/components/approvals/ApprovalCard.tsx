"use client";

import React from "react";
import { 
  CheckCircle2, 
  XCircle, 
  CalendarDays, 
  User, 
  FileText,
  Clock,
  Eye 
} from "lucide-react";
import { DesignApproval } from "@/app/lib/workflowApi";

interface ApprovalCardProps {
  approval: DesignApproval;
  onApprove: () => void;
  onReject: () => void;
  onPreview?: () => void;
  processing: boolean;
}

export default function ApprovalCard({ 
  approval, 
  onApprove, 
  onReject, 
  onPreview,
  processing 
}: ApprovalCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityBadge = () => {
    const hoursSinceSubmission = (Date.now() - new Date(approval.submitted_at).getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSubmission > 48) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full border border-red-200 animate-pulse">
          ⚠️ Overdue
        </span>
      );
    } else if (hoursSinceSubmission > 24) {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full border border-yellow-200">
          🔥 Urgent
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
          ✅ Normal
        </span>
      );
    }
  };

  const getFileIcon = (file: any) => {
    if (!file.name) return '📁';
    
    const name = file.name.toLowerCase();
    if (name.includes('pdf')) return '📄';
    if (name.includes('jpg') || name.includes('jpeg') || name.includes('png')) return '🖼️';
    if (name.includes('doc') || name.includes('docx')) return '📝';
    if (name.includes('ai')) return '🎨';
    if (name.includes('psd')) return '🖌️';
    if (name.includes('svg')) return '🔷';
    return '📁';
  };

  return (
    <div className="group bg-white rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 p-6 hover:border-blue-300 relative overflow-hidden">
      {/* Priority Badge */}
      <div className="absolute top-4 right-4">
        {getPriorityBadge()}
      </div>

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
          {approval.order_code}
        </h3>
        <p className="text-gray-600 font-medium text-lg">{approval.client_name}</p>
      </div>

      {/* Designer Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Designer</p>
          <p className="font-semibold text-gray-900">{approval.designer}</p>
        </div>
      </div>

      {/* Files Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <FileText className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">Design Files</p>
          <div className="flex items-center gap-2">
            <span className="font-bold text-purple-600">{approval.design_files_manifest.length}</span>
            <span className="text-gray-600">files</span>
            <div className="flex gap-1 ml-2">
              {approval.design_files_manifest.slice(0, 3).map((file: any, index: number) => (
                <span key={index} className="text-lg" title={file.name}>
                  {getFileIcon(file)}
                </span>
              ))}
              {approval.design_files_manifest.length > 3 && (
                <span className="text-xs text-gray-500">+{approval.design_files_manifest.length - 3}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Designer Notes Preview */}
      {approval.approval_notes && (
        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <h4 className="text-sm font-semibold text-green-800 mb-1 flex items-center gap-1">
            💬 Designer Notes:
          </h4>
          <p className="text-sm text-green-700 line-clamp-2 overflow-hidden">
            {approval.approval_notes}
          </p>
        </div>
      )}

      {/* Submitted Time */}
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <Clock className="w-4 h-4" />
        <span>Submitted {formatDate(approval.submitted_at)}</span>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Preview Button */}
        {onPreview && (
          <button
            onClick={onPreview}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview Files
          </button>
        )}

        {/* Decision Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onApprove}
            disabled={processing}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg group"
          >
            <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Approve
          </button>
          <button
            onClick={onReject}
            disabled={processing}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-400 disabled:to-red-500 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg group"
          >
            <XCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

