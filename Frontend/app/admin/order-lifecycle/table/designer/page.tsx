"use client";

import { useMemo, useState, useCallback, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/app/components/Button";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { ordersApi, Order } from "@/lib/orders-api";
import { toast } from "react-hot-toast";
import { Trash2, CheckCircle, XCircle, Clock, FileText, User, Calendar, Upload, Send, Package, Eye } from "lucide-react";
import DesignFilePreview from '@/app/components/DesignFilePreview';
import { requestDesignApproval, sendToProduction, uploadOrderFile, getOrderFiles } from "@/lib/workflowApi";

/* ===== Types ===== */
type Urgency = "Urgent" | "High" | "Normal" | "Low";
type Status = "New" | "Active" | "Completed";

interface Row {
  id: number;
  orderCode: string;
  title: string;
  date: string;
  time: string;
  urgency: Urgency;
  status: Status;
}

const urgencyBadge = (u: Urgency) => {
  const classes: Record<Urgency, string> = {
    Urgent: "bg-red-100 text-red-700 border-red-200",
    High: "bg-amber-100 text-amber-800 border-amber-200",
    Normal: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Low: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs border font-medium ${classes[u]}`}>
      {u}
    </span>
  );
};

const toLocalYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const normalizeToYMD = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : toLocalYMD(d);
  } catch {
    return null;
  }
};

export default function DesignerView() {
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [showDesignPreview, setShowDesignPreview] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<any[]>([]);
  const [isApprovalPending, setIsApprovalPending] = useState(false);
  const [isDesignApproved, setIsDesignApproved] = useState(false);
  const [isDesignRejected, setIsDesignRejected] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  // Enhanced debugging function for approval status
  const debugApprovalStatus = () => {
    console.log('🔍 === APPROVAL STATUS DEBUG ===');
    console.log('Selected Order:', selected);
    console.log('isDesignApproved:', isDesignApproved);
    console.log('approvalStatus:', approvalStatus);
    console.log('isApprovalPending:', isApprovalPending);
    console.log('isDesignRejected:', isDesignRejected);
    console.log('Modal Open:', isOpen);
    console.log('Uploaded Files:', uploadedFiles.length);
    console.log('Approval Notes:', approvalNotes);
    console.log('Token:', localStorage.getItem('admin_token') ? 'EXISTS' : 'MISSING');
    console.log('User:', localStorage.getItem('admin_username'));
    console.log('Order Details:', orderDetails);
    
    // Test approval API endpoint if order is selected
    if (selected) {
      fetch(`http://127.0.0.1:8000/api/orders/${selected.id}/design-approvals/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })
      .then(res => res.json())
      .then(data => {
        console.log('🔍 Raw Approval Data from API:', data);
        if (data && data.length > 0) {
          console.log('📊 Latest Approval Details:', {
            status: data[0].approval_status,
            submitted_at: data[0].submitted_at,
            reviewed_at: data[0].recommended_at,
            sales_person: data[0].sales_person,
            designer: data[0].designer
          });
        }
      })
      .catch(err => console.error('❌ Approval API Error:', err));
    }
  };

  // Force refresh approval status
  const debugApprovalWithRefresh = async () => {
    console.log('🔄 Force refreshing approval status...');
    debugApprovalStatus();
    if (selected) {
      await checkApprovalStatus(selected.id);
      console.log('✅ Refresh completed. Updated state:');
      debugApprovalStatus();
    }
  };

  // Legacy debug function for backward compatibility
  const debugApproval = debugApprovalStatus;

  // Make debug functions available globally for console access
  useEffect(() => {
    (window as any).debugApproval = debugApproval;
    (window as any).debugApprovalStatus = debugApprovalStatus;
    (window as any).debugApprovalWithRefresh = debugApprovalWithRefresh;
  }, [selected, uploadedFiles, approvalNotes, isDesignApproved, approvalStatus, isOpen, orderDetails]);

  // Helper functions for consistent data mapping
  const summarizeItems = (items?: Order['items']) => {
    if (!items || items.length === 0) return 'Custom Order';
    return items
      .map((item) => {
        const qty = item.quantity && item.quantity > 0 ? `${item.quantity} x ` : '';
        return `${qty}${item.name}`;
      })
      .join(', ');
  };

  const statusMap: Record<string, Status> = {
    new: "New",
    active: "Active",
    in_progress: "Active",
    completed: "Completed",
    delivered: "Completed",
    draft: "New",
    sent_to_sales: "New",
    sent_to_designer: "New",
    sent_for_approval: "Active",
    sent_to_production: "Active",
    getting_ready: "Active",
    sent_for_delivery: "Active",
  };

  const orderToRow = (order: Order): Row => {
    const [datePart = "", timePart = ""] = (order.created_at || "").split("T");
    const time = timePart ? timePart.split(".")[0]?.substring(0, 5) ?? "" : "";
    const summary = summarizeItems(order.items);
    return {
      id: order.id,
      orderCode: order.order_code,
      title: `${summary} - ${order.client_name}`,
      date: datePart,
      time,
      urgency: (order.urgency || "Normal") as Urgency,
      status: statusMap[order.status as keyof typeof statusMap] ?? "New",
    };
  };

  const mapOrders = (orders: Order[]): Row[] => orders.map(orderToRow);

  // Load orders on component mount
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiOrders = await ordersApi.getOrders();

        // Convert API orders to Row format using consistent mapping
        const convertedOrders = mapOrders(apiOrders);

        setOrders(convertedOrders);
      } catch (err: any) {
        setError(err.message || "Failed to load orders");
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
    
    // Listen for order updates from other components
    const onUpdate = () => {
      loadOrders();
    };
    
    // Listen for approval updates (when sales approves/rejects)
    const onApprovalUpdate = async (event: any) => {
      const { orderId } = event.detail;
      if (selected && selected.id === orderId) {
        await checkApprovalStatus(orderId);
      }
    };
    
    window.addEventListener("orders:updated", onUpdate);
    window.addEventListener("approval-updated", onApprovalUpdate);
    
    return () => {
      window.removeEventListener("orders:updated", onUpdate);
      window.removeEventListener("approval-updated", onApprovalUpdate);
    };
  }, [selected]);

  // Auto-refresh approval status when modal is open and waiting for approval
  useEffect(() => {
    if (isOpen && selected && (approvalStatus === 'pending' || !approvalStatus)) {
      console.log('🔄 Starting auto-refresh for order:', selected.id);
      
      const interval = setInterval(async () => {
        console.log('🔄 Auto-refreshing approval status for order:', selected.id);
        await checkApprovalStatus(selected.id);
      }, 10000); // Check every 10 seconds

      return () => {
        console.log('🛑 Stopping auto-refresh for order:', selected.id);
        clearInterval(interval);
      };
    }
  }, [isOpen, selected, approvalStatus]);

  const checkApprovalStatus = async (orderId: number) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiBase}/api/orders/${orderId}/design-approvals/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      
      if (response.ok) {
        const approvals = await response.json();
        if (approvals && approvals.length > 0) {
          const latestApproval = approvals[0]; // Most recent approval
          const status = latestApproval.approval_status || 'pending';
          setApprovalStatus(status);
          setIsApprovalPending(status === 'pending');
          setIsDesignApproved(status === 'approved');
          setIsDesignRejected(status === 'rejected');
          
          // Show notification for design updates
          if (latestApproval.approval_status === 'approved') {
            toast.success(`🎉 Design approved! You can now send order to production.`);
          } else if (latestApproval.approval_status === 'rejected') {
            toast.error(`❌ Design rejected: ${latestApproval.rejection_reason || 'Please check with sales team for details.'}`);
          } else if (latestApproval.approval_status === 'pending') {
            toast(`⏳ Design approval pending. Waiting for sales review.`, { duration: 4000 });
          }
          
          return latestApproval;
        } else {
          // No approval request yet
          setApprovalStatus(null);
          setIsApprovalPending(false);
          setIsDesignApproved(false);
          setIsDesignRejected(false);
        }
      }
    } catch (error) {
      console.error('Failed to check approval status:', error);
      setApprovalStatus(null);
      setIsApprovalPending(false);
      setIsDesignApproved(false);
      setIsDesignRejected(false);
    }
    return null;
  };

  const openForRow = useCallback(async (row: Row) => {
    setSelected(row);
    setIsOpen(true);
    
    try {
      // Load full order details to get products and specifications
      const orderData = await ordersApi.getOrder(row.id);
      setOrderDetails(orderData);
      
      // Check approval status
      await checkApprovalStatus(row.id);
      
    } catch (err: any) {
      console.error("Failed to load order details:", err);
      toast.error("Failed to load order details");
    }
  }, []);

  const deleteOrder = async (id: number, orderCode: string) => {
    if (!confirm(`Delete order ${orderCode}?`)) return;
    
    try {
      await ordersApi.deleteOrder(id);
      setOrders(prev => prev.filter(order => order.id !== id));
      toast.success(`Order ${orderCode} deleted successfully`);
      
      // Notify other components of the update
      window.dispatchEvent(new CustomEvent("orders:updated"));
    } catch (err: any) {
      toast.error(`Failed to delete order: ${err.message}`);
    }
  };

  const openOrderLifecycle = useCallback(
    (row: Row) => {
      window.location.href = `/admin/order-lifecycle?orderId=${row.id}`;
    },
    [],
  );

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setUploadedFiles(prev => [...prev, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRequestApproval = async () => {
    if (!selected) return;
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one design file");
      return;
    }

    console.log('🎯 Handling request approval for order:', selected.id);
    console.log('📁 Uploaded files:', uploadedFiles);

    try {
      toast("📤 Starting approval request...", { duration: 2000 });
      
      // Upload files first
      console.log('📤 Uploading files...');
      const uploadedFileUrls = [];
      for (const file of uploadedFiles) {
        console.log('📂 Uploading file:', file.name);
        const response = await uploadOrderFile(
          selected.id,
          file,
          'design', // Fixed: Use 'design' as file_type instead of file.type
          'design',
          `Design file: ${file.name}`,
          undefined,
          ['admin', 'sales', 'designer']
        );
        console.log('✅ File uploaded successfully:', response);
        uploadedFileUrls.push({
          name: file.name,
          url: response.file_url,
          size: file.size,
          type: file.type
        });
      }

      console.log('✨ Files uploaded successfully:', uploadedFileUrls);

      // Get the sales person from the order data
      console.log('👤 Getting order data...');
      const orderData = await ordersApi.getOrder(selected.id);
      
      // Look up a sales user if no one is assigned
      let salesPerson = orderData.assigned_sales_person;
      if (!salesPerson) {
        try {
          const salesUsers = await fetch('/api/users/?role=sales');
          if (salesUsers.ok) {
            const users = await salesUsers.json();
            salesPerson = users.length > 0 ? users[0].username : 'sales';
          } else {
            salesPerson = 'sales'; // Fallback
          }
        } catch (error) {
          console.error('Error fetching sales users:', error);
          salesPerson = 'sales'; // Fallback
        }
      }
      
      console.log('👤 Sales person:', salesPerson);

      // Request approval
      console.log('🎯 Requesting design approval...');
      const approvalData = {
        designer: localStorage.getItem('admin_username') || 'designer',
        sales_person: salesPerson || 'sales', // Ensure sales_person is defined
        design_files_manifest: uploadedFileUrls,
        approval_notes: approvalNotes
      };
      console.log('📝 Approval data:', approvalData);
      
      const approvalResponse = await requestDesignApproval(selected.id, approvalData);
      console.log('✅ Approval request successful:', approvalResponse);

      // Update approval status
      setIsApprovalPending(true);
      setIsDesignApproved(false);
      setIsDesignRejected(false);
      setApprovalStatus('pending');

      toast.success("🎯 Design approval requested successfully! Sales team will review your submission.");
      
      setUploadedFiles([]);
      setApprovalNotes("");
      setShowFileUpload(false);
      
      // Refresh orders to reflect status change
      const apiOrders = await ordersApi.getOrders();
      const convertedOrders = mapOrders(apiOrders);
      setOrders(convertedOrders);
      
      // Notify other components of the update
      window.dispatchEvent(new CustomEvent("orders:updated"));
      
      // Also notify sales approval page if open
      window.dispatchEvent(new CustomEvent("approval-requested", {
        detail: {
          orderId: selected.id,
          orderCode: orderData.order_code,
          designer: localStorage.getItem('admin_username') || 'designer',
          clientName: orderData.client_name,
          filesCount: uploadedFileUrls.length
        }
      }));
      
      console.log('🎉 Approval request completed successfully!');
      
    } catch (err: any) {
      console.error('❌ Error in handleRequestApproval:', err);
      console.error('❌ Error details:', {
        message: err.message,
        status: err.status,
        response: err.response
      });
      
      let errorMessage = `Failed to request approval: ${err.message}`;
      
      // Provide more specific error messages
      if (err.message.includes('Failed to fetch')) {
        errorMessage = "❌ Cannot connect to server. Please check if backend is running on port 8000.";
      } else if (err.message.includes('401')) {
        errorMessage = "🔒 Authentication failed. Please login again.";
      } else if (err.message.includes('404')) {
        errorMessage = "🔍 API endpoint not found. Please check server status.";
      } else if (err.message.includes('500')) {
        errorMessage = "💥 Server error. Please try again or contact support.";
      }
      
      toast.error(errorMessage);
    }
  };

  const handleSendToProduction = async () => {
    if (!selected) return;

    // Check if design is approved before allowing send to production
    if (!isDesignApproved) {
      if (approvalStatus === 'pending') {
        toast.error("⏳ Design approval is still pending. Please wait for sales team to review.");
      } else if (approvalStatus === 'rejected') {
        toast.error("❌ Design was rejected. Please address feedback and request approval again.");
      } else {
        toast.error("⚡ Please request design approval first before sending to production.");
      }
      return;
    }

    try {
      const response = await sendToProduction(selected.id);
      toast.success(response?.message || "🚀 Order sent to production successfully!");
      
      // Get updated order data for notifications
      const orderData = await ordersApi.getOrder(selected.id);
      
      // Send real-time notification to production view
      window.dispatchEvent(new CustomEvent("order-sent-to-production", {
        detail: {
          orderId: selected.id,
          orderCode: orderData.order_code || selected.orderCode,
          clientName: orderData.client_name || 'Unknown Client',
          status: orderData.status,
          stage: orderData.stage,
          timestamp: new Date().toISOString()
        }
      }));
      
      // Reset approval status
      setIsDesignApproved(false);
      setIsApprovalPending(false);
      setIsDesignRejected(false);
      setApprovalStatus(null);
      
      setIsOpen(false);
      
      // Refresh orders to reflect status change
      const apiOrders = await ordersApi.getOrders();
      const convertedOrders = mapOrders(apiOrders);
      setOrders(convertedOrders);
      
      // Notify other components of the update
      window.dispatchEvent(new CustomEvent("orders:updated"));
      
      console.log('✅ Order successfully sent to production with real-time notifications');
    } catch (err: any) {
      console.error('❌ Failed to send to production:', err);
      toast.error(`Failed to send to production: ${err.message}`);
    }
  };

  const updateDesignStatus = async (orderId: number, itemId: number, designReady: boolean) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiBase}/api/orders/${orderId}/items/${itemId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({
          design_ready: designReady,
        }),
      });
      
      if (response.ok) {
        // Update local state
        setOrderDetails(prev => {
          if (!prev || !prev.items) return prev;
          return {
            ...prev,
            items: prev.items.map(item => 
              (item as any).id === itemId 
                ? { ...item, design_ready: designReady }
                : item
            )
          };
        });
        
        // Also update orders list
        const apiOrders = await ordersApi.getOrders();
        const convertedOrders = mapOrders(apiOrders);
        setOrders(convertedOrders);
        
        toast.success(`Design status updated successfully!`);
      } else {
        toast.error('Failed to update design status');
      }
    } catch (error) {
      console.error('Failed to update design status:', error);
      toast.error('Failed to update design status');
    }
  };

  const handleDesignFilePreview = (files: any[]) => {
    // Transform backend design_files_manifest data to match DesignFilePreview expectations
    const transformedFiles = files.map((file: any) => {
      let blob = null;
      let content = null;
      
      // Handle base64 encoded data
      if (file.data && typeof file.data === 'string') {
        try {
          // Check if it's base64 encoded
          const base64Match = file.data.match(/^data:([A-Za-z0-9+/]+);base64,(.+)$/);
          if (base64Match) {
            const [_, mimeType, base64Data] = base64Match;
            const binaryData = atob(base64Data);
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              bytes[i] = binaryData.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: mimeType });
            content = file.data; // Keep original base64 for API usage
          } else {
            // Assume it's already base64 data
            const binaryData = atob(file.data);
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              bytes[i] = binaryData.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: file.type || 'application/octet-stream' });
            content = file.data;
          }
        } catch (error) {
          console.error('Failed to decode base64 data for file:', file.name, error);
        }
      }
      
      return {
        name: file.name || 'Unknown File',
        size: file.size || 0,
        type: file.type || 'application/octet-stream',
        url: file.url || null, // May not be available from backend
        blob: blob,
        content: content, // Keep base64 data for fallback
        id: file.id || null, // Backend file ID for secure operations
        order_file_id: file.order_file_id || null,
        lastModified: file.lastModified || Date.now()
      };
    });
    
    console.log('Transformed files for preview:', transformedFiles);
    setPreviewFiles(transformedFiles);
    setShowDesignPreview(true);
  };

  const ALL = orders;
  const filtered = useMemo(() => {
    return ALL.filter((r) => {
      const okDay = selectedDate === "" || normalizeToYMD(r.date) === selectedDate;
      const hay = [r.orderCode, r.title, r.urgency, r.status]
        .join(" ")
        .toLowerCase();
      const okQuery = q.trim() === "" ? true : hay.includes(q.toLowerCase());
      return okDay && okQuery;
    });
  }, [ALL, selectedDate, q]);

  // Computed property for better "Send to Production" button state management
  const canSendToProduction = useMemo(() => {
    if (!selected) return false;
    if (approvalStatus === 'rejected') return false;
    return isDesignApproved && approvalStatus === 'approved';
  }, [isDesignApproved, approvalStatus, selected]);

  const by = (s: Status) => filtered.filter((r) => r.status === s);

  const Section = ({ title, rows }: { title: string; rows: Row[] }) => (
    <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-4">
        <h2 className="text-2xl font-bold text-[#891F1A]">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#7a1b17] text-white">
              <th className="px-3 py-3 text-center w-20">Sr No</th>
              <th className="px-3 py-3 text-center w-36">Order Id</th>
              <th className="px-3 py-3 text-center">Order</th>
              <th className="px-3 py-3 text-center w-36">Date</th>
              <th className="px-3 py-3 text-center w-28">Time</th>
              <th className="px-3 py-3 text-center w-40">Urgency</th>
              <th className="px-3 py-3 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-400" colSpan={7}>
                  No records
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-3 text-center">{i + 1}</td>
                  <td className="px-3 py-3 text-center font-medium text-gray-900">{r.orderCode}</td>
                  <td className="px-3 py-3 text-center cursor-pointer" onClick={() => openForRow(r)}>
                    {r.title}
                  </td>
                  <td className="px-3 py-3 text-center">{normalizeToYMD(r.date) || r.date}</td>
                  <td className="px-3 py-3 text-center">{r.time}</td>
                  <td className="px-3 py-3 text-center">{urgencyBadge(r.urgency)}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOrderLifecycle(r);
                        }}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                        title="Open Order Lifecycle"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOrder(r.id, r.orderCode);
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-black">
        <DashboardNavbar />
        <div className="h-4 sm:h-5 md:h-6" />
        <div className="max-w-7xl mx-auto pb-16">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading orders...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-black">
        <DashboardNavbar />
        <div className="h-4 sm:h-5 md:h-6" />
        <div className="max-w-7xl mx-auto pb-16">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-black">
      {/* Navbar */}
      <DashboardNavbar />
      <div className="h-4 sm:h-5 md:h-6" />

      <div className="max-w-7xl mx-auto pb-16">
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-4xl font-bold text-[#891F1A]">Designer Orders</h1>
        </div>

        {/* Search and Filter */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search orders..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#891F1A] focus:border-transparent"
            />
          </div>
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#891F1A] focus:border-transparent"
            />
          </div>
        </div>

        {/* Order Sections */}
        <div className="mt-8 space-y-8">
          <Section title="Pending Approval Orders" rows={by("New")} />
          <Section title="Approved Orders" rows={by("Active")} />
          <Section title="Completed Orders" rows={by("Completed")} />
        </div>
      </div>

      {/* Order Details Modal */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 z-10 flex items-center justify-between">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-[#891F1A]">
                    Order Details - {selected?.orderCode}
                  </Dialog.Title>
                  <p className="text-xs text-gray-500">
                    {selected?.title} · {selected && (normalizeToYMD(selected.date) || selected.date)}
                    {selected && " · "} {selected?.time}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    setOrderDetails(null);
                    setUploadedFiles([]);
                    setApprovalNotes("");
                  }} 
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Order Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Order Code:</span>
                        <span className="ml-2 font-medium">{selected?.orderCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Client:</span>
                        <span className="ml-2 font-medium">{orderDetails?.client_name || selected?.title}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <span className="ml-2 font-medium">{selected && (normalizeToYMD(selected.date) || selected.date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Urgency:</span>
                        <span className="ml-2">{selected && urgencyBadge(selected.urgency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Designer Information */}
                  {orderDetails?.design_stage && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Design Assignment Details
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Design Status */}
                        {orderDetails.design_stage.design_status && (
                          <div className="bg-white rounded-lg p-3 border border-purple-100">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700">Design Status</span>
                            </div>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                              orderDetails.design_stage.design_status === 'Design Complete' 
                                ? 'bg-green-100 text-green-800' 
                                : orderDetails.design_stage.design_status === 'Design in Progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {orderDetails.design_stage.design_status}
                            </span>
                          </div>
                        )}
                        
                        {/* Requirements Files Count */}
                        {orderDetails.design_stage.requirements_files_manifest && 
                         orderDetails.design_stage.requirements_files_manifest.length > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-purple-100">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700">Requirements Files</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold text-orange-600">{orderDetails.design_stage.requirements_files_manifest.length}</span>
                              <span className="text-sm text-gray-600">files attached</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Requirements Files List */}
                      {orderDetails.design_stage.requirements_files_manifest && 
                          orderDetails.design_stage.requirements_files_manifest.length > 0 && (
                            <div className="mt-4 bg-white rounded-lg p-3 border border-purple-100">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-sm font-medium text-gray-700">Requirements Files</span>
                              </div>
                              <div className="space-y-2">
                                {orderDetails.design_stage.requirements_files_manifest.map((file: any, index: number) => (
                                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                                    <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                    <span className="text-sm text-gray-700 flex-1 truncate">{file.name || `File ${index + 1}`}</span>
                                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                      {file.size ? `${Math.round(file.size / 1024)} KB` : 'Unknown size'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                      {/* Internal Comments */}
                      {orderDetails.design_stage.internal_comments && (
                        <div className="mt-4 bg-white rounded-lg p-3 border border-purple-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Internal Comments / Revision Notes</span>
                          </div>
                          <div className="bg-gray-50 rounded-md p-3 border max-h-48 overflow-y-auto">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {orderDetails.design_stage.internal_comments}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Products (Order Intake) */}
                  {orderDetails?.items && orderDetails.items.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Products & Design Status</h3>
                      <div className="space-y-4">
                        {orderDetails.items.map((item, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                            <div className="flex items-start gap-4">
                              {/* Product Image */}
                              <div className="flex-shrink-0">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/images/placeholder-product.png';
                                    }}
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded-lg border border-gray-200 flex items-center justify-center">
                                    <Package className="w-8 h-8 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Product Details */}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                  <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                                </div>
                                
                                {/* Design Status */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      item.design_ready 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      Design: {item.design_ready ? 'Yes' : 'No'}
                                    </span>
                                    {item.design_need_custom && (
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        Custom Required
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Design Status Control */}
                                  <button
                                    onClick={() => {
                                      if (orderDetails && (item as any).id) {
                                        updateDesignStatus(orderDetails.id, (item as any).id, !item.design_ready);
                                      }
                                    }}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      item.design_ready
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                                  >
                                    {item.design_ready ? 'Mark No' : 'Mark Yes'}
                                  </button>
                                </div>
                                
                                {item.sku && (
                                  <p className="text-sm text-gray-600 mb-2">SKU: {item.sku}</p>
                                )}
                                
                                {/* Product Attributes */}
                                {item.attributes && Object.keys(item.attributes).length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Attributes:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(item.attributes).map(([key, value]) => (
                                        <span
                                          key={key}
                                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                                        >
                                          {key}: {value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Enhanced Design Configuration Information */}
                                <div className="mt-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-blue-100">
                                  <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    Design Configuration Status
                                  </h5>
                                  
                                  {/* Design Status Cards */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    {/* Ready Design Status */}
                                    <div className={`p-3 rounded-lg border-2 transition-colors ${
                                      item.design_ready 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-red-50 border-red-200'
                                    }`}>
                                      <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                                          item.design_ready 
                                            ? 'bg-green-500 border-green-500' 
                                            : 'bg-red-500 border-red-500'
                                        }`}>
                                          <CheckCircle className={`w-3 h-3 ${
                                            item.design_ready ? 'text-white' : 'text-transparent'
                                          }`} />
                                        </div>
                                        <div>
                                          <div className={`text-sm font-medium ${
                                            item.design_ready ? 'text-green-800' : 'text-red-800'
                                          }`}>
                                            {item.design_ready ? 'Design Ready' : 'Not Ready Design'}
                                          </div>
                                          <div className={`text-xs ${
                                            item.design_ready ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            {item.design_ready ? 'Design work completed' : 'Design work pending'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Custom Design Status */}
                                    <div className={`p-3 rounded-lg border-2 transition-colors ${
                                      item.design_need_custom 
                                        ? 'bg-purple-50 border-purple-200' 
                                        : 'bg-blue-50 border-blue-200'
                                    }`}>
                                      <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                                          item.design_need_custom 
                                            ? 'bg-purple-500 border-purple-500' 
                                            : 'bg-blue-500 border-blue-500'
                                        }`}>
                                          <div className={`w-2 h-2 rounded-full ${
                                            item.design_need_custom ? 'bg-white' : 'bg-white'
                                          }`} />
                                        </div>
                                        <div>
                                          <div className={`text-sm font-medium ${
                                            item.design_need_custom ? 'text-purple-800' : 'text-blue-800'
                                          }`}>
                                            {item.design_need_custom ? 'Custom Design Required' : 'Standard Design'}
                                          </div>
                                          <div className={`text-xs ${
                                            item.design_need_custom ? 'text-purple-600' : 'text-blue-600'
                                          }`}>
                                            {item.design_need_custom ? 'Need customized design work' : 'Use standard templates'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Custom Requirements Section */}
                                  {item.customRequirements && (
                                    <div className="mt-4 pt-3 border-t border-gray-200">
                                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2 mb-2">
                                          <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mt-2"></div>
                                          <div>
                                            <h6 className="text-sm font-medium text-yellow-800 mb-1">
                                              Custom Design Requirements
                                            </h6>
                                            <div className="bg-white rounded-md p-3 border border-yellow-300">
                                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                {item.customRequirements}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Design Configuration Summary */}
                                  {!item.customRequirements && (
                                    <div className="mt-4 pt-3 border-t border-gray-200">
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex gap-6">
                                          <div>
                                            <span className="text-gray-600">Status:</span>
                                            <span className={`ml-1 font-medium ${
                                              item.design_ready ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                              {item.design_ready ? 'Ready' : 'Pending'}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Type:</span>
                                            <span className={`ml-1 font-medium ${
                                              item.design_need_custom ? 'text-purple-600' : 'text-blue-600'
                                            }`}>
                                              {item.design_need_custom ? 'Custom' : 'Standard'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-gray-500">
                                          Configured in Product Config
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Design Files */}
                                {item.design_files_manifest && item.design_files_manifest.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Design Files:</p>
                                    <div className="space-y-2">
                                      {item.design_files_manifest.map((file: any, fileIndex: number) => (
                                        <div key={fileIndex} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0">
                                              {file.type?.startsWith('image/') ? (
                                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                  <FileText className="w-4 h-4 text-green-600" />
                                                </div>
                                              ) : file.type === 'application/pdf' ? (
                                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                                  <FileText className="w-4 h-4 text-red-600" />
                                                </div>
                                              ) : (
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                  <FileText className="w-4 h-4 text-blue-600" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                              <p className="text-xs text-gray-500">
                                                {file.size ? `${Math.round(file.size / 1024)} KB` : 'Unknown size'} • 
                                                {file.type || 'Unknown type'}
                                              </p>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleDesignFilePreview([file])}
                                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                                          >
                                            <Eye className="w-4 h-4" />
                                            Preview
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        onClick={() => handleDesignFilePreview(item.design_files_manifest || [])}
                                        className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                      >
                                        <Eye className="w-4 h-4" />
                                        View All Design Files
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Show when no design files */}
                                {(!item.design_files_manifest || item.design_files_manifest.length === 0) && (
                                  <div className="mt-3">
                                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-center">
                                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                      <p className="text-sm text-gray-500">No design files uploaded for this product</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Design Upload Section */}
                  {showFileUpload && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Upload Design Files</h3>
                      <div className="space-y-4">
                        {/* File Upload */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg,.svg,.ai,.psd"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="w-full"
                          />
                        </div>

                        {/* Uploaded Files */}
                        {uploadedFiles.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Uploaded Files:</h4>
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2">
                                <span className="text-sm text-gray-600">{file.name}</span>
                                <button
                                  onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Approval Notes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Approval Notes (Optional)
                          </label>
                          <textarea
                            value={approvalNotes}
                            onChange={(e) => setApprovalNotes(e.target.value)}
                            placeholder="Add any notes for the sales team..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button
                            onClick={handleRequestApproval}
                            disabled={uploadedFiles.length === 0}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Request Approval
                          </Button>
                          <button
                            onClick={() => setShowFileUpload(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Design Approval Status */}
                  {approvalStatus && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Design Approval Status
                      </h3>
                      <div className="flex items-center gap-4">
                        {approvalStatus === 'pending' && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="text-yellow-700 font-medium">Pending Sales Review</span>
                            <span className="text-sm text-gray-600">⏳ Waiting for approval</span>
                          </div>
                        )}
                        {approvalStatus === 'approved' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-700 font-medium">Design Approved</span>
                            <span className="text-sm text-gray-600">✅ Ready for production</span>
                          </div>
                        )}
                        {approvalStatus === 'rejected' && (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-red-700 font-medium">Design Rejected</span>
                            <span className="text-sm text-gray-600">❌ Please revise and resubmit</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowFileUpload(!showFileUpload)}
                      disabled={approvalStatus === 'pending'}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        approvalStatus === 'pending'
                          ? 'bg-gray-400 text-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {showFileUpload ? 'Hide Upload' : 'Upload Design Files'}
                    </button>
                    <Button
                      onClick={handleSendToProduction}
                      disabled={!canSendToProduction}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                        canSendToProduction
                          ? 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105'
                          : 'bg-gray-400 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      Send to Production
                      {!canSendToProduction && (
                        <span className="ml-2 text-xs">
                          {approvalStatus === 'pending' ? '(Pending Approval)' : 
                           approvalStatus === 'rejected' ? '(Rejected)' : '(Not Approved)'}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </div>

          {/* Design File Preview Modal */}
          {showDesignPreview && (
            <DesignFilePreview
              files={previewFiles}
                orderId={orderDetails?.id || undefined}
              onClose={() => setShowDesignPreview(false)}
            />
          )}
        </Dialog>
      </Transition>
    </div>
  );
}