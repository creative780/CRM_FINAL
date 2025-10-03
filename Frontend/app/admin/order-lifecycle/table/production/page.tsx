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
  machineAssignments?: any[];
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

export default function ProductionDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Row | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productAssignments, setProductAssignments] = useState<Record<string, { machineId: string; estimatedTime: number }>>({});
  const [designFiles, setDesignFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Enhanced production orders fetching with better filtering
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🎯 Fetching production orders...');
      
      // Use existing working orders endpoint with enhanced filtering
      const apiOrders = await ordersApi.getOrders();
      
      // Enhanced filtering for production orders with better logic
      const productionOrders = apiOrders.filter((order: Order) => {
        const statusMatch = order.status === 'sent_to_production' || 
                           order.status === 'getting_ready' || 
                           order.status === 'active' ||
                           order.status === 'sent_to_admin' ||
                           order.status === 'sent_for_delivery';
        
        const stageMatch = order.stage === 'printing' || 
                          order.stage === 'approval' || 
                          order.stage === 'delivery';
        
        return statusMatch || stageMatch;
      });

      console.log(`📊 Found ${productionOrders.length} production orders out of ${apiOrders.length} total orders`);
      
      // Debug: Log sample order data
      if (productionOrders.length > 0) {
        console.log('🔍 Sample production order:', {
          id: productionOrders[0].id,
          order_code: productionOrders[0].order_code,
          status: productionOrders[0].status,
          stage: productionOrders[0].stage,
          machine_assignments: productionOrders[0].machine_assignments?.length || 0
        });
      }

      const formattedRows: Row[] = productionOrders.map((order: Order) => ({
        id: order.id,
        orderCode: order.order_code,
        title: `${order.client_name} - ${order.order_code}`,
        date: new Date(order.created_at).toLocaleDateString(),
        time: new Date(order.created_at).toLocaleTimeString(),
        urgency: (order.urgency || 'Normal') as Urgency,
        status: order.status,
        stage: order.stage,
        clientName: order.client_name,
        items: order.items || [],
        machineAssignments: order.machine_assignments || [],
      }));

      setRows(formattedRows);
      
      // Debug: Log filtered categories
      console.log('📋 Category breakdown:', {
        newOrders: formattedRows.filter(row => 
          (row.status === 'sent_to_production' || row.status === 'active') && 
          row.stage === 'printing' && 
          (!row.machineAssignments || row.machineAssignments.length === 0)
        ).length,
        inProgressOrders: formattedRows.filter(row => 
          (row.status === 'sent_to_production' || row.status === 'active') && 
          row.stage === 'printing' && 
          row.machineAssignments && row.machineAssignments.length > 0
        ).length,
        completedOrders: formattedRows.filter(row => 
          row.status === 'getting_ready' || 
          row.status === 'sent_to_admin' || 
          row.status === 'sent_for_delivery' ||
          row.stage === 'approval' ||
          row.stage === 'delivery'
        ).length
      });
      
      // Show enhanced success message
      toast.success(`🎯 Loaded ${productionOrders.length} orders in production queue`, {
        icon: '🏭',
        duration: 4000,
      });
      
    } catch (error) {
      console.error('Failed to fetch production orders:', error);
      toast.error(`Failed to load production orders: ${error.message}`, {
        icon: '❌'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Listen for real-time order updates
  useEffect(() => {
    const handleOrderUpdate = (event: CustomEvent) => {
      const { orderId, orderCode, status, stage } = event.detail;
      console.log('📨 Order update received:', { orderId, orderCode, status, stage });
      
      // Check if this is a new production order
      if ((status === 'sent_to_production' || status === 'active') && stage === 'printing') {
        console.log('🎯 New order sent to production, refreshing queue...');
        // Refresh orders when new order sent to production
        fetchOrders();
        
        // Show notification
        toast.success(`🎯 New order ${orderCode} added to production queue!`, {
          duration: 6000,
          icon: '🎉'
        });
      }
    };
    
    // Listen for order status changes
    window.addEventListener('order-sent-to-production', handleOrderUpdate as EventListener);
    
    return () => {
      window.removeEventListener('order-sent-to-production', handleOrderUpdate as EventListener);
    };
  }, [fetchOrders]);

  // Fetch design files for selected order
  const fetchDesignFiles = useCallback(async (orderId: number) => {
    try {
      setFilesLoading(true);
      const files = await getOrderFiles(orderId);
      setDesignFiles(files);
    } catch (error) {
      console.error('Failed to fetch design files:', error);
      toast.error('Failed to load design files');
      setDesignFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // Handle order selection
  const handleOrderClick = useCallback((row: Row) => {
    setSelectedOrder(row);
    setIsModalOpen(true);
    setProductAssignments({});
    
    // Pre-populate existing assignments
    if (row.machineAssignments && row.machineAssignments.length > 0) {
      const existingAssignments: Record<string, { machineId: string; estimatedTime: number }> = {};
      row.machineAssignments.forEach((assignment: any) => {
        const key = `${assignment.product_name}_${assignment.product_sku || ''}`;
        existingAssignments[key] = {
          machineId: assignment.machine_id,
          estimatedTime: assignment.estimated_time_minutes || 60,
        };
      });
      setProductAssignments(existingAssignments);
    }
    
    fetchDesignFiles(row.id);
  }, [fetchDesignFiles]);

  // Handle machine assignment change
  const handleMachineChange = useCallback((productKey: string, machineId: string) => {
    setProductAssignments(prev => ({
      ...prev,
      [productKey]: {
        ...prev[productKey],
        machineId,
        estimatedTime: prev[productKey]?.estimatedTime || 60,
      },
    }));
  }, []);

  // Handle time change
  const handleTimeChange = useCallback((productKey: string, time: number) => {
    setProductAssignments(prev => ({
      ...prev,
      [productKey]: {
        ...prev[productKey],
        estimatedTime: time,
      },
    }));
  }, []);

  // Validate all products have machines assigned
  const validateAssignments = useCallback((order: Row) => {
    if (!order.items || order.items.length === 0) return true;
    
    return order.items.every(item => {
      const key = `${item.name}_${item.sku || ''}`;
      const assignment = productAssignments[key];
      return assignment && assignment.machineId && assignment.estimatedTime > 0;
    });
  }, [productAssignments]);

  // Handle machine assignment save
  const handleAssignMachines = useCallback(async () => {
    if (!selectedOrder) return;

    try {
      setAssigning(true);
      
      const assignments: ProductMachineAssignment[] = selectedOrder.items.map(item => {
        const key = `${item.name}_${item.sku || ''}`;
        const assignment = productAssignments[key];
        const machine = AVAILABLE_MACHINES.find(m => m.id === assignment.machineId);
        
        return {
          productId: item.id,
          productName: item.name,
          productSku: item.sku || '',
          productQuantity: item.quantity || 1,
          machineId: assignment.machineId,
          machineName: machine?.name || 'Unknown Machine',
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
        assigned_by: localStorage.getItem('admin_username') || 'production_user',
        notes: '',
      }));

      await assignMachines(selectedOrder.id, assignmentsWithUser);

      toast.success('Machine assignments saved successfully!');
      await fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Failed to assign machines:', error);
      toast.error('Failed to save machine assignments');
    } finally {
      setAssigning(false);
    }
  }, [selectedOrder, productAssignments, fetchOrders]);

  // Handle order confirmation
  const handleConfirmOrder = useCallback(async () => {
    if (!selectedOrder) return;

    // Validate all products have machines
    if (!validateAssignments(selectedOrder)) {
      toast.error('Please assign machines to all products before confirming');
      return;
    }

    try {
      setConfirming(true);
      
      // First save assignments if not already saved
      await handleAssignMachines();
      
      // Then update order status
      await ordersApi.updateOrder(selectedOrder.id, {
        stage: 'printing',
        status: 'getting_ready',
      });

      toast.success('Order confirmed and sent to admin!');
      setIsModalOpen(false);
      await fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Failed to confirm order:', error);
      toast.error('Failed to confirm order');
    } finally {
      setConfirming(false);
    }
  }, [selectedOrder, validateAssignments, handleAssignMachines, fetchOrders]);

  // Filter orders by category
  const newOrders = useMemo(() => 
    rows.filter(row => 
      (row.status === 'sent_to_production' || row.status === 'active') && 
      row.stage === 'printing' && 
      (!row.machineAssignments || row.machineAssignments.length === 0)
    ),
    [rows]
  );

  const inProgressOrders = useMemo(() => 
    rows.filter(row => 
      (row.status === 'sent_to_production' || row.status === 'active') && 
      row.stage === 'printing' && 
      row.machineAssignments && row.machineAssignments.length > 0
    ),
    [rows]
  );

  const completedOrders = useMemo(() => 
    rows.filter(row => 
      row.status === 'getting_ready' || 
      row.status === 'sent_to_admin' || 
      row.status === 'sent_for_delivery' ||
      row.stage === 'approval' ||
      row.stage === 'delivery'
    ),
    [rows]
  );

  // Get urgency color
  const getUrgencyColor = (urgency: Urgency) => {
    switch (urgency) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Normal': return 'bg-blue-100 text-blue-800';
      case 'Low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent_to_production': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'getting_ready': return 'bg-green-100 text-green-800';
      case 'sent_to_admin': return 'bg-purple-100 text-purple-800';
      case 'sent_for_delivery': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <Toaster position="top-right" />
      
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Production Dashboard</h1>
          <p className="text-gray-600">Manage production orders and machine assignments</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading orders...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* New Orders */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  New Orders ({newOrders.length})
                </h2>
                <p className="text-sm text-gray-600">Orders from designers requiring machine assignment</p>
              </div>
              <div className="p-4">
                {newOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No new orders from designers yet.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {newOrders.map((row) => (
                      <div
                        key={row.id}
                        onClick={() => handleOrderClick(row)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-gray-900">{row.title}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(row.urgency)}`}>
                                {row.urgency}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row.status)}`}>
                                {row.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {row.clientName} • {row.items.length} product(s)
                            </p>
                            <p className="text-xs text-gray-500">
                              {row.date} at {row.time}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">Click to assign machines</span>
        </div>
        </div>
      </div>
                    ))}
                  </div>
                      )}
                    </div>
                  </div>

            {/* In Progress Orders */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  In Progress ({inProgressOrders.length})
                </h2>
                <p className="text-sm text-gray-600">Orders with machine assignments being worked on</p>
                          </div>
                          <div className="p-4">
                {inProgressOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No orders in progress.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {inProgressOrders.map((row) => (
                      <div
                        key={row.id}
                        onClick={() => handleOrderClick(row)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-gray-900">{row.title}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(row.urgency)}`}>
                                {row.urgency}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row.status)}`}>
                                {row.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {row.clientName} • {row.items.length} product(s) • {row.machineAssignments?.length || 0} machine(s) assigned
                            </p>
                            <p className="text-xs text-gray-500">
                              {row.date} at {row.time}
                            </p>
                                  </div>
                          <div className="flex items-center gap-2">
                            <Play className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-500">In production</span>
                                  </div>
                                </div>
                            </div>
                    ))}
                              </div>
                            )}
                          </div>
                        </div>

            {/* Completed Orders */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Completed ({completedOrders.length})
                </h2>
                <p className="text-sm text-gray-600">Orders ready for delivery</p>
                          </div>
                          <div className="p-4">
                {completedOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No completed orders.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {completedOrders.map((row) => (
                      <div
                        key={row.id}
                        onClick={() => handleOrderClick(row)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-gray-900">{row.title}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(row.urgency)}`}>
                                {row.urgency}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row.status)}`}>
                                {row.status.replace('_', ' ')}
                              </span>
                                        </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {row.clientName} • {row.items.length} product(s) • Ready for delivery
                            </p>
                            <p className="text-xs text-gray-500">
                              {row.date} at {row.time}
                            </p>
                                      </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-500">Ready</span>
                                </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
        )}
                          </div>

      {/* Order Details Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Order Details - {selectedOrder?.orderCode}
                  </Dialog.Title>

                  {selectedOrder && (
                    <div className="space-y-6">
                      {/* Order Info */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Client</label>
                            <p className="text-sm text-gray-900">{selectedOrder.clientName}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Urgency</label>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(selectedOrder.urgency)}`}>
                              {selectedOrder.urgency}
                            </span>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Status</label>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedOrder.status)}`}>
                              {selectedOrder.status.replace('_', ' ')}
                            </span>
                              </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Date</label>
                            <p className="text-sm text-gray-900">{selectedOrder.date} at {selectedOrder.time}</p>
                                  </div>
                              </div>
                            </div>

                      {/* Design Files */}
                            <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">Design Files</h4>
                        {filesLoading ? (
                          <div className="text-center py-4 text-gray-500">Loading design files...</div>
                        ) : designFiles.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3">
                            {designFiles.map((file: any) => {
                              const imgSrc = file.url || file.previewUrl;
                              return (
                                <div key={file.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-3">
                                    {imgSrc ? (
                                      <img
                                        src={imgSrc}
                                        alt={file.name}
                                        className="w-12 h-12 object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-blue-600" />
                              </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {file.name}
                                  </div>
                                      <div className="text-xs text-gray-500">
                                        {formatFileSize(file.size)}
                              </div>
                            </div>
                          </div>
                        </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            No design files uploaded by designer yet.
                          </div>
                        )}
                      </div>

                      {/* Products and Machine Assignment */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">Products & Machine Assignment</h4>
                        {selectedOrder.items && selectedOrder.items.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3">
                            {selectedOrder.items.map((item: any) => {
                              const key = `${item.name}_${item.sku || ''}`;
                              const assignment = productAssignments[key];
                              const isAssigned = assignment && assignment.machineId;
                              
                              return (
                                <div key={key} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-start gap-3 mb-3">
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-16 h-16 object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                        <Package className="w-8 h-8 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {item.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        SKU: {item.sku || 'N/A'} • Qty: {item.quantity || 1}
                                      </div>
                                      {item.attributes && Object.keys(item.attributes).length > 0 && (
                                        <div className="mt-1">
                                          {Object.entries(item.attributes).map(([attr, value]) => (
                                            <span key={attr} className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded mr-1 mb-1">
                                              {attr}: {String(value)}
                                            </span>
                                          ))}
                      </div>
                                      )}
                    </div>
                                    {isAssigned && (
                                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    )}
                  </div>

                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Machine
                      </label>
                      <select
                                        value={assignment?.machineId || ''}
                                        onChange={(e) => handleMachineChange(key, e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="">Select Machine</option>
                                        {AVAILABLE_MACHINES.map((machine) => (
                                          <option key={machine.id} value={machine.id}>
                                            {machine.name}
                                          </option>
                                        ))}
                      </select>
                    </div>
                                    
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Estimated Time (minutes)
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={assignment?.estimatedTime || 60}
                                        onChange={(e) => handleTimeChange(key, parseInt(e.target.value) || 60)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            No products in this order.
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-center gap-4">
                        <Button
                          onClick={handleAssignMachines}
                          disabled={assigning || !validateAssignments(selectedOrder)}
                          className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {assigning ? 'Saving...' : 'Save Assignments'}
                        </Button>
                        
                        <Button
                          onClick={handleConfirmOrder}
                          disabled={confirming || !validateAssignments(selectedOrder)}
                          className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {confirming ? 'Confirming...' : 'Confirm Order'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={() => setIsModalOpen(false)}
                      variant="outline"
                    >
                      Close
                    </Button>
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


