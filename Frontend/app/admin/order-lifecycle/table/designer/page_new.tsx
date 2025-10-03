"use client";

import { useMemo, useState, useCallback, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { Button } from "@/app/components/Button";
import { toast, Toaster } from "react-hot-toast";
import { ordersApi, Order } from "@/lib/orders-api";
import { requestDesignApproval, sendToProduction, uploadOrderFile, getOrderFiles } from "@/lib/workflowApi";
import { CheckCircle, Send, Upload, FileText, Package, X, AlertCircle } from "lucide-react";

/* Types */
type Urgency = "Urgent" | "High" | "Normal" | "Low";

interface Row {
  id: number;
  orderCode: string;
  title: string;
  date: string;
  time: string;
  urgency: Urgency;
  status: string;
  stage: string;
  clientName: string;
  assignedDesigner: string;
  items: any[];
  designApprovals: any[];
  salesPerson: string;
}

const urgencyBadge = (u: Urgency) => {
  const classes: Record<Urgency, string> = {
    Urgent: "bg-red-100 text-red-700 border-red-200",
    High: "bg-amber-100 text-amber-800 border-amber-200",
    Normal: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Low: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs border font-medium ${classes[u]}`}>{u}</span>;
};

const toLocalYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const normalizeToYMD = (input: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalYMD(d);
};

const mapOrderToRow = (order: Order): Row => {
  return {
    id: order.id,
    orderCode: order.order_code,
    title: order.items?.map(item => `${item.quantity}x ${item.name}`).join(', ') || order.specs || 'Order',
    date: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : '',
    time: order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
    urgency: (order.urgency || "Normal") as Urgency,
    status: order.status,
    stage: order.stage,
    clientName: order.client_name,
    assignedDesigner: order.assigned_designer || '',
    items: order.items || [],
    designApprovals: order.design_approvals || [],
    salesPerson: order.quotation?.sales_person || order.assigned_sales_person || '',
  };
};

export default function DesignerOrdersTablePage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  
  // Designer form data
  const [designStatus, setDesignStatus] = useState('In Progress');
  const [internalComments, setInternalComments] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; url: string; id: number }>>([]);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [sendingToProduction, setSendingToProduction] = useState(false);

  const currentUsername = typeof window !== 'undefined' ? localStorage.getItem('admin_username') || '' : '';

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiOrders = await ordersApi.getOrders();
      
      // Filter orders for designer
      const designerOrders = apiOrders.filter((order: Order) => 
        order.stage === 'design' || 
        order.assigned_designer === currentUsername ||
        order.status === 'sent_to_designer' ||
        order.status === 'sent_for_approval' ||
        order.status === 'sent_to_production'
      );
      
      const convertedOrders = designerOrders.map(mapOrderToRow);
      setOrders(convertedOrders);
    } catch (err: any) {
      setError(err.message || "Failed to fetch orders");
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [currentUsername]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Load files when opening an order
  const loadOrderFiles = async (orderId: number) => {
    try {
      const files = await getOrderFiles(orderId);
      const designFiles = files.filter(f => f.file_type === 'design' || f.file_type === 'final');
      setUploadedFiles(designFiles.map(f => ({
        name: f.file_name,
        size: f.file_size,
        url: f.file_url,
        id: f.id,
      })));
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const openForRow = useCallback((row: Row) => {
    setSelected(row);
    setDesignStatus('In Progress');
    setInternalComments('');
    setApprovalNotes('');
    setUploadedFiles([]);
    loadOrderFiles(row.id);
    setIsOpen(true);
  }, []);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setUploadingFile(true);

    try {
      const uploadedFile = await uploadOrderFile(
        selected.id,
        file,
        'design',
        'design',
        'Design file uploaded by designer',
        '',
        ['admin', 'sales', 'designer']
      );

      setUploadedFiles(prev => [...prev, {
        name: uploadedFile.file_name,
        size: uploadedFile.file_size,
        url: uploadedFile.file_url,
        id: uploadedFile.id,
      }]);

      toast.success('File uploaded successfully!');
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  // Request approval from sales
  const handleRequestApproval = async () => {
    if (!selected) return;

    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one design file before requesting approval');
      return;
    }

    setRequestingApproval(true);
    try {
      await requestDesignApproval(selected.id, {
        designer: currentUsername,
        sales_person: selected.salesPerson,
        design_files_manifest: uploadedFiles.map(f => ({
          name: f.name,
          size: f.size,
          url: f.url,
        })),
        approval_notes: approvalNotes,
      });

      toast.success('Approval request sent to sales!');
      setIsOpen(false);
      await fetchOrders();
    } catch (error: any) {
      toast.error(`Failed to request approval: ${error.message}`);
    } finally {
      setRequestingApproval(false);
    }
  };

  // Send to production (only after approval)
  const handleSendToProduction = async () => {
    if (!selected) return;

    if (!confirm(`Send order ${selected.orderCode} to production?`)) return;

    setSendingToProduction(true);
    try {
      await sendToProduction(selected.id);
      toast.success('Order sent to production successfully!');
      setIsOpen(false);
      await fetchOrders();
    } catch (error: any) {
      toast.error(`Failed to send to production: ${error.message}`);
    } finally {
      setSendingToProduction(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((r) => {
      const okDay = selectedDate ? normalizeToYMD(r.date) === selectedDate : true;
      const hay = [String(r.id), r.orderCode, r.title, r.date, r.time, r.urgency].join(" ").toLowerCase();
      const okQuery = q.trim() === "" ? true : hay.includes(q.toLowerCase());
      return okDay && okQuery;
    });
  }, [orders, selectedDate, q]);

  // Categorize orders
  const pendingApproval = filtered.filter(r => 
    (r.status === 'sent_to_designer' || r.stage === 'design') && 
    !r.designApprovals.some((a: any) => a.approval_status === 'pending' || a.approval_status === 'approved')
  );
  
  const sentForApproval = filtered.filter(r => 
    r.status === 'sent_for_approval' || 
    r.designApprovals.some((a: any) => a.approval_status === 'pending')
  );
  
  const approved = filtered.filter(r => 
    r.designApprovals.some((a: any) => a.approval_status === 'approved') &&
    r.status !== 'sent_to_production'
  );
  
  const completed = filtered.filter(r => r.status === 'sent_to_production');

  // Helper functions
  const isApproved = (row: Row) => row.designApprovals.some((a: any) => a.approval_status === 'approved');
  const hasPendingApproval = (row: Row) => row.designApprovals.some((a: any) => a.approval_status === 'pending');
  const isRejected = (row: Row) => row.designApprovals.some((a: any) => a.approval_status === 'rejected');
  const getRejectionReason = (row: Row) => {
    const rejected = row.designApprovals.find((a: any) => a.approval_status === 'rejected');
    return rejected?.rejection_reason || '';
  };

  const Section = ({ title, rows, emptyMessage }: { title: string; rows: Row[]; emptyMessage?: string }) => (
    <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-4 bg-gray-50 border-b">
        <h2 className="text-xl font-bold text-[#891F1A] flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-gray-600">({rows.length})</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#7a1b17] text-white">
              <th className="px-3 py-3 text-center w-20">Sr No</th>
              <th className="px-3 py-3 text-center w-36">Order Code</th>
              <th className="px-3 py-3 text-left">Order Details</th>
              <th className="px-3 py-3 text-center w-36">Client</th>
              <th className="px-3 py-3 text-center w-36">Date</th>
              <th className="px-3 py-3 text-center w-28">Time</th>
              <th className="px-3 py-3 text-center w-40">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={7}>
                  {emptyMessage || "No records"}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openForRow(r)}
                >
                  <td className="px-3 py-3 text-center">{i + 1}</td>
                  <td className="px-3 py-3 text-center font-medium text-gray-900">{r.orderCode}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900">{r.title}</div>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700">{r.clientName}</td>
                  <td className="px-3 py-3 text-center">{normalizeToYMD(r.date) || r.date}</td>
                  <td className="px-3 py-3 text-center">{r.time}</td>
                  <td className="px-3 py-3 text-center">{urgencyBadge(r.urgency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-black">
      <Toaster position="top-right" />
      <DashboardNavbar />
      <div className="h-4 sm:h-5 md:h-6" />

      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-[#891F1A] mb-6">Designer Dashboard</h1>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded border bg-white"
          />
          <input
            placeholder="Search orders..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="px-3 py-2 rounded border bg-white flex-1"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#891F1A]"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <div className="text-red-600">Error: {error}</div>
            <Button onClick={fetchOrders} className="mt-4 bg-[#891F1A] text-white hover:bg-red-900">
              Retry
            </Button>
          </div>
        )}

        {/* Order Sections */}
        {!loading && !error && (
          <div className="grid grid-cols-1 gap-6">
            <Section 
              title="Pending Approval Orders" 
              rows={pendingApproval} 
              emptyMessage="No new orders assigned to you"
            />
            <Section 
              title="Sent for Approval" 
              rows={sentForApproval} 
              emptyMessage="No designs waiting for sales approval"
            />
            <Section 
              title="Approved Orders" 
              rows={approved} 
              emptyMessage="No approved designs ready to send to production"
            />
            <Section 
              title="Completed Orders" 
              rows={completed} 
              emptyMessage="No orders sent to production yet"
            />
          </div>
        )}
      </div>

      {/* Designer Work Modal */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-5xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <Dialog.Title className="text-xl font-semibold text-[#891F1A]">
                          Design Work - {selected?.orderCode}
                        </Dialog.Title>
                        <p className="text-sm text-gray-600 mt-1">
                          Client: {selected?.clientName} • {selected?.title}
                        </p>
                      </div>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Rejection Notice */}
                    {selected && isRejected(selected) && (
                      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Design Rejected</p>
                            <p className="text-sm text-red-700 mt-1">{getRejectionReason(selected)}</p>
                            <p className="text-xs text-red-600 mt-2">Please revise and submit again</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Products Section */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <Package className="w-4 h-4" />
                        Products in Order
                      </h3>
                      {selected?.items && selected.items.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {selected.items.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-8 h-8 text-gray-400" />
                                )}
                              </div>
                              <p className="font-medium text-sm text-gray-900 truncate" title={item.name}>{item.name}</p>
                              <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                              {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                              {item.attributes && Object.keys(item.attributes).length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 font-medium mb-1">Attributes:</p>
                                  {Object.entries(item.attributes).map(([key, value]) => (
                                    <div key={key} className="text-xs text-gray-600">
                                      <span className="font-medium">{key}:</span> {value as string}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No products in this order</p>
                      )}
                    </div>

                    {/* Design Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Design Status
                      </label>
                      <select
                        value={designStatus}
                        onChange={(e) => setDesignStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
                      >
                        <option>In Progress</option>
                        <option>Ready for Review</option>
                        <option>Revisions Needed</option>
                        <option>Completed</option>
                      </select>
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Design Files
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#891F1A] transition-colors">
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="design-file-upload"
                          accept="image/*,.pdf,.ai,.psd,.sketch,.fig"
                          disabled={uploadingFile}
                        />
                        <label
                          htmlFor="design-file-upload"
                          className="cursor-pointer inline-flex flex-col items-center"
                        >
                          <Upload className={`w-8 h-8 mb-2 ${uploadingFile ? 'text-gray-300 animate-pulse' : 'text-gray-400'}`} />
                          <span className="text-sm text-gray-600 font-medium">
                            {uploadingFile ? 'Uploading...' : 'Click to upload design files'}
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            PDF, AI, PSD, Sketch, Figma, Images supported
                          </span>
                        </label>
                      </div>

                      {/* Uploaded Files */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Uploaded Files ({uploadedFiles.length}):</p>
                          {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-900 truncate">{file.name}</span>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0 ml-2"
                              >
                                View
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Internal Comments */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Internal Comments (for your reference)
                      </label>
                      <textarea
                        value={internalComments}
                        onChange={(e) => setInternalComments(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#891F1A] resize-none"
                        placeholder="Add notes for yourself..."
                      />
                    </div>

                    {/* Approval Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes for Sales (shown when requesting approval)
                      </label>
                      <textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#891F1A] resize-none"
                        placeholder="Explain what you've done, any special considerations, etc..."
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm">
                        {selected && hasPendingApproval(selected) && (
                          <div className="flex items-center gap-2 text-yellow-600 font-medium">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            Waiting for sales approval...
                          </div>
                        )}
                        {selected && isApproved(selected) && !hasPendingApproval(selected) && (
                          <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Design approved! Ready to send to production
                          </div>
                        )}
                        {selected && isRejected(selected) && (
                          <div className="flex items-center gap-2 text-red-600 font-medium">
                            <AlertCircle className="w-4 h-4" />
                            Design rejected - revisions needed
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setIsOpen(false)}
                        >
                          Close
                        </Button>

                        {/* Request Approval - only if not yet requested and not approved */}
                        {selected && !hasPendingApproval(selected) && !isApproved(selected) && (
                          <Button
                            onClick={handleRequestApproval}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                            disabled={requestingApproval || uploadedFiles.length === 0}
                          >
                            <Send className="w-4 h-4" />
                            {requestingApproval ? 'Requesting...' : 'Request Approval'}
                          </Button>
                        )}

                        {/* Send to Production - only after approval */}
                        {selected && isApproved(selected) && (
                          <Button
                            onClick={handleSendToProduction}
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                            disabled={sendingToProduction}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {sendingToProduction ? 'Sending...' : 'Send to Production'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}



