"use client";

import React, { useEffect, useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  User, 
  Search,
  RefreshCw,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Zap,
  CalendarDays
} from "lucide-react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { toast } from "react-hot-toast";
import { DesignApproval, getPendingApprovals, approveDesign } from "@/app/lib/workflowApi";
import DesignFilePreview from "@/app/components/DesignFilePreview";

interface ApprovalDecisionModalProps {
  approval: DesignApproval | null;
  isOpen: boolean;
  onClose: () => void;
  onDecision: (action: 'approve' | 'reject', reason?: string) => void;
  processing: boolean;
}

function ApprovalDecisionModal({ approval, isOpen, onClose, onDecision, processing }: ApprovalDecisionModalProps) {
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
      toast.error("Please provide a rejection reason");
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

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${isOpen ? 'flex' : 'hidden'} items-center justify-center p-4`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Design Approval - {approval.order_code}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              Order Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="font-medium text-gray-600">Client:</span>
                  <span className="ml-2 text-gray-900">{approval.client_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="font-medium text-gray-600">Designer:</span>
                  <span className="ml-2 text-gray-900">{approval.designer}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="font-medium text-gray-600">Submitted:</span>
                  <span className="ml-2 text-gray-900">{formatDate(approval.submitted_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="font-medium text-gray-600">Sales Person:</span>
                  <span className="ml-2 text-gray-900">{approval.sales_person}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Designer Notes */}
          {approval.approval_notes && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Designer Notes
              </h3>
              <div className="bg-white rounded-md p-3 border border-green-200">
                <p className="text-green-800 whitespace-pre-wrap">{approval.approval_notes}</p>
              </div>
            </div>
          )}

          {/* Design Files */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Design Files ({approval.design_files_manifest.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {approval.design_files_manifest.map((file: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-md border border-purple-200 hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 text-lg">
                    {file.type?.startsWith('image/') ? '🖼️' : 
                     file.name?.toLowerCase().endsWith('.pdf') ? '📄' : 
                     file.name?.toLowerCase().endsWith('.doc') || file.name?.toLowerCase().endsWith('.docx') ? '📝' : 
                     file.name?.toLowerCase().endsWith('.ai') ? '🎨' :
                     file.name?.toLowerCase().endsWith('.psd') ? '🖌️' : '📁'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-purple-900 truncate">
                      {file.name || `File ${index + 1}`}
                    </p>
                    <p className="text-xs text-purple-600">
                      {file.size ? `${Math.round(file.size / 1024)} KB` : 'Unknown size'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button 
              className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
              onClick={handleFilePreview}
            >
              <Eye className="w-4 h-4" />
              Preview All Files
            </button>
          </div>

          {/* Decision Section */}
          {!showRejectForm ? (
            <div className="space-y-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Make Your Decision
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Approve Design
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-400 disabled:to-red-500 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <XCircle className="w-5 h-5" />
                  Reject Design
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-200">
              <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Provide Rejection Reason
              </h3>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please explain exactly why you are rejecting this design so the designer can make appropriate improvements..."
                className="w-full p-3 border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                rows={4}
                disabled={processing}
              />
              <div className="flex gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={processing || !reason.trim()}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <XCircle className="w-5 h-5" />
                  {processing ? 'Submitting Rejection...' : 'Submit Rejection'}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  disabled={processing}
                  className="px-6 py-3 border border-gray-300 hover:bg-gray-50 rounded-lg font-semibold transition-colors bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalCard({ approval, onApprove, onReject, processing }: {
  approval: DesignApproval;
  onApprove: () => void;
  onReject: () => void;
  processing: boolean;
}) {
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
        <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full border border-red-200">
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 p-6 hover:border-blue-300">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              { approval.order_code}
            </h3>
            {getPriorityBadge()}
          </div>
          <p className="text-gray-600 font-medium">{approval.client_name}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-md">
          <Calendar className="w-4 h-4" />
          {formatDate(approval.submitted_at)}
        </div>
      </div>

      {/* Designer Info */}
      <div className="flex items-center gap-2 mb-4">
        <User className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          Designed by <span className="font-semibold text-gray-800">{approval.designer}</span>
        </span>
      </div>

      {/* Files Info */}
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          <span className="font-semibold text-purple-600">{approval.design_files_manifest.length}</span> design file(s)
        </span>
      </div>

      {/* Designer Notes Preview */}
      {approval.approval_notes && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">Designer Notes:</h4>
          <p className="text-sm text-blue-700 line-clamp-2">
            {approval.approval_notes}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onApprove}
          disabled={processing}
          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500 text-white py-2 px-4 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={onReject}
          disabled={processing}
          className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-400 disabled:to-red-500 text-white py-2 px-4 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>
    </div>
  );
}

export default function SalesApprovalPage() {
  const [approvals, setApprovals] = useState<DesignApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<DesignApproval | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "overdue" | "urgent" | "normal">("all");

  // Load approvals
  const loadApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingApprovals();
      setApprovals(data);
    } catch (err: any) {
      setError(err.message || "Failed to load approvals");
      toast.error("Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadApprovals, 30000);
    
    // Listen for new approval requests from designers
    const onApprovalRequest = (event: any) => {
      const { orderCode, designer, clientName } = event.detail;
      toast.success(`🎯 ${designer} requested approval for order ${orderCode} (${clientName})`, {
        duration: 5000,
      });
      
      // Refresh approvals after a short delay
      setTimeout(() => {
        loadApprovals();
      }, 1000);
    };
    
    window.addEventListener("approval-requested", onApprovalRequest);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("approval-requested", onApprovalRequest);
    };
  }, []);

  // Handle approval decision
  const handleDecision = async (action: 'approve' | 'reject', reason?: string) => {
    if (!selectedApproval) return;

    setProcessing(true);
    try {
      // Map frontend action to backend format
      const backendAction = action === 'approve' ? 'approved' : 'rejected';
      await approveDesign(selectedApproval.id, backendAction, reason);
      
      const actionText = action === 'approve' ? 'approved' : 'rejected';
      const actionEmoji = action === 'approve' ? '🎉' : '❌';
      
      toast.success(`${actionEmoji} Design ${actionText} for ${selectedApproval.order_code}!`);
      
      // Notify designer about the decision
      window.dispatchEvent(new CustomEvent("approval-updated", {
        detail: {
          orderId: selectedApproval.order,
          orderCode: selectedApproval.order_code,
          designer: selectedApproval.designer,
          action: action,
          rejectionReason: reason
        }
      }));
      
      // Also notify orders update
      window.dispatchEvent(new CustomEvent("orders:updated"));
      
      setShowDecisionModal(false);
      setSelectedApproval(null);
      await loadApprovals();
      
    } catch (error: any) {
      toast.error(`Failed to ${action}: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Filter approvals
  const filteredApprovals = approvals.filter(approval => {
    // Search filter
    if (searchTerm && !approval.order_code.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !approval.client_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !approval.designer.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Priority filter
    const hoursSinceSubmission = (Date.now() - new Date(approval.submitted_at).getTime()) / (1000 * 60 * 60);
    
    if (filterStatus === "overdue") {
      return hoursSinceSubmission > 48;
    } else if (filterStatus === "urgent") {
      return hoursSinceSubmission > 24 && hoursSinceSubmission <= 48;
    } else if (filterStatus === "normal") {
      return hoursSinceSubmission <= 24;
    }

    return true;
  });

  // Stats
  const stats = {
    total: approvals.length,
    overdue: approvals.filter(a => {
      const hoursSinceSubmission = (Date.now() - new Date(a.submitted_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceSubmission > 48;
    }).length,
    urgent: approvals.filter(a => {
      const hoursSinceSubmission = (Date.now() - new Date(a.submitted_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceSubmission > 24 && hoursSinceSubmission <= 48;
    }).length,
    normal: approvals.filter(a => {
      const hoursSinceSubmission = (Date.now() - new Date(a.submitted_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceSubmission <= 24;
    }).length,
  };

  return (
    <>
      <DashboardNavbar />
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Design Approval Center</h1>
            <p className="text-lg text-gray-600">Review and approve designs submitted by designers</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Total Pending</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="privileges-green-100 text-sm">Normal</p>
                  <p className="text-3xl font-bold">{stats.normal}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="privileges-yellow-100 text-sm">Urgent</p>
                  <p className="text-3xl font-bold">{stats.urgent}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="privileges-red-100 text-sm">Overdue</p>
                  <p className="text-3xl font-bold">{stats.overdue}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search orders, clients, designers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              {/* Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="all">All Approvals</option>
                <option value="normal">Normal (&lt; 24h)</option>
                <option value="urgent">Urgent (24-48h)</option>
                <option value="overdue">Overdue (48h+)</option>
              </select>

              {/* Refresh */}
              <button
                onClick={loadApprovals}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Approvals List */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 text-lg">Loading pending approvals...</span>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Approvals</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button 
                onClick={loadApprovals}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Try Again
              </button>
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">All Caught Up!</h3>
              <p className="text-gray-600 text-lg">No design approvals waiting for your review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredApprovals.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={() => {
                    setSelectedApproval(approval);
                    setShowDecisionModal(true);
                  }}
                  onReject={() => {
                    setSelectedApproval(approval);
                    setShowDecisionModal(true);
                  }}
                  processing={processing}
                />
              ))}
            </div>
          )}

          {/* Decision Modal */}
          <ApprovalDecisionModal
            approval={selectedApproval}
            isOpen={showDecisionModal}
            onClose={() => {
              setShowDecisionModal(false);
              setSelectedApproval(null);
            }}
            onDecision={handleDecision}
            processing={processing}
          />
        </div>
      </div>
    </>
  );
}
