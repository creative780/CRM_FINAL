"use client";

import { useMemo, useState, useCallback, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/app/components/Button";
import QuotationFormWithPreview from "@/app/components/quotation/QuotationFormWithPreview";
import OrderIntakeForm from "@/app/components/order-stages/OrderIntakeForm";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { ordersApi, Order } from "@/lib/orders-api";
import { toast } from "react-hot-toast";
import { Trash2 } from "lucide-react";

// 🔑 import global store
import { useOrderStore } from "@/app/stores/useOrderStore";

type Urgency = "Urgent" | "High" | "Normal" | "Low";
type Status = "New" | "Active" | "Completed";

interface Row {
  id: string;
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

const normalizeToYMD = (input: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalYMD(d);
};

export default function OrdersTablePage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  // ✅ use global store instead of local useState
  const { formData, setFormData } = useOrderStore();

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customFormData, setCustomFormData] = useState<any>({
    clientName: "",
    productType: "",
    specs: "",
    urgency: "Normal",
  });

  const [savedOrders, setSavedOrders] = useState<Row[]>([]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiOrders = await ordersApi.getOrders();
        
        // Convert API orders to Row format
        const convertedOrders: Row[] = apiOrders.map(order => ({
          id: order.order_id,
          title: `${order.product_type} - ${order.client_name}`,
          date: order.created_at.split('T')[0],
          time: order.created_at.split('T')[1].split('.')[0].substring(0, 5),
          urgency: order.urgency as Urgency,
          status: order.status === 'new' ? 'New' : order.status === 'in_progress' ? 'Active' : 'Completed' as Status,
        }));
        
        setSavedOrders(convertedOrders);
        setOrders(convertedOrders);
      } catch (err: any) {
        setError(err.message || 'Failed to load orders');
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
    const onUpdate = () => {
      loadOrders();
      if (isCustomOpen) setIsCustomOpen(false);
    };
    window.addEventListener("orders:updated", onUpdate);
    return () => window.removeEventListener("orders:updated", onUpdate);
  }, [isCustomOpen]);

  const openForRow = useCallback((row: Row) => {
    setSelected(row);
    setFormData((prev: any) => ({
      ...prev,
      orderId: row.id,
      projectDescription: row.title,
      date: normalizeToYMD(row.date) || row.date,
      products: prev?.products || [],
    }));
    setIsOpen(true);
  }, [setFormData]);

  const createOrder = async (data: any) => {
    try {
      setLoading(true);
      const newOrder = await ordersApi.createOrder({
        client_name: data.clientName,
        product_type: data.productType,
        specs: data.specs,
        urgency: data.urgency,
      });
      
      // Refresh orders list
      const apiOrders = await ordersApi.getOrders();
      const convertedOrders: Row[] = apiOrders.map(order => ({
        id: order.order_id,
        title: `${order.product_type} - ${order.client_name}`,
        date: order.created_at.split('T')[0],
        time: order.created_at.split('T')[1].split('.')[0].substring(0, 5),
        urgency: order.urgency as Urgency,
        status: order.status === 'new' ? 'New' : order.status === 'in_progress' ? 'Active' : 'Completed' as Status,
      }));
      
      setSavedOrders(convertedOrders);
      setOrders(convertedOrders);
      setIsCustomOpen(false);
      setCustomFormData({
        clientName: "",
        productType: "",
        specs: "",
        urgency: "Normal",
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      console.error('Error creating order:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
      await ordersApi.deleteOrder(parseInt(orderId));
      
      // Refresh orders list
      const apiOrders = await ordersApi.getOrders();
      const convertedOrders: Row[] = apiOrders.map(order => ({
        id: order.order_id,
        title: `${order.product_type} - ${order.client_name}`,
        date: order.created_at.split('T')[0],
        time: order.created_at.split('T')[1].split('.')[0].substring(0, 5),
        urgency: order.urgency as Urgency,
        status: order.status === 'new' ? 'New' : order.status === 'in_progress' ? 'Active' : 'Completed' as Status,
      }));
      
      setSavedOrders(convertedOrders);
      setOrders(convertedOrders);
      toast.success('Order deleted successfully!');
    } catch (err: any) {
      toast.error(`Failed to delete order: ${err.message}`);
      console.error('Error deleting order:', err);
    }
  };

  const ALL: Row[] = useMemo(() => {
    return savedOrders;
  }, [savedOrders]);

  const filtered = useMemo(() => {
    return ALL.filter((r) => {
      const okDay = selectedDate ? normalizeToYMD(r.date) === selectedDate : true;
      const hay = [r.id, r.title, r.date, r.time, r.urgency].join(" ").toLowerCase();
      const okQuery = q.trim() === "" ? true : hay.includes(q.toLowerCase());
      return okDay && okQuery;
    });
  }, [ALL, selectedDate, q]);

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
                <tr
                  key={r.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-3 py-3 text-center">{i + 1}</td>
                  <td className="px-3 py-3 text-center font-medium text-gray-900">{r.id}</td>
                  <td className="px-3 py-3 text-center cursor-pointer" onClick={() => openForRow(r)}>{r.title}</td>
                  <td className="px-3 py-3 text-center">{normalizeToYMD(r.date) || r.date}</td>
                  <td className="px-3 py-3 text-center">{r.time}</td>
                  <td className="px-3 py-3 text-center">{urgencyBadge(r.urgency)}</td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOrder(r.id);
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
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
      {/* Navbar */}
      <DashboardNavbar />
      <div className="h-4 sm:h-5 md:h-6" />

      <div className="max-w-7xl mx-auto pb-16">
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-4xl font-bold text-[#891F1A]">Sales Orders</h1>
          <Button
            onClick={() => setIsCustomOpen(true)}
            className="bg-[#891F1A] text-white hover:bg-red-900 transition"
          >
            + Add a Custom Order
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col md:flex-row gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded border bg-white"
          />
          <input
            placeholder="Search (Order Id, order, date, time, urgency)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="px-3 py-2 rounded border bg-white flex-1"
          />
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="mt-6 text-center py-8">
            <div className="text-lg text-gray-600">Loading orders...</div>
          </div>
        )}
        
        {error && (
          <div className="mt-6 text-center py-8">
            <div className="text-lg text-red-600">Error: {error}</div>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-2 bg-[#891F1A] text-white hover:bg-[#6c1714]"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Sections */}
        {!loading && !error && (
          <div className="mt-6 grid grid-cols-1 gap-6">
            <Section title="New Orders" rows={by("New")} />
            <Section title="Active Orders" rows={by("Active")} />
            <Section title="Completed Orders" rows={by("Completed")} />
          </div>
        )}
      </div>

      {/* Quotation Popup */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 z-10 flex items-center justify-between">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-[#891F1A]">
                    Quotation for {selected?.id}
                  </Dialog.Title>
                  <p className="text-xs text-gray-500">
                    {selected?.title} · {selected && (normalizeToYMD(selected.date) || selected.date)}
                    {selected && " · "} {selected?.time}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* 🔥 Sales fills everything here, and it writes into global formData */}
                <QuotationFormWithPreview formData={formData} setFormData={setFormData} />
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                  <label htmlFor="sendTo" className="text-sm font-medium text-gray-700">
                    Send to:
                  </label>
                  <select
                    id="sendTo"
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#891F1A]/30 focus:border-[#891F1A] transition"
                    value={formData?.sendTo ?? "Sales"}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...(prev || {}),
                        sendTo: e.target.value as "Sales" | "Designer" | "Production",
                      }))
                    }
                  >
                    <option value="Sales">Sales</option>
                    <option value="Designer">Designer</option>
                    <option value="Production">Production</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selected) return;
                      
                      try {
                        // Update order in backend
                        await ordersApi.updateOrder(parseInt(selected.id), {
                          client_name: formData?.clientName || selected.title.split(' - ')[1] || '',
                          product_type: formData?.productType || selected.title.split(' - ')[0] || '',
                          specs: formData?.specifications || '',
                          urgency: formData?.urgency || selected.urgency,
                          status: selected.status === 'Completed' ? 'completed' :
                                 selected.status === 'Active' ? 'in_progress' : 'new',
                        });

                        // Refresh orders list
                        const apiOrders = await ordersApi.getOrders();
                        const convertedOrders: Row[] = apiOrders.map(order => ({
                          id: order.order_id,
                          title: `${order.product_type} - ${order.client_name}`,
                          date: order.created_at.split('T')[0],
                          time: order.created_at.split('T')[1].split('.')[0].substring(0, 5),
                          urgency: order.urgency as Urgency,
                          status: order.status === 'new' ? 'New' : order.status === 'in_progress' ? 'Active' : 'Completed' as Status,
                        }));
                        
                        setSavedOrders(convertedOrders);
                        setOrders(convertedOrders);
                        setIsOpen(false);
                        toast.success('Order updated successfully!');
                      } catch (err: any) {
                        toast.error(`Failed to update order: ${err.message}`);
                        console.error('Error updating order:', err);
                      }
                    }}
                    disabled={loading}
                    className="bg-[#891F1A] text-white hover:bg-[#6c1714]"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Custom Order Popup */}
      <Transition show={isCustomOpen} as={Fragment}>
        <Dialog onClose={() => setIsCustomOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b bg-white sticky top-0 z-10">
                <Dialog.Title className="text-lg font-semibold text-[#891F1A]">
                  Add a Custom Order
                </Dialog.Title>
                <button
                  onClick={() => setIsCustomOpen(false)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <OrderIntakeForm
                  formData={customFormData}
                  setFormData={setCustomFormData}
                  requireProductsAndFiles
                />
              </div>
              
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                <Button
                  onClick={() => setIsCustomOpen(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createOrder(customFormData)}
                  disabled={loading}
                  className="bg-[#891F1A] text-white hover:bg-[#6c1714]"
                >
                  {loading ? 'Creating...' : 'Create Order'}
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
