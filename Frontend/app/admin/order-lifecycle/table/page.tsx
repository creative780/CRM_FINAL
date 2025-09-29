"use client";

import { useMemo, useState, useCallback, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/app/components/Button";
import QuotationFormWithPreview from "@/app/components/quotation/QuotationFormWithPreview";
import OrderIntakeForm, {
  createOrderIntakeDefaults,
  OrderIntakeFormValues,
} from "@/app/components/order-stages/OrderIntakeForm";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { ordersApi, Order } from "@/lib/orders-api";
import { toast } from "react-hot-toast";
import { Trash2 } from "lucide-react";
import ProductSearchModal from "@/app/components/modals/ProductSearchModal";
import ProductConfigModal from "@/app/components/modals/ProductConfigModal";
import { BaseProduct, ConfiguredProduct } from "@/app/types/products";

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

const normalizeToYMD = (input: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalYMD(d);
};

const statusMap: Record<string, Status> = {
  new: "New",
  active: "Active",
  in_progress: "Active",
  completed: "Completed",
  delivered: "Completed",
};

const summarizeItems = (items?: Order['items']) => {
  if (!items || items.length === 0) return 'Custom Order';
  return items
    .map((item) => {
      const qty = item.quantity && item.quantity > 0 ? `${item.quantity} x ` : '';
      return `${qty}${item.name}`;
    })
    .join(', ');
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

/**
 * The orders table page displays existing orders grouped by status and
 * exposes functionality to create, update and delete orders.  It also
 * demonstrates how to use the globally shared form store when opening the
 * quotation dialog.
 */
export default function OrdersTablePage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<Row[]>([]);
  const [savedOrders, setSavedOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  // Local state for quotation data (order-specific)
  const [quotationData, setQuotationData] = useState<any>({});

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customFormData, setCustomFormData] = useState<OrderIntakeFormValues>(() => createOrderIntakeDefaults());

  const [selectedProducts, setSelectedProducts] = useState<ConfiguredProduct[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [pendingBaseProduct, setPendingBaseProduct] = useState<BaseProduct | null>(null);
  const [pendingInitialQty, setPendingInitialQty] = useState<number | undefined>(undefined);
  const [pendingInitialAttributes, setPendingInitialAttributes] = useState<Record<string, string> | undefined>(undefined);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingToSales, setSendingToSales] = useState(false);

  const serializeSelectedProducts = (items: ConfiguredProduct[] = selectedProducts) =>
    items.map((item) => ({
      product_id: item.productId,
      name: item.name,
      quantity: item.quantity,
      attributes: item.attributes,
      sku: item.sku,
    }));

  const handleAddProductClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setShowSearchModal(true);
  };

  const resetPendingProduct = () => {
    setPendingBaseProduct(null);
    setPendingInitialQty(undefined);
    setPendingInitialAttributes(undefined);
    setEditingProductId(null);
  };

  const handlePickBaseProduct = (product: BaseProduct, qty = 1) => {
    setPendingBaseProduct(product);
    setPendingInitialQty(qty);
    setPendingInitialAttributes(undefined);
    setEditingProductId(null);
    setShowSearchModal(false);
    setShowConfigModal(true);
  };

  const handleConfirmProduct = (configured: ConfiguredProduct) => {
    setSelectedProducts((prev) => {
      const index = prev.findIndex((item) => item.id === configured.id);
      return index >= 0
        ? prev.map((item, idx) => (idx === index ? configured : item))
        : [...prev, configured];
    });
    resetPendingProduct();
  };

  const handleRemoveProduct = (id: string) => {
    setSelectedProducts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEditProduct = (id: string) => {
    const existing = selectedProducts.find((item) => item.id === id);
    if (!existing) return;
    setPendingBaseProduct({
      id: existing.productId,
      name: existing.name,
      imageUrl: existing.imageUrl,
    });
    setPendingInitialQty(existing.quantity);
    setPendingInitialAttributes(existing.attributes);
    setEditingProductId(existing.id);
    setShowConfigModal(true);
  };

  const handleCloseSearchModal = () => {
    setShowSearchModal(false);
  };

  const handleCloseConfigModal = () => {
    setShowConfigModal(false);
    resetPendingProduct();
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiOrders = await ordersApi.getOrders();

        // Convert API orders to Row format
        const convertedOrders = mapOrders(apiOrders);

        setSavedOrders(convertedOrders);
        setOrders(convertedOrders);
      } catch (err: any) {
        setError(err.message || "Failed to load orders");
        console.error("Error loading orders:", err);
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

  useEffect(() => {
    if (!isCustomOpen) {
      setSelectedProducts([]);
      resetPendingProduct();
      setShowSearchModal(false);
      setShowConfigModal(false);
    }
  }, [isCustomOpen]);

  const openForRow = useCallback(
    async (row: Row) => {
      setSelected(row);
      setIsOpen(true);
      
      try {
        // Load full order data from API
        const orderData = await ordersApi.getOrder(row.id);
        console.log('=== LOADING ORDER DATA ===');
        console.log('Order ID:', row.id);
        console.log('Order data keys:', Object.keys(orderData));
        console.log('Company Name:', orderData.company_name);
        console.log('Phone:', orderData.phone);
        console.log('Pricing Status:', orderData.pricing_status);
        console.log('Order data stringified:', JSON.stringify(orderData, null, 2));
        
        // Load quotation data
        let quotationData = null;
        try {
          const quotationResponse = await ordersApi.getQuotation(row.id);
          quotationData = quotationResponse;
          console.log('=== LOADING QUOTATION DATA ===');
          console.log('Order ID:', row.id);
          console.log('Quotation response:', quotationResponse);
          console.log('Quotation response type:', typeof quotationResponse);
          console.log('Quotation response keys:', Object.keys(quotationResponse));
          console.log('quotationData.labour_cost:', quotationData?.labour_cost);
          console.log('quotationData.finishing_cost:', quotationData?.finishing_cost);
          console.log('quotationData.paper_cost:', quotationData?.paper_cost);
          console.log('quotationData keys:', quotationData ? Object.keys(quotationData) : 'undefined');
          console.log('quotationData stringified:', JSON.stringify(quotationData, null, 2));
        } catch (quotationError) {
          console.log('No quotation found for order, will create new one');
        }
        
          // Set form data with loaded order data
          const formDataToSet = {
            orderId: orderData.order_code,
            _orderId: orderData.id,
            projectDescription: row.title,
            date: normalizeToYMD(row.date) || row.date,
            clientName: orderData.client_name,
            clientCompany: orderData.company_name || "",
            clientPhone: orderData.phone || "",
            email: orderData.email || "",
            address: orderData.address || "",
            specifications: orderData.specs,
            urgency: orderData.urgency,
            status: orderData.pricing_status || "Not Priced",
            stage: orderData.stage,
            // Load quotation data if available
            labourCost: quotationData?.labour_cost || 0,
            finishingCost: quotationData?.finishing_cost || 0,
            paperCost: quotationData?.paper_cost || 0,
            machineCost: quotationData?.machine_cost || 0,
            designCost: quotationData?.design_cost || 0,
            deliveryCost: quotationData?.delivery_cost || 0,
            otherCharges: quotationData?.other_charges || 0,
            discount: quotationData?.discount || 0,
            advancePaid: quotationData?.advance_paid || 0,
            quotationNotes: quotationData?.quotation_notes || "",
            customField: quotationData?.custom_field || "",
            grandTotal: quotationData?.grand_total || 0,
            finalPrice: quotationData?.grand_total || 0,
            // Load items
            items: orderData.items || [],
            products: orderData.items || [],
            // Default sendTo value
            sendTo: "Sales",
          };
        
        console.log('Setting form data with quotation values:', {
          labourCost: formDataToSet.labourCost,
          finishingCost: formDataToSet.finishingCost,
          paperCost: formDataToSet.paperCost,
          machineCost: formDataToSet.machineCost,
          designCost: formDataToSet.designCost,
          deliveryCost: formDataToSet.deliveryCost,
          otherCharges: formDataToSet.otherCharges,
          discount: formDataToSet.discount,
          advancePaid: formDataToSet.advancePaid,
        });
        
        setQuotationData(formDataToSet);
      } catch (error) {
        console.error('Failed to load order data:', error);
        toast.error('Failed to load order data');
        // Fallback to basic data
        setQuotationData({
          orderId: row.orderCode,
          _orderId: row.id,
          projectDescription: row.title,
          date: normalizeToYMD(row.date) || row.date,
          sendTo: "Sales",
        });
      }
    },
    [],
  );

  const openOrderLifecycle = useCallback(
    (row: Row) => {
      // Navigate to order lifecycle page with order ID
      window.location.href = `/admin/order-lifecycle?orderId=${row.id}`;
    },
    [],
  );

  const createOrder = async (data: OrderIntakeFormValues) => {
  const clientName = (data?.clientName ?? "").trim();
  const itemsPayload = serializeSelectedProducts();
  const orderDetails = (data?.orderDetails ?? "").trim();
  const specsInput = data?.specifications;
  const specs =
    typeof specsInput === "string" && specsInput.trim().length > 0 ? specsInput.trim() : orderDetails;
  const urgency = data?.urgency ?? "Normal";

  if (!clientName) {
    toast.error("Please enter a client name");
    return;
  }

  if (itemsPayload.length === 0) {
    toast.error("Please add at least one product before creating the order");
    return;
  }

  try {
    setLoading(true);
    setError(null);
    await ordersApi.createOrder({
      clientName,
      specs,
      urgency,
      items: itemsPayload,
    });

    const apiOrders = await ordersApi.getOrders();
    const convertedOrders = mapOrders(apiOrders);

    setSavedOrders(convertedOrders);
    setOrders(convertedOrders);
    setIsCustomOpen(false);
    setCustomFormData(createOrderIntakeDefaults());
    setSelectedProducts([]);
    toast.success("Order created successfully!");
  } catch (err: any) {
    setError(err.message || "Failed to create order");
    toast.error(`Failed to create order: ${err.message}`);
    console.error("Error creating order:", err);
  } finally {
    setLoading(false);
  }
};

  const ensureOrderForCustom = async (data: OrderIntakeFormValues): Promise<number | null> => {
  const clientName = (data?.clientName ?? "").trim();
  const itemsPayload = serializeSelectedProducts();
  const orderDetails = (data?.orderDetails ?? "").trim();
  const specsInput = data?.specifications;
  const specs =
    typeof specsInput === "string" && specsInput.trim().length > 0 ? specsInput.trim() : orderDetails;
  const urgency = data?.urgency ?? "Normal";

  if (!clientName) {
    toast.error("Please enter a client name");
    return null;
  }

  if (itemsPayload.length === 0) {
    toast.error("Please add at least one product before saving");
    return null;
  }

  try {
    if (!data?._orderId) {
      const created = await ordersApi.createOrder({ clientName, specs, urgency, items: itemsPayload });
      setCustomFormData((prev) => ({
        ...(prev || {}),
        _orderId: created.id,
        orderId: created.order_id,
      } as any));
      return created.id;
    }

    await ordersApi.updateOrder(data._orderId as number, {
      client_name: clientName,
      specs,
      urgency,
      items: itemsPayload,
    });
    return data._orderId as number;
  } catch (err: any) {
    toast.error(err.message || "Failed to save draft");
    return null;
  }
};;

  const handleSaveDraftCustom = async () => {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      const orderId = await ensureOrderForCustom(customFormData);
      if (!orderId) return;

      const apiOrders = await ordersApi.getOrders();
      const convertedOrders = mapOrders(apiOrders);
      setSavedOrders(convertedOrders);
      setOrders(convertedOrders);
      toast.success("Draft saved");
    } catch (err: any) {
      toast.error(`Failed to save draft: ${err.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSendToSalesCustom = async () => {
    if (sendingToSales) return;
    setSendingToSales(true);
    try {
      const orderId = await ensureOrderForCustom(customFormData);
      if (!orderId) return;
      await ordersApi.updateOrderStage(orderId, "quotation", {});

      const apiOrders = await ordersApi.getOrders();
      const convertedOrders = mapOrders(apiOrders);
      setSavedOrders(convertedOrders);
      setOrders(convertedOrders);
      toast.success("Sent to Sales");
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message || "Unknown error"}`);
    } finally {
      setSendingToSales(false);
    }
  };

  const deleteOrder = async (orderId: number, orderCode?: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      await ordersApi.deleteOrder(orderId);

      // Refresh orders list
      const apiOrders = await ordersApi.getOrders();
      const convertedOrders = mapOrders(apiOrders);

      setSavedOrders(convertedOrders);
      setOrders(convertedOrders);
      toast.success(orderCode ? `Order ${orderCode} deleted successfully!` : "Order deleted successfully!");
    } catch (err: any) {
      toast.error(`Failed to delete order: ${err.message}`);
      console.error("Error deleting order:", err);
    }
  };

  const ALL: Row[] = useMemo(() => {
    return savedOrders;
  }, [savedOrders]);

  const filtered = useMemo(() => {
    return ALL.filter((r) => {
      const okDay = selectedDate ? normalizeToYMD(r.date) === selectedDate : true;
      const hay = [String(r.id), r.orderCode, r.title, r.date, r.time, r.urgency]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-black">
      {/* Navbar */}
      <DashboardNavbar />
      <div className="h-4 sm:h-5 md:h-6" />

      <div className="max-w-7xl mx-auto pb-16">
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-4xl font-bold text-[#891F1A]">Sales Orders</h1>
          <Button onClick={() => setIsCustomOpen(true)} className="bg-[#891F1A] text-white hover:bg-red-900 transition">
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
            <Button onClick={() => window.location.reload()} className="mt-2 bg-[#891F1A] text-white hover:bg-[#6c1714]">
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
        <Dialog onClose={() => {
          setIsOpen(false);
          setQuotationData({}); // Clear quotation data when closing
        }} className="relative z-50">
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 z-10 flex items-center justify-between">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-[#891F1A]">
                    Quotation for {selected?.orderCode}
                  </Dialog.Title>
                  <p className="text-xs text-gray-500">
                    {selected?.title} Â· {selected && (normalizeToYMD(selected.date) || selected.date)}
                    {selected && " Â· "} {selected?.time}
                  </p>
                </div>
                <button onClick={() => {
                  setIsOpen(false);
                  setQuotationData({}); // Clear quotation data when closing
                }} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                  Close
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Sales fills everything here, and it writes into local quotationData */}
                <QuotationFormWithPreview formData={quotationData} setFormData={setQuotationData} />
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
                    value={quotationData?.sendTo ?? "Sales"}
                    onChange={(e) =>
                      setQuotationData((prev: any) => ({
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
                  <Button onClick={() => {
                    setIsOpen(false);
                    setQuotationData({}); // Clear quotation data when canceling
                  }} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selected) return;

                      try {
                        setLoading(true);
                        
        // Update order in backend (only basic fields, don't change status)
        const orderUpdateData = {
          client_name: quotationData?.clientName || selected.title.split(" - ")[1] || "",
          company_name: quotationData?.clientCompany || "",
          phone: quotationData?.clientPhone || "",
          email: quotationData?.email || "",
          address: quotationData?.address || "",
          specs: quotationData?.specifications || "",
          urgency: quotationData?.urgency || selected.urgency,
          pricing_status: quotationData?.status || "Not Priced",
          // Don't change status when saving quotations
        };
        console.log('=== SAVING ORDER DATA ===');
        console.log('Order update data:', orderUpdateData);
        await ordersApi.updateOrder(selected.id, orderUpdateData);

                        // Always update quotation data when saving
                        if (quotationData) {
                          try {
                            const quotationResponse = await ordersApi.updateQuotation(selected.id, {
                              labour_cost: quotationData.labourCost || 0,
                              finishing_cost: quotationData.finishingCost || 0,
                              paper_cost: quotationData.paperCost || 0,
                              machine_cost: quotationData.machineCost || 0,
                              design_cost: quotationData.designCost || 0,
                              delivery_cost: quotationData.deliveryCost || 0,
                              other_charges: quotationData.otherCharges || 0,
                              discount: quotationData.discount || 0,
                              advance_paid: quotationData.advancePaid || 0,
                              quotation_notes: quotationData.quotationNotes || "",
                              custom_field: quotationData.customField || "",
                              grand_total: quotationData.finalPrice || quotationData.grandTotal || 0,
                            });
                          } catch (quotationError) {
                            console.error('Failed to save quotation:', quotationError);
                            toast.error('Failed to save quotation data');
                            return; // Don't continue if quotation save fails
                          }
                        } else {
                          console.log('No quotationData to save');
                        }

                        // Refresh orders list
                        const apiOrders = await ordersApi.getOrders();
                        const convertedOrders = mapOrders(apiOrders);

                        setSavedOrders(convertedOrders);
                        setOrders(convertedOrders);
                        setIsOpen(false);
                        setQuotationData({}); // Clear quotation data after successful save
                        toast.success("Order and quotation updated successfully!");
                      } catch (err: any) {
                        toast.error(`Failed to update order: ${err.message}`);
                        console.error("Error updating order:", err);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="bg-[#891F1A] text-white hover:bg-[#6c1714]"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Custom Order Popup */}
      <Transition show={isCustomOpen} as={Fragment}>
        <Dialog 
          onClose={() => {
            if (!showSearchModal && !showConfigModal) {
              setIsCustomOpen(false);
            }
          }} 
          className="relative z-50"
          static={showSearchModal || showConfigModal}
        >
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel 
              className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b bg-white sticky top-0 z-10">
                <Dialog.Title className="text-lg font-semibold text-[#891F1A]">Add a Custom Order</Dialog.Title>
                <button onClick={() => setIsCustomOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <OrderIntakeForm
                  formData={customFormData}
                  setFormData={setCustomFormData}
                  requireProductsAndFiles
                  selectedProducts={selectedProducts}
                  onAddProduct={handleAddProductClick}
                  onRemoveProduct={handleRemoveProduct}
                  onEditProduct={handleEditProduct}
                />
              </div>

              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                <Button onClick={() => setIsCustomOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={() => createOrder(customFormData)} disabled={loading} className="bg-[#891F1A] text-white hover:bg-[#6c1714]">
                  {loading ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      <ProductSearchModal
        open={showSearchModal}
        onClose={handleCloseSearchModal}
        onPickBaseProduct={handlePickBaseProduct}
      />

      <ProductConfigModal
        open={showConfigModal}
        onClose={handleCloseConfigModal}
        baseProduct={pendingBaseProduct}
        onConfirm={handleConfirmProduct}
        initialQty={pendingInitialQty}
        initialAttributes={pendingInitialAttributes}
        editingProductId={editingProductId ?? undefined}
      />
    </div>
  );
}
















