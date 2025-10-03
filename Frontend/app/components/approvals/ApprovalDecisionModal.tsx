"use client";

import React, { useEffect, useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  FileText, 
  User, 
  CalendarDays, 
  AlertCircle,
  Download,
  ExternalLink,
  Clock,
  Zap
} from "lucide-react";
import { DesignApproval } from "@/app/lib/workflowApi";
import DesignFilePreview from "@/app/components/DesignFilePreview";

interface ApprovalDecisionModalProps {
  approval: DesignApproval | null;
  isOpen: boolean;
  onClose: () => void;
  onDecision: (action: 'approve' | 'reject', reason?: string) => void;
  processing: boolean;
}

export default function ApprovalDecisionModal({
  approval, 
  isOpen, 
  onClose, 
  onDecision, 
  processing 
}: ApprovalDecisionModalProps) {
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setShowRejectForm(false);
      setSelectedAction(null);
    }
  }, [isOpen]);

  const handleAction = (action: 'approve' | 'reject') => {
    setSelectedAction(action);
    
    if (action === 'approve') {
      onDecision('approve');
    } else {
      setShowRejectForm(true);
    }
  };

  const handleSubmit = () => {
    if (selectedAction === 'reject' && !reason.trim()) {
      return;
    }
    
    onDecision(selectedAction!, reason);
  };

  if (!approval) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilePreview = () => {
    // Transform design files for preview
    const files = approval.design_files_manifest.map((file: any) => ({
      name: file.name || 'Unknown File',
      size: file.size || 0,
      type: file.type || 'application/octet-stream',
      url: file.url || null,
      blob: null,
      content: null,
      id: null,
      order_file_id: null,
      lastModified: Date.now()
    }));
    
    // Open file preview modal
    const previewEvent = new CustomEvent('open-design-file-preview', { 
      detail: { files, orderId: approval.order } 
    });
    window.dispatchEvent(previewEvent);
  };

  const getFileIcon = (file: any) => {
    if (!file.name) return '📁';
    
    const name = file.name.toLowerCase();
    if (name.includes('pdf')) return '📄';
    if (name.includes('jpg') || name.includes('jpeg') || name.includes('png')) return '🖼️';
    if (name.includes('doc') || name.includes('docx')) return '📝';
    if (name.contains('ai')) return '🎨';
    if (name.contains('psd')) return '🖌️';
    if (name.contains('svg')) return '🔷';
    return '📁';
  };

  const getTimeUntilDeadline = () => {
    const hoursSinceSubmission = (Date.now() - new Date(approval.submitted_at).getTime()) / (1000 * 60 * 60);
    const hoursLeft = 48 - hoursSinceSubmission;
    
    if (hoursLeft <= 0) {
      return <span className="text-red-600 font-semibold">Overdue</span>;
    } else if (hoursLeft <= 24) {
      return <span className="text-yellow-600 font-semibold">{Math.round(hoursLeft)}h left</span>;
    } else {
      return <span className="text-green-600 font-semibold">{Math.round(hoursLeft)}h left</span>;
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${isOpen ? 'flex' : 'hidden'} items-center justify-center p-4`}>
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                Design Approval - {approval.order_code}
              </h2>
              <p className="text-blue-100 mt-1">Review design files and make decision</p>
            </div>
            <button
              onClick={onClose}
              disabled={processing}
              className="text-white hover:text-gray-200 text-3xl font-bold transition-colors disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Summary Card */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-600" />
              Order Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <span className="font-medium text-gray-600">Client:</span>
                    <span className="ml-2 text-gray-900 font-semibold">{approval.client_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div>
                    <span className="font-medium text-gray-600">Designer:</span>
                    <span className="ml-2 text-gray-900 font-semibold">{approval.designer}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <span className="font-medium text-gray-600">Submitted:</span>
                    <span className="ml-2 text-gray-900 font-semibold">{formatDate(approval.submitted_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <span className="font-medium text-gray-600">Sales Person:</span>
                    <span className="ml-2 text-gray-900 font-semibold">{approval.sales_person}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* SLA Tracker */}
            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Approval Deadline:</span>
                {getTimeUntilDeadline()}
              </div>
            </div>
          </div>

          {/* Designer Notes */}
          {approval.approval_notes && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <h3 className="text-xl font-semibold text-green-900 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-green-600" />
                Designer Notes & Context
              </h3>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-green-800 whitespace-pre-wrap leading-relaxed">
                  {approval.approval_notes}
                </p>
              </div>
            </div>
          )}

          {/* Design Files Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-purple-900 flex items-center gap-2">
                <Eye className="w-6 h-6 text-purple-600" />
                Design Files ({approval.design_files_manifest.length})
              </h3>
              <button 
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
                onClick={handleFilePreview}
              >
                <Eye className="w-4 h-4" />
                Preview All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approval.design_files_manifest.map((file: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                  <div className="text-2xl">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-purple-900 truncate">
                      {file.name || `File ${index + 1}`}
                    </p>
                    <p className="text-sm text-purple-600">
                      {file.size ? `${Math.round(file.size / 1024)} KB` : 'Unknown size'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 text-gray-400 hover:text-purple-600 transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-purple-600 transition-colors" title="View">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Section */}
          {!showRejectForm ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                Make Your Decision
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={processing}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-green-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  Approve Design
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={processing}
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-red-400 disabled:to-red-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100"
                >
                  <XCircle className="w-6 h-6" />
                  Reject Design
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
              <h3 className="text-xl font-semibold text-red-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-600" />
                Provide Rejection Reason
              </h3>
              <p className="text-red-700 mb-4 text-sm bg-red-100 p-3 rounded-lg border border-red-200">
                Please explain exactly why you are rejecting this design. Your feedback will help the designer make appropriate improvements.
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter detailed feedback for the designer..."
                className="w-full p-4 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all resize-none"
                rows={4}
                disabled={processing}
              />
              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleSubmit}
                  disabled={processing || !reason.trim()}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <XCircle className="w-5 h-5" />
                  {processing ? 'Submitting Rejection...' : 'Submit Rejection'}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  disabled={processing}
                  className="px-6 py-3 border-2 border-gray-300 hover:bg-gray-50 rounded-lg font-semibold transition-colors bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {processing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-medium">Processing your decision...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

