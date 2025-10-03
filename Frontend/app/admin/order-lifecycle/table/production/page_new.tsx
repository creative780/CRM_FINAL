"use client";

import { useMemo, useState, useCallback, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { Button } from "@/app/components/Button";
import { toast, Toaster } from "react-hot-toast";
import { ordersApi, Order } from "@/lib/orders-api";
import { assignMachines, getMachineQueue, getOrderFiles } from "@/lib/workflowApi";
import { CheckCircle, Settings, Package, Clock, X, FileText, Play, Pause } from "lucide-react";

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
  items: any[];
  machineAssignments: any[];
}

interface ProductMachineAssignment {
  productId: number;
  productName: string;
  productSku: string;
  productQuantity: number;
  machineId: string;
  machineName: string;
  estimatedTimeMinutes: number;
}

// Hardcoded machine list (can be moved to API later)
const AVAILABLE_MACHINES = [
  { id: "laser-01", name: "Laser Cutter 1", type: "laser" },
  { id: "laser-02", name: "Laser Cutter 2", type: "laser" },
  { id: "printer-01", name: "Digital Printer 1", type: "printer" },
  { id: "printer-02", name: "Digital Printer 2", type: "printer" },
  { id: "uv-01", name: "UV Flatbed Printer", type: "uv" },
  { id: "plotter-01", name: "Vinyl Plotter", type: "plotter" },
  { id: "cutter-01", name: "Guillotine Cutter", type: "cutter" },
  { id: "laminator-01", name: "Hot Laminator", type: "laminator" },
];

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
    items: order.items || [],
    machineAssignments: order.machine_assignments || [],
  };
};

export default function ProductionOrdersTablePage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  
  // Per-product machine assignments
  const [productAssignments, setProductAssignments] = useState<Record<string, { machineId: string; estimatedTime: number }>>({});
  const [assigningMachines, setAssigningMachines] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  
  // Design files
  const [designFiles, setDesignFiles] = useState<Array<{ name: string; size: number; url: string; id: number }>>([]);

  const currentUsername = typeof window !== 'undefined' ? localStorage.getItem('admin_username') || '' : '';

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiOrders = await ordersApi.getOrders();
      
      // Filter orders for production
      const productionOrders = apiOrders.filter((order: Order) => 
        order.status === 'sent_to_production' ||
        order.status === 'getting_ready' ||
        order.stage === 'printing'
      );
      
      const convertedOrders = productionOrders.map(mapOrderToRow);
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
      const designFilesFiltered = files.filter(f => f.file_type === 'design' || f.file_type === 'final');
      setDesignFiles(designFilesFiltered.map(f => ({
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
    
    // Initialize assignments from existing data
    const existingAssignments: Record<string, { machineId: string; estimatedTime: number }> = {};
    row.machineAssignments.forEach((ma: any) => {
      const key = `${ma.product_name}_${ma.product_sku}`;
      existingAssignments[key] = {
        machineId: ma.machine_id,
        estimatedTime: ma.estimated_time_minutes || 60,
      };
    });
    
    // For products without assignments, initialize empty
    row.items.forEach((item: any) => {
      const key = `${item.name}_${item.sku || ''}`;
      if (!existingAssignments[key]) {
        existingAssignments[key] = {
          machineId: '',
          estimatedTime: 60,
        };
      }
    });
    
    setProductAssignments(existingAssignments);
    setDesignFiles([]);
    loadOrderFiles(row.id);
    setIsOpen(true);
  }, []);

  // Handle machine assignment for a product
  const handleMachineChange = (productKey: string, machineId: string) => {
    setProductAssignments(prev => ({
      ...prev,
      [productKey]: {
        ...prev[productKey],
        machineId,
      },
    }));
  };

  // Handle estimated time change for a product
  const handleTimeChange = (productKey: string, time: number) => {
    setProductAssignments(prev => ({
      ...prev,
      [productKey]: {
        ...prev[productKey],
        estimatedTime: time,
      },
    }));
  };

  // Assign machines (save to backend)
  const handleAssignMachines = async () => {
    if (!selected) return;

    // Validate all products have machines assigned
    const unassigned = selected.items.filter((item: any) => {
      const key = `${item.name}_${item.sku || ''}`;
      return !productAssignments[key]?.machineId;
    });

    if (unassigned.length > 0) {
      toast.error(`Please assign machines to all products. ${unassigned.length} product(s) pending.`);
      return;
    }

    setAssigningMachines(true);
    try {
      const assignments: ProductMachineAssignment[] = selected.items.map((item: any) => {
        const key = `${item.name}_${item.sku || ''}`;
        const assignment = productAssignments[key];
        const machine = AVAILABLE_MACHINES.find(m => m.id === assignment.machineId);
        
        return {
          productId: item.id,
          productName: item.name,
          productSku: item.sku || '',
          productQuantity: item.quantity,
          machineId: assignment.machineId,
          machineName: machine?.name || assignment.machineId,
          estimatedTimeMinutes: assignment.estimatedTime,
        };
      });

      const assignmentsWithUser = assignments.map(assignment => ({
        product_name: assignment.productName,
        product_sku: assignment.productSku,
        product_quantity: assignment.productQuantity,
        machine_id: assignment.machineId,
        machine_name: assignment.machineName,
        estimated_time_minutes: assignment.estimatedTimeMinutes,
        assigned_by: currentUsername,
        notes: '',
      }));

      await assignMachines(selected.id, assignmentsWithUser);

      toast.success('Machines assigned successfully!');
      await fetchOrders(); // Refresh orders
    } catch (error: any) {
      toast.error(`Failed to assign machines: ${error.message}`);
    } finally {
      setAssigningMachines(false);
    }
  };

  // Confirm order and send to admin
  const handleConfirmOrder = async () => {
    if (!selected) return;

    // Check if all machines are assigned
    const unassigned = selected.items.filter((item: any) => {
      const key = `${item.name}_${item.sku || ''}`;
      return !productAssignments[key]?.machineId;
    });

    if (unassigned.length > 0) {
      toast.error('Please assign machines to all products before confirming the order.');
      return;
    }

    if (!confirm(`Confirm production for order ${selected.orderCode}?`)) return;

    setConfirmingOrder(true);
    try {
      // First ensure machines are assigned
      await handleAssignMachines();
      
      // Then update order status to getting_ready
      await ordersApi.updateOrder(selected.id, { stage: 'getting_ready', status: 'getting_ready' });
      
      toast.success('Order confirmed and sent to admin!');
      setIsOpen(false);
      await fetchOrders(); // Refresh orders
    } catch (error: any) {
      toast.error(`Failed to confirm order: ${error.message}`);
    } finally {
      setConfirmingOrder(false);
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
  const newOrders = filtered.filter(r => r.status === 'sent_to_production' && r.machineAssignments.length === 0);
  const inProgress = filtered.filter(r => r.machineAssignments.length > 0 && r.status !== 'getting_ready');
  const completed = filtered.filter(r => r.status === 'getting_ready');

  // Check if all products have machines assigned
  const allMachinesAssigned = (row: Row) => {
    return row.items.every((item: any) => {
      const key = `${item.name}_${item.sku || ''}`;
      return productAssignments[key]?.machineId;
    });
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
        <h1 className="text-4xl font-bold text-[#891F1A] mb-6">Production Dashboard</h1>

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
              title="New Orders" 
              rows={newOrders} 
              emptyMessage="No new orders from designers"
            />
            <Section 
              title="In Progress" 
              rows={inProgress} 
              emptyMessage="No orders currently in production"
            />
            <Section 
              title="Completed" 
              rows={completed} 
              emptyMessage="No completed orders ready for delivery"
            />
          </div>
        )}
      </div>

      {/* Production Work Modal */}
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
                  <div className="px-6 py-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <Dialog.Title className="text-xl font-semibold text-[#891F1A]">
                          Production Setup - {selected?.orderCode}
                        </Dialog.Title>
                        <p className="text-sm text-gray-600 mt-1">
                          Client: {selected?.clientName} • {selected?.items.length} product(s)
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
                    {/* Design Files */}
                    {designFiles.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4" />
                          Design Files from Designer
                        </h3>
                        <div className="space-y-2">
                          {designFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
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
                      </div>
                    )}

                    {/* Per-Product Machine Assignment */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <Settings className="w-4 h-4" />
                        Assign Machines Per Product
                      </h3>
                      
                      <div className="space-y-4">
                        {selected?.items.map((item: any, idx: number) => {
                          const key = `${item.name}_${item.sku || ''}`;
                          const assignment = productAssignments[key] || { machineId: '', estimatedTime: 60 };
                          
                          return (
                            <div key={idx} className="bg-white border border-gray-300 rounded-lg p-4">
                              {/* Product Info */}
                              <div className="flex items-start gap-4 mb-4">
                                <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-8 h-8 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                  {item.sku && <p className="text-sm text-gray-500">SKU: {item.sku}</p>}
                                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                                    <div className="mt-2 text-xs text-gray-600">
                                      {Object.entries(item.attributes).map(([key, value]) => (
                                        <span key={key} className="inline-block mr-3">
                                          <span className="font-medium">{key}:</span> {value as string}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Machine Selection */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Machine <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    value={assignment.machineId}
                                    onChange={(e) => handleMachineChange(key, e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
                                  >
                                    <option value="">-- Select Machine --</option>
                                    {AVAILABLE_MACHINES.map((machine) => (
                                      <option key={machine.id} value={machine.id}>
                                        {machine.name} ({machine.type})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Estimated Time (minutes) <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={assignment.estimatedTime}
                                    onChange={(e) => handleTimeChange(key, parseInt(e.target.value) || 60)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
                                    placeholder="Enter time in minutes"
                                  />
                                </div>
                              </div>

                              {/* Assignment Status */}
                              {assignment.machineId && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>
                                    Assigned to{" "}
                                    <strong>
                                      {AVAILABLE_MACHINES.find(m => m.id === assignment.machineId)?.name}
                                    </strong>
                                    {" "}for {assignment.estimatedTime} min
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-gray-600">
                        {selected && allMachinesAssigned(selected) ? (
                          <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4" />
                            All machines assigned!
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600 font-medium">
                            <Clock className="w-4 h-4" />
                            Assign machines to all products
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

                        <Button
                          onClick={handleAssignMachines}
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                          disabled={assigningMachines}
                        >
                          <Settings className="w-4 h-4" />
                          {assigningMachines ? 'Saving...' : 'Save Assignments'}
                        </Button>

                        <Button
                          onClick={handleConfirmOrder}
                          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                          disabled={confirmingOrder || !selected || !allMachinesAssigned(selected)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {confirmingOrder ? 'Confirming...' : 'Confirm Order'}
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



