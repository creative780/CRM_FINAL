"use client";

import { useMemo, useState, useCallback, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { Button } from "@/app/components/Button";
import { toast, Toaster } from "react-hot-toast";
import { ordersApi, Order } from "@/lib/orders-api";
import { 
  getOrderFiles, 
  approveDesign, 
  assignMachines, 
  getPendingApprovals 
} from "@/lib/workflowApi";
import {
  CheckCircle,
  X,
  FileText,
  Package,
  AlertCircle,
  Settings,
  Eye,
  Edit,
  Clock,
  User,
  MapPin,
  DollarSign,
} from "lucide-react";

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
  assignedSalesPerson: string;
  assignedDesigner: string;
  assignedProductionPerson: string;
  items: any[];
  quotation: any;
  designStage: any;
  printingStage: any;
  deliveryStage: any;
  designApprovals: any[];
  machineAssignments: any[];
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

const statusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
    sent_to_sales: { label: "Sales", color: "bg-blue-100 text-blue-700" },
    sent_to_designer: { label: "Design", color: "bg-purple-100 text-purple-700" },
    sent_for_approval: { label: "Approval", color: "bg-yellow-100 text-yellow-700" },
    sent_to_production: { label: "Production", color: "bg-orange-100 text-orange-700" },
    getting_ready: { label: "Ready", color: "bg-cyan-100 text-cyan-700" },
    sent_for_delivery: { label: "Delivery", color: "bg-indigo-100 text-indigo-700" },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
  };

  const config = statusMap[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
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
    assignedSalesPerson: order.assigned_sales_person || order.quotation?.sales_person || '',
    assignedDesigner: order.assigned_designer || '',
    assignedProductionPerson: order.assigned_production_person || '',
    items: order.items || [],
    quotation: order.quotation || null,
    designStage: order.design_stage || null,
    printingStage: order.printing_stage || null,
    deliveryStage: order.delivery_stage || null,
    designApprovals: order.design_approvals || [],
    machineAssignments: order.machine_assignments || [],
  };
};

export default function AdminOrdersTablePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  
  // Admin quick actions
  const [orderFiles, setOrderFiles] = useState<Array<{ name: string; size: number; url: string; id: number; file_type: string; uploaded_by: string }>>([]);
  const [quickAction, setQuickAction] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiOrders = await ordersApi.getOrders();
      const convertedOrders = apiOrders.map(mapOrderToRow);
      setOrders(convertedOrders);
    } catch (err: any) {
      setError(err.message || "Failed to fetch orders");
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Load files when opening an order
  const loadOrderFiles = async (orderId: number) => {
    try {
      const files = await getOrderFiles(orderId);
      setOrderFiles(files.map(f => ({
        name: f.file_name,
        size: f.file_size,
        url: f.file_url,
        id: f.id,
        file_type: f.file_type,
        uploaded_by: f.uploaded_by,
      })));
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const openForRow = useCallback((row: Row) => {
    setSelected(row);
    setOrderFiles([]);
    loadOrderFiles(row.id);
    setIsOpen(true);
  }, []);

  // Admin quick action: Navigate to order at current stage
  const handleOpenAtCurrentStage = () => {
    if (!selected) return;
    setIsOpen(false);
    // Navigate to order lifecycle page with this order
    router.push(`/admin/order-lifecycle?orderId=${selected.id}`);
  };

  // Admin quick action: Force approve design
  const handleForceApproveDesign = async () => {
    if (!selected) return;
    
    const pendingApproval = selected.designApprovals.find(a => a.approval_status === 'pending');
    if (!pendingApproval) {
      toast.error('No pending approval found');
      return;
    }

    if (!confirm(`Force approve design for order ${selected.orderCode}?`)) return;

    setProcessing(true);
    try {
      await approveDesign(pendingApproval.id, 'approve');
      toast.success('Design approved successfully!');
      await fetchOrders();
      setIsOpen(false);
    } catch (error: any) {
      toast.error(`Failed to approve: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Admin quick action: Change status directly
  const handleChangeStatus = async (newStatus: string) => {
    if (!selected) return;

    if (!confirm(`Change order ${selected.orderCode} status to ${newStatus}?`)) return;

    setProcessing(true);
    try {
      await ordersApi.updateOrder(selected.id, { status: newStatus, stage: newStatus });
      toast.success(`Status changed to ${newStatus}!`);
      await fetchOrders();
      setIsOpen(false);
    } catch (error: any) {
      toast.error(`Failed to change status: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((r) => {
      const okDay = selectedDate ? normalizeToYMD(r.date) === selectedDate : true;
      const hay = [String(r.id), r.orderCode, r.title, r.clientName, r.assignedSalesPerson, r.assignedDesigner].join(" ").toLowerCase();
      const okQuery = q.trim() === "" ? true : hay.includes(q.toLowerCase());
      return okDay && okQuery;
    });
  }, [orders, selectedDate, q]);

  // Categorize orders by status
  const byStatus = (status: string) => filtered.filter(r => r.status === status);
  
  const draftOrders = byStatus('draft');
  const salesOrders = byStatus('sent_to_sales');
  const designOrders = [...byStatus('sent_to_designer'), ...byStatus('sent_for_approval')];
  const productionOrders = [...byStatus('sent_to_production'), ...byStatus('getting_ready')];
  const deliveryOrders = [...byStatus('sent_for_delivery'), ...byStatus('delivered')];

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
              <th className="px-3 py-3 text-center w-32">Order Code</th>
              <th className="px-3 py-3 text-left">Order Details</th>
              <th className="px-3 py-3 text-center w-36">Client</th>
              <th className="px-3 py-3 text-center w-28">Date</th>
              <th className="px-3 py-3 text-center w-32">Status</th>
              <th className="px-3 py-3 text-center w-32">Urgency</th>
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
                    {r.assignedSalesPerson && (
                      <div className="text-xs text-gray-500 mt-1">
                        Sales: {r.assignedSalesPerson}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700">{r.clientName}</td>
                  <td className="px-3 py-3 text-center">{normalizeToYMD(r.date) || r.date}</td>
                  <td className="px-3 py-3 text-center">{statusBadge(r.status)}</td>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-[#891F1A]">Admin Order Management</h1>
          <div className="text-sm text-gray-600">
            Total Orders: <span className="font-bold">{orders.length}</span>
          </div>
        </div>

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
              title="Draft Orders" 
              rows={draftOrders} 
              emptyMessage="No draft orders"
            />
            <Section 
              title="Sales Stage" 
              rows={salesOrders} 
              emptyMessage="No orders in sales stage"
            />
            <Section 
              title="Design Stage" 
              rows={designOrders} 
              emptyMessage="No orders in design stage"
            />
            <Section 
              title="Production Stage" 
              rows={productionOrders} 
              emptyMessage="No orders in production stage"
            />
            <Section 
              title="Delivery Stage" 
              rows={deliveryOrders} 
              emptyMessage="No orders in delivery stage"
            />
          </div>
        )}
      </div>

      {/* Admin Order Details Modal */}
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
                <Dialog.Panel className="w-full max-w-6xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <Dialog.Title className="text-xl font-semibold text-[#891F1A]">
                          Admin Control Panel - {selected?.orderCode}
                        </Dialog.Title>
                        <p className="text-sm text-gray-600 mt-1">
                          Full access to all order phases and controls
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
                    {/* Order Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                          <User className="w-4 h-4" />
                          <span className="text-xs font-medium">Client</span>
                        </div>
                        <p className="font-semibold text-gray-900">{selected?.clientName}</p>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-purple-700 mb-2">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-medium">Status</span>
                        </div>
                        <p className="font-semibold text-gray-900">{statusBadge(selected?.status || '')}</p>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-700 mb-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-xs font-medium">Total</span>
                        </div>
                        <p className="font-semibold text-gray-900">AED {selected?.quotation?.grand_total || 0}</p>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-amber-700 mb-2">
                          <Package className="w-4 h-4" />
                          <span className="text-xs font-medium">Products</span>
                        </div>
                        <p className="font-semibold text-gray-900">{selected?.items.length || 0}</p>
                      </div>
                    </div>

                    {/* Assignments */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned Personnel</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <span className="text-xs text-gray-600">Sales:</span>
                          <p className="text-sm font-medium text-gray-900">{selected?.assignedSalesPerson || 'Not assigned'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Designer:</span>
                          <p className="text-sm font-medium text-gray-900">{selected?.assignedDesigner || 'Not assigned'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Production:</span>
                          <p className="text-sm font-medium text-gray-900">{selected?.assignedProductionPerson || 'Not assigned'}</p>
                        </div>
                      </div>
                    </div>

                    {/* All Files (Admin Sees Everything) */}
                    {orderFiles.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4" />
                          All Order Files ({orderFiles.length})
                        </h3>
                        <div className="space-y-2">
                          {orderFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {file.file_type} • by {file.uploaded_by} • {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
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
                      </div>
                    )}

                    {/* Products */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <Package className="w-4 h-4" />
                        Products in Order
                      </h3>
                      {selected?.items && selected.items.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {selected.items.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white border border-gray-300 rounded-lg p-3">
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
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No products in this order</p>
                      )}
                    </div>

                    {/* Admin Quick Actions */}
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-red-900 flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4" />
                        Admin Quick Actions (Override Controls)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Button
                          onClick={() => handleChangeStatus('sent_to_sales')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          disabled={processing}
                        >
                          → Sales
                        </Button>
                        <Button
                          onClick={() => handleChangeStatus('sent_to_designer')}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                          disabled={processing}
                        >
                          → Design
                        </Button>
                        <Button
                          onClick={handleForceApproveDesign}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                          disabled={processing || !selected?.designApprovals.some(a => a.approval_status === 'pending')}
                        >
                          Force Approve
                        </Button>
                        <Button
                          onClick={() => handleChangeStatus('sent_to_production')}
                          className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                          disabled={processing}
                        >
                          → Production
                        </Button>
                        <Button
                          onClick={() => handleChangeStatus('getting_ready')}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                          disabled={processing}
                        >
                          → Ready
                        </Button>
                        <Button
                          onClick={() => handleChangeStatus('delivered')}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          disabled={processing}
                        >
                          → Delivered
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-gray-600">
                        <p>Current Stage: <span className="font-semibold">{selected?.stage}</span></p>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setIsOpen(false)}
                        >
                          Close
                        </Button>

                        <Button
                          onClick={handleOpenAtCurrentStage}
                          className="bg-[#891F1A] hover:bg-red-900 text-white flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Open in Order Lifecycle
                        </Button>
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

