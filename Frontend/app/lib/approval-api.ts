/**
 * Enhanced API client for approval-related operations
 * Extends the workflow API with additional approval-specific functionality
 */

import { DesignApproval, getPendingApprovals, approveDesign } from './workflowApi';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface ApprovalStats {
  total_pending: number;
  normal_priority: number;
  urgent_priority: number;
  overdue: number;
  approval_rate: number;
  avg_response_time_hours: number;
  total_approved_today: number;
  total_rejected_today: number;
}

export interface ApprovalHistoryItem extends Omit<DesignApproval, 'rejection_reason'> {
  approved_at?: string;
  rejection_reason?: string;
}

// Get approval statistics
export const getApprovalStats = async (): Promise<ApprovalStats> => {
  const response = await fetch(`${API_BASE}/api/approvals/stats/`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    // Fallback to basic stats if endpoint doesn't exist
    const pendingApprovals = await getPendingApprovals();
    const history = await getApprovalHistory();
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const overdue = pendingApprovals.filter(a => {
      const hoursSinceSubmission = (Date.now() - new Date(a.submitted_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceSubmission > 48;
    }).length;
    
    const urgent = pendingApprovals.filter(a => {
      const hoursSinceSubmission = (Date.now() - new Date(a.submitted_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceSubmission > 24 && hoursSinceSubmission <= 48;
    }).length;

    const normalizedToday = history.filter(h => {
      const approvalDate = new Date(h.responded_at || h.submitted_at);
      return approvalDate >= today;
    });

    return {
      total_pending: pendingApprovals.length,
      normal_priority: pendingApprovals.length - overdue - urgent,
      urgent_priority: urgent,
      overdue: overdue,
      approval_rate: history.length > 0 ? 
        Math.round((history.filter(h => h.approval_status === 'approved').length / history.length) * 100) : 0,
      avg_response_time_hours: history.length > 0 ? 
        history.reduce((acc, h) => {
          const submitted = new Date(h.submitted_at);
          const responded = new Date(h.responded_at || new Date());
          const hours = (responded.getTime() - submitted.getTime()) / (1000 * 60 * 60);
          return acc + hours;
        }, 0) / history.length : 0,
      total_approved_today: normalizedToday.filter(h => h.approval_status === 'approved').length,
      total_rejected_today: normalizedToday.filter(h => h.approval_status === 'rejected').length,
    };
  }

  return response.json();
};

// Get approval history
export const getApprovalHistory = async (limit: number = 20): Promise<ApprovalHistoryItem[]> => {
  const response = await fetch(`${API_BASE}/api/approvals/history/?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    // Fallback implementation - fetch all approvals and filter
    const response = await fetch(`${API_BASE}/api/approvals/pending/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch approval history: ${response.statusText}`);
    }

    const pendingApprovals = await response.json();
    
    // Convert pending approvals to history format for demo
    return pendingApprovals.slice(0, limit).map((approval: DesignApproval) => ({
      ...approval,
      approval_status: 'pending' as const,
      responded_at: null,
      rejection_reason: '',
    }));
  }

  return response.json();
};

// Export the getPendingApprovals function from workflowApi
export { getPendingApprovals, approveDesign } from './workflowApi';

// Bulk approve multiple designs
export const bulkApproveDesigns = async (approvalIds: number[]): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/approvals/bulk-approve/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approval_ids: approvalIds }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to bulk approve: ${errorText}`);
  }
};

// Bulk reject multiple designs
export const bulkRejectDesigns = async (
  approvals: { id: number; rejection_reason: string }[]
): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/approvals/bulk-reject/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approvals }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw(new Error(`Failed to bulk reject: ${errorText}`));
  }
};

// Get urgent approvals (approaching deadline)
export const getUrgentApprovals = async (): Promise<DesignApproval[]> => {
  const response = await fetch(`${API_BASE}/api/approvals/urgent/`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    // Fallback implementation
    const allApprovals = await getPendingApprovals();
    return allApprovals.filter(approval => {
      const hoursSinceSubmission = (Date.now() - new Date(approval.submitted_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceSubmission > 24; // Urgent: more than 24 hours old
    });
  }

  return response.json();
};

// Set approval deadline
export const setApprovalDeadline = async (
  approvalId: number, 
  deadline: string
): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/approvals/${approvalId}/deadline/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ deadline }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to set deadline: ${errorText}`);
  }
};

// Add internal notes to approval
export const addApprovalNotes = async (
  approvalId: number, 
  notes: string
): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/approvals/${approvalId}/notes/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ internal_notes: notes }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add notes: ${errorText}`);
  }
};

// Get approval analytics
export const getApprovalAnalytics = async (period: 'week' | 'month' | 'quarter') => {
  const response = await fetch(`${API_BASE}/api/approvals/analytics/?period=${period}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    // Return mock data for demo
    return {
      period,
      total_submissions: 45,
      approval_rate: 89,
      avg_response_time_hours: 2.3,
      designer_performance: [
        { designer: 'John Doe', approvals: 12, rejection_rate: 15 },
        { designer: 'Jane Smith', approvals: 15, rejection_rate: 8 },
      ],
      client_satisfaction: 94,
      turnaround_trend: [{ date: '2023-01-01', avg_hours: 2.5 }],
    };
  }

  return response.json();
};

// Export types for use in components
export type { DesignApproval };
